import { prisma } from '../lib/prisma';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { DocumentService } from './document.service';
import { DocumentTrailsService } from './document-trails.service';
import { getSocketInstance } from '../socket';

export class ArchiveService {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  /**
   * Archive a document by setting its deleted_at timestamp
   */
  async archiveDocument(documentId: string, archivedBy: string) {
    try {
      // Check if the document exists and is not already archived
      // Allow archiving documents with status 'completed' or any other status except 'archive'
      const document = await prisma.document.findUnique({
        where: {
          document_id: documentId
        }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Don't allow re-archiving if already archived
      if (document.status === 'archive') {
        throw new Error('Document is already archived');
      }

      // Store the original status so it can be restored later
      const originalStatus = document.status;
      const originalDescription = document.description || '';
      const statusMarker = `[ORIGINAL_STATUS:${originalStatus}]`;
      const newDescription = originalDescription.includes('[ORIGINAL_STATUS:') 
        ? originalDescription 
        : `${originalDescription}${originalDescription ? ' ' : ''}${statusMarker}`;

      // Update the document to mark it as archived
      const archivedDoc = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          deleted_at: new Date(), // Mark when it was archived
          restored_at: null,
          status: 'archive', // Using 'archive' status to represent archived (distinct from other statuses)
          description: newDescription // Store the original status in description
        }
      });

      // Get the user who is archiving the document to link with the trail
      const user = await prisma.user.findUnique({
        where: { user_id: archivedBy }
      });

      // Create a document trail entry for document archiving
      const documentTrailsService = new DocumentTrailsService();
      try {
        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: user?.department_id || undefined, // Get department from the user performing the action
          to_department: user?.department_id || undefined, // Archiving happens in same department
          user_id: archivedBy, // Use the userId who performed the archiving
          status: 'archive',
          remarks: `Document archived: ${document.title}`
        });
      } catch (error) {
        console.error('Error creating document trail for document archiving:', error);
      }

      // Create a document action log to track the archive action
      await prisma.documentAction.create({
        data: {
          action_name: 'archived',
          description: `Document ${document.title} was archived`,
          action_date: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      const io = getSocketInstance();
      io.emit('documentArchived', {
        documentId,
        archived_at: archivedDoc.deleted_at,
      });
      io.emit('documentUpdated', {
        documentId,
        status: archivedDoc.status,
      });

      return archivedDoc;
    } catch (error) {
      console.error('Error archiving document:', error);
      throw error;
    }
  }

  /**
   * Restore an archived document by clearing its deleted_at timestamp
   */
  async restoreDocument(documentId: string, restoredByUserId: string) {
    try {
      // Check if the document exists and is archived
      const document = await prisma.document.findUnique({
        where: {
          document_id: documentId,
          deleted_at: { not: null } // Only restore documents that are archived
        }
      });

      if (!document) {
        throw new Error('Document not found or not archived');
      }

      // Get the user's account information to get the account_id
      // First, we need to find the user to get their account_id
      const user = await prisma.user.findUnique({
        where: { user_id: restoredByUserId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Extract the original status from the description if it exists
      let restoredStatus: any = 'pending'; // Default to pending if no original status found
      let cleanedDescription = document.description || '';
      
      const statusMatch = document.description?.match(/\[ORIGINAL_STATUS:(\w+)\]/);
      if (statusMatch && statusMatch[1]) {
        restoredStatus = statusMatch[1] as any; // Cast to any to allow dynamic status values
        // Remove the status marker from description
        cleanedDescription = document.description?.replace(/\s*\[ORIGINAL_STATUS:\w+\]/, '') || '';
      }

      // Update the document to mark it as restored
      const restoredDoc = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          deleted_at: null,
          restored_at: new Date(),
          restored_by: user.account_id, // Use account_id instead of user_id
          status: restoredStatus, // Restore to original status instead of hardcoding to pending
          description: cleanedDescription // Clean up the description
        }
      });

      // Create a document trail entry for document restoration
      // Use the previously fetched 'user' to get department for the document trail
      const documentTrailsService = new DocumentTrailsService();
      try {
        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: user?.department_id || undefined, // Use the department of the user performing the restoration
          to_department: user?.department_id || undefined, // Restoration happens in same department as the user
          user_id: restoredByUserId, // Use the userId who performed the restoration
          status: restoredStatus, // Use the restored status instead of hardcoded pending
          remarks: `Document restored from archive: ${document.title}`
        });
      } catch (error) {
        console.error('Error creating document trail for document restoration:', error);
      }

      // Create a document action log to track the restore action
      await prisma.documentAction.create({
        data: {
          action_name: 'restored',
          description: `Document ${document.title} was restored from archive`,
          action_date: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      const io = getSocketInstance();
      io.emit('documentRestored', {
        documentId,
        restored_at: restoredDoc.restored_at,
      });
      io.emit('documentUpdated', {
        documentId,
        status: restoredDoc.status,
      });

      return restoredDoc;
    } catch (error) {
      console.error('Error restoring document:', error);
      throw error;
    }
  }

  /**
   * Get all archived documents
   */
  async getArchivedDocuments(userId?: string) {
    try {
      // Verify prisma is available
      if (!prisma) {
        console.error('❌ Prisma client is undefined in getArchivedDocuments');
        throw new Error('Database connection not available');
      }

      console.log('📍 [getArchivedDocuments] Starting with userId:', userId);

      // Build where clause to include:
      // 1. Documents with 'archive' status (explicitly archived)
      // 2. Documents with 'completed' status that were owned/created by the user
      const whereClause: any = {
        OR: [
          { status: 'archive' }, // Explicitly archived documents
        ]
      };

      // If userId is provided, we need to determine:
      // - Show 'archive' status documents that the user was involved in
      // - Show 'completed' status documents that the user OWNS (created/uploaded)
      if (userId) {
        // Get documents where user was involved in trails (for archive status)
        console.log('📍 [getArchivedDocuments] Fetching user trails...');
        const userTrails = await prisma.documentTrail.findMany({
          where: { user_id: userId },
          select: { document_id: true }
        });
        const userDocumentIds = userTrails.map(trail => trail.document_id);

        // Get the user's account_id first
        const userAccount = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { account_id: true }
        });

        let ownedDocumentIds: string[] = [];
        
        if (userAccount?.account_id) {
          // Get documents where user uploaded files (documents they own)
          const userUploadedFiles = await prisma.documentFile.findMany({
            where: {
              uploaded_by: userAccount.account_id
            },
            select: { document_id: true }
          });
          ownedDocumentIds = userUploadedFiles
            .map(file => file.document_id)
            .filter((id): id is string => id !== null);
        }

        // For completed documents, only show ones the user owns
        if (ownedDocumentIds.length > 0) {
          whereClause.OR.push({
            AND: [
              { status: 'completed' },
              { document_id: { in: ownedDocumentIds } }
            ]
          });
        }
        
        // Also include archive status docs where user was involved
        if (userDocumentIds.length > 0) {
          whereClause.OR.push({
            AND: [
              { status: 'archive' },
              { document_id: { in: userDocumentIds } }
            ]
          });
        }
      } else {
        // If no userId, include all completed documents
        whereClause.OR.push({ status: 'completed' });
      }

      // Get the archived documents
      const archivedDocs = await prisma.document.findMany({
        where: whereClause,
        include: {
          DocumentAdditionalDetails: true,
          files: {
            include: {
              DocumentMetadata: true,
              uploaded_by_account: {
                include: {
                  user: true // Include user info for contact person
                }
              }
            }
          },
          // Include document type info to get the name instead of just ID
        },
        orderBy: [
          { deleted_at: 'desc' }, // Order by archived date, newest first
          { created_at: 'desc' }  // Then by creation date
        ]
      });

      // Get document types to map IDs to names
      // Filter out invalid UUIDs before querying
      const validDocumentTypeIds = archivedDocs
        .map(doc => doc.document_type)
        .filter(id => {
          // Simple UUID validation regex: 8-4-4-4-12 hex characters
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return id && typeof id === 'string' && uuidRegex.test(id);
        });

      const documentTypes = validDocumentTypeIds.length > 0
        ? await prisma.documentType.findMany({
          where: {
            type_id: { in: validDocumentTypeIds }
          }
        })
        : [];
      const typeMap = new Map(documentTypes.map(dt => [dt.type_id, dt.name]));

      // Process each document to add QR codes, barcodes, and proper names
      const processedDocs = await Promise.all(archivedDocs.map(async (doc) => {
        // Generate QR code - using document_code or fallback to document_id
        let qrCode = '';
        try {
          qrCode = await QRCode.toDataURL(doc.document_code || doc.document_id, {
            width: 100,
            margin: 1
          });
        } catch (err) {
          console.error('QR Code generation error:', err);
          // Fallback to empty QR code
        }

        // Generate barcode - using document_code or fallback to document_id
        let barcode = '';
        try {
          const canvas = await bwipjs.toBuffer({
            bcid: 'code128',
            text: doc.document_code || doc.document_id,
            scale: 2,
            height: 10,
            includetext: false
          });
          barcode = `data:image/png;base64,${canvas.toString('base64')}`; // Fixed: 'base8' -> 'base64'
        } catch (err) {
          console.error('Barcode generation error:', err);
          // Fallback to empty barcode
        }

        // Get the first file to determine contact person
        let contactPerson = 'N/A';
        let contactOrganization = 'N/A';

        if (doc.files && doc.files.length > 0) {
          const firstFile = doc.files[0]; // Take the first file
          if (firstFile.uploaded_by_account && firstFile.uploaded_by_account.user) {
            contactPerson = `${firstFile.uploaded_by_account.user.first_name} ${firstFile.uploaded_by_account.user.last_name}`;

            // If we have department info, we can get the org name
            if (firstFile.uploaded_by_account.user.department_id) {
              try {
                const department = await prisma.department.findUnique({
                  where: { department_id: firstFile.uploaded_by_account.user.department_id }
                });
                if (department) {
                  contactOrganization = department.name;
                }
              } catch (e) {
                console.error('Error fetching department:', e);
              }
            }
          }
        }

        // Map document type ID to name
        const typeName = typeMap.get(doc.document_type) || doc.document_type;

        // Get classification and other document details with fallbacks
        const classification = doc.classification || 'Simple';
        const status = doc.status || 'archive'; // Explicitly set to archive status

        // Determine activity and activity time
        const activity = 'Archived';
        const activityTime = doc.deleted_at ? new Date(doc.deleted_at).toISOString() : new Date().toISOString();

        // Return the document with all the enriched fields that the frontend expects
        return {
          id: doc.document_id,
          document_id: doc.document_id,
          title: doc.title || 'Untitled Document',
          description: doc.description || '',
          document_code: doc.document_code,
          document_type: doc.document_type,
          type: typeName, // Changed to use typeName from the map
          process_type_id: doc.process_type_id,
          classification: classification,
          origin: doc.origin || 'external',
          status: status,
          created_at: doc.created_at.toISOString(),
          updated_at: doc.updated_at.toISOString(),
          deleted_at: doc.deleted_at ? new Date(doc.deleted_at).toISOString() : null,
          restored_at: doc.restored_at ? new Date(doc.restored_at).toISOString() : null,
          restored_by: doc.restored_by || null,

          // Fields expected by the DataTable
          qrCode,
          barcode,
          document: doc.title || 'Untitled Document',
          documentId: doc.document_code || doc.document_id,
          contactPerson,
          contactOrganization,
          currentLocation: 'Archive',
          activity,
          activityTime,
          deletedBy: 'System', // Placeholder - could be populated with actual deleted by info
          deletedAt: doc.deleted_at ? doc.deleted_at.toISOString() : new Date().toISOString(),
          restoredBy: doc.restored_by ? 'System' : undefined, // Placeholder
          restoredAt: doc.restored_at ? doc.restored_at.toISOString() : undefined,

          // Security and blockchain fields (with defaults)
          blockchainStatus: null,
          blockchainProjectUuid: undefined,
          blockchainTxHash: undefined,
          signedAt: undefined,
          lockStatus: undefined,
          lockedBy: undefined,
          lockedAt: undefined,
          ocrStatus: undefined,
          ocrProgress: undefined,
          integrityStatus: undefined,
          checksum: undefined,
          encryptionStatus: undefined,
        };
      }));

      return processedDocs;
    } catch (error) {
      console.error('❌ [getArchivedDocuments] Error:', error);
      console.error('❌ [getArchivedDocuments] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ [getArchivedDocuments] Prisma available:', !!prisma);
      throw error;
    }
  }

  /**
   * Get a specific archived document
   */
  async getArchivedDocument(documentId: string, userId?: string) {
    try {
      // Build where clause to include both archived and completed documents
      const whereClause: any = {
        document_id: documentId,
        OR: [
          { status: 'archive' },
          { status: 'completed' }
        ]
      };

      // If userId is provided, check if user is involved in the document
      if (userId) {
        const userTrail = await prisma.documentTrail.findFirst({
          where: {
            document_id: documentId,
            user_id: userId
          }
        });

        if (!userTrail) {
          throw new Error('Access denied: User not involved in this document');
        }
      }

      const document = await prisma.document.findFirst({
        where: whereClause,
        include: {
          DocumentAdditionalDetails: true,
          files: {
            include: {
              DocumentMetadata: true,
              uploaded_by_account: {
                include: {
                  user: true // Include user info for contact person
                }
              }
            }
          }
        }
      });

      if (!document) {
        return null;
      }

      // Generate QR code
      let qrCode = '';
      try {
        qrCode = await QRCode.toDataURL(document.document_code || document.document_id, {
          width: 100,
          margin: 1
        });
      } catch (err) {
        console.error('QR Code generation error:', err);
      }

      // Generate barcode
      let barcode = '';
      try {
        const canvas = await bwipjs.toBuffer({
          bcid: 'code128',
          text: document.document_code || document.document_id,
          scale: 2,
          height: 10,
          includetext: false
        });
        barcode = `data:image/png;base64,${canvas.toString('base64')}`;
      } catch (err) {
        console.error('Barcode generation error:', err);
      }

      // Get contact info
      let contactPerson = 'N/A';
      let contactOrganization = 'N/A';

      if (document.files && document.files.length > 0) {
        const firstFile = document.files[0];
        if (firstFile.uploaded_by_account && firstFile.uploaded_by_account.user) {
          contactPerson = `${firstFile.uploaded_by_account.user.first_name} ${firstFile.uploaded_by_account.user.last_name}`;

          if (firstFile.uploaded_by_account.user.department_id) {
            try {
              const department = await prisma.department.findUnique({
                where: { department_id: firstFile.uploaded_by_account.user.department_id }
              });
              if (department) {
                contactOrganization = department.name;
              }
            } catch (e) {
              console.error('Error fetching department:', e);
            }
          }
        }
      }

      // Get the document type name
      // Validate UUID before querying
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let typeName = document.document_type; // Default to the raw value

      if (document.document_type && typeof document.document_type === 'string' && uuidRegex.test(document.document_type)) {
        const documentType = await prisma.documentType.findUnique({
          where: { type_id: document.document_type }
        });
        typeName = documentType?.name || document.document_type;
      } else {
        // If it's not a valid UUID, use the raw value as the type name
        typeName = document.document_type;
      }

      // Get classification and other document details with fallbacks
      const classification = document.classification || 'Simple';
      const status = document.status || 'archive'; // Explicitly set to archive status

      // Determine activity and activity time
      const activity = 'Archived';
      const activityTime = document.deleted_at ? new Date(document.deleted_at).toISOString() : new Date().toISOString();

      return {
        id: document.document_id,
        document_id: document.document_id,
        title: document.title || 'Untitled Document',
        description: document.description || '',
        document_code: document.document_code,
        document_type: document.document_type,
        type: typeName, // Changed to use typeName
        process_type_id: document.process_type_id,
        classification: classification,
        origin: document.origin || 'external',
        status: status,
        created_at: document.created_at.toISOString(),
        updated_at: document.updated_at.toISOString(),
        deleted_at: document.deleted_at ? new Date(document.deleted_at).toISOString() : null,
        restored_at: document.restored_at ? new Date(document.restored_at).toISOString() : null,
        restored_by: document.restored_by || null,

        // Fields expected by the DataTable
        qrCode,
        barcode,
        document: document.title || 'Untitled Document',
        documentId: document.document_code || document.document_id,
        contactPerson,
        contactOrganization,
        currentLocation: 'Archive',
        activity,
        activityTime,
        deletedBy: 'System', // Placeholder - could be populated with actual deleted by info
        deletedAt: document.deleted_at ? document.deleted_at.toISOString() : new Date().toISOString(),
        restoredBy: document.restored_by ? 'System' : undefined, // Placeholder
        restoredAt: document.restored_at ? document.restored_at.toISOString() : undefined,

        // Security and blockchain fields (with defaults)
        blockchainStatus: null,
        blockchainProjectUuid: undefined,
        blockchainTxHash: undefined,
        signedAt: undefined,
        lockStatus: undefined,
        lockedBy: undefined,
        lockedAt: undefined,
        ocrStatus: undefined,
        ocrProgress: undefined,
        integrityStatus: undefined,
        checksum: undefined,
        encryptionStatus: undefined,
      };
    } catch (error) {
      console.error('Error fetching archived document:', error);
      throw error;
    }
  }
}
