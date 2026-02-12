import { prisma } from '../lib/prisma';
import { deleteFile } from '../middleware/upload.middleware';
import { getSocketInstance } from '../socket';

/**
 * Recycle Bin Cleanup Processor
 * Automatically permanently deletes documents that have been in the recycle bin for more than 5 days
 */
export class RecycleBinCleanupProcessor {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly RETENTION_DAYS = 5; // Documents older than 5 days will be permanently deleted
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour (in production)

  /**
   * Start the recycle bin cleanup processor
   */
  public start(): void {
    if (this.isRunning) {
      console.log('[RecycleBinCleanup] Processor is already running');
      return;
    }

    console.log('[RecycleBinCleanup] Starting recycle bin cleanup processor...');
    console.log(`[RecycleBinCleanup] Documents will be permanently deleted after ${this.RETENTION_DAYS} days in recycle bin`);
    this.isRunning = true;

    // Run immediately on startup
    this.processExpiredDocuments().catch(console.error);

    // Run periodically to check for expired documents
    this.intervalId = setInterval(() => {
      this.processExpiredDocuments().catch(console.error);
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop the recycle bin cleanup processor
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[RecycleBinCleanup] Processor stopped');
  }

  /**
   * Process and permanently delete expired documents from the recycle bin
   */
  public async processExpiredDocuments(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [RecycleBinCleanup] Checking for expired documents in recycle bin...`);

    try {
      // Calculate the cutoff date (5 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      console.log(`[${timestamp}] [RecycleBinCleanup] Cutoff date: ${cutoffDate.toISOString()}`);

      // Find all documents that have been in recycle bin for more than RETENTION_DAYS
      const expiredDocuments = await prisma.document.findMany({
        where: {
          status: 'deleted', // Only documents in recycle bin
          deleted_at: {
            not: null,
            lte: cutoffDate, // deleted_at is older than cutoff date
          },
        },
        include: {
          files: true,
          DocumentAdditionalDetails: true,
        },
      });

      if (expiredDocuments.length === 0) {
        console.log(`[${timestamp}] [RecycleBinCleanup] No expired documents found`);
        return;
      }

      console.log(`[${timestamp}] [RecycleBinCleanup] Found ${expiredDocuments.length} expired document(s) to permanently delete`);

      let successCount = 0;
      let failCount = 0;

      for (const document of expiredDocuments) {
        try {
          const daysInRecycleBin = Math.floor(
            (new Date().getTime() - new Date(document.deleted_at!).getTime()) / (1000 * 60 * 60 * 24)
          );

          console.log(`[${timestamp}] [RecycleBinCleanup] Processing document ${document.document_id} (${document.document_code})`);
          console.log(`[${timestamp}] [RecycleBinCleanup] - Deleted at: ${document.deleted_at}`);
          console.log(`[${timestamp}] [RecycleBinCleanup] - Days in recycle bin: ${daysInRecycleBin}`);

          // Delete associated files from filesystem
          if (document.files && document.files.length > 0) {
            for (const file of document.files) {
              if (file.storage_path) {
                try {
                  await deleteFile(file.storage_path);
                  console.log(`[${timestamp}] [RecycleBinCleanup] - Deleted file: ${file.storage_path}`);
                } catch (fileError) {
                  console.error(`[${timestamp}] [RecycleBinCleanup] - Error deleting file ${file.storage_path}:`, fileError);
                }
              }
            }
          }

          // Permanently delete the document and all related records using a transaction
          await prisma.$transaction(async (tx) => {
            // Delete signature placeholders
            await tx.signaturePlaceholder.deleteMany({
              where: { document_id: document.document_id },
            });

            // Delete text placeholders
            await tx.textPlaceholder.deleteMany({
              where: { document_id: document.document_id },
            });

            // Delete document trails
            await tx.documentTrail.deleteMany({
              where: { document_id: document.document_id },
            });

            // Delete document files
            await tx.documentFile.deleteMany({
              where: { document_id: document.document_id },
            });

            // Delete document additional details
            await tx.documentAdditionalDetails.deleteMany({
              where: { document_id: document.document_id },
            });

            // Finally, delete the document itself
            await tx.document.delete({
              where: { document_id: document.document_id },
            });
          });

          console.log(`[${timestamp}] [RecycleBinCleanup] ✓ Permanently deleted document ${document.document_code}`);
          successCount++;

          // Emit socket event to notify clients
          const io = getSocketInstance();
          if (io) {
            io.emit('documentPermanentlyDeleted', {
              documentId: document.document_id,
              documentCode: document.document_code,
              reason: 'auto_cleanup',
              deletedAt: new Date().toISOString(),
            });
          }
        } catch (docError) {
          console.error(`[${timestamp}] [RecycleBinCleanup] ✗ Error deleting document ${document.document_id}:`, docError);
          failCount++;
        }
      }

      console.log(`[${timestamp}] [RecycleBinCleanup] Cleanup complete: ${successCount} deleted, ${failCount} failed`);
    } catch (error) {
      console.error(`[${timestamp}] [RecycleBinCleanup] Error processing expired documents:`, error);
    }
  }

  /**
   * Get statistics about documents in the recycle bin
   */
  public async getRecycleBinStats(): Promise<{
    totalInRecycleBin: number;
    expiringToday: number;
    expiringInNext24Hours: number;
    oldestDocument: Date | null;
  }> {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowCutoff = new Date();
    tomorrowCutoff.setDate(tomorrowCutoff.getDate() - this.RETENTION_DAYS + 1);

    const [totalInRecycleBin, expiringToday, expiringInNext24Hours, oldestDocument] = await Promise.all([
      // Total documents in recycle bin
      prisma.document.count({
        where: {
          status: 'deleted',
          deleted_at: { not: null },
        },
      }),
      // Documents expiring today (already past cutoff)
      prisma.document.count({
        where: {
          status: 'deleted',
          deleted_at: {
            not: null,
            lte: cutoffDate,
          },
        },
      }),
      // Documents expiring in next 24 hours
      prisma.document.count({
        where: {
          status: 'deleted',
          deleted_at: {
            not: null,
            gt: cutoffDate,
            lte: tomorrowCutoff,
          },
        },
      }),
      // Oldest document in recycle bin
      prisma.document.findFirst({
        where: {
          status: 'deleted',
          deleted_at: { not: null },
        },
        orderBy: { deleted_at: 'asc' },
        select: { deleted_at: true },
      }),
    ]);

    return {
      totalInRecycleBin,
      expiringToday,
      expiringInNext24Hours,
      oldestDocument: oldestDocument?.deleted_at || null,
    };
  }

  /**
   * Get the retention period in days
   */
  public getRetentionDays(): number {
    return this.RETENTION_DAYS;
  }

  /**
   * Manually trigger cleanup (for testing or admin purposes)
   */
  public async triggerCleanup(): Promise<{ success: boolean; message: string }> {
    try {
      await this.processExpiredDocuments();
      return { success: true, message: 'Cleanup process completed' };
    } catch (error) {
      return { success: false, message: `Cleanup failed: ${error}` };
    }
  }
}

// Export singleton instance
export const recycleBinCleanupProcessor = new RecycleBinCleanupProcessor();
