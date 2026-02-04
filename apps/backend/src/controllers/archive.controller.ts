import { Request, Response } from 'express';
import { ArchiveService } from '../services/archive.service';
import { AuthRequest } from '../middleware/auth-middleware';

export class ArchiveController {
  private archiveService: ArchiveService;

  constructor() {
    this.archiveService = new ArchiveService();
  }

  /**
   * Archive a document
   */
  archiveDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest; // Cast to AuthRequest to access user info
      const { documentId } = req.params;
      const userId = authReq.user?.id; // Use authReq.user.id

      console.log('📍 [ArchiveController.archiveDocument] Request params:', req.params);
      console.log('📍 [ArchiveController.archiveDocument] Document ID:', documentId);
      console.log('📍 [ArchiveController.archiveDocument] User ID:', userId);

      if (!userId) {
        console.error('❌ [ArchiveController.archiveDocument] User not authenticated');
        res.status(401).json({ 
          success: false,
          error: 'User not authenticated' 
        });
        return;
      }

      if (!documentId) {
        console.error('❌ [ArchiveController.archiveDocument] Document ID is required');
        res.status(400).json({ 
          success: false,
          error: 'Document ID is required' 
        });
        return;
      }

      const archivedDoc = await this.archiveService.archiveDocument(documentId, userId);

      res.status(200).json({
        success: true,
        message: 'Document archived successfully',
        data: archivedDoc
      });
    } catch (error) {
      console.error('❌ [ArchiveController.archiveDocument] Error:', error);
      console.error('❌ [ArchiveController.archiveDocument] Error message:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({
        success: false,
        message: 'Failed to archive document',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Restore an archived document
   */
  restoreDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest; // Cast to AuthRequest to access user info
      const { documentId } = req.params;
      const userId = authReq.user?.id; // Use authReq.user.id

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!documentId) {
        res.status(400).json({ error: 'Document ID is required' });
        return;
      }

      const restoredDoc = await this.archiveService.restoreDocument(documentId, userId);

      res.status(200).json({
        success: true,
        message: 'Document restored successfully',
        data: restoredDoc
      });
    } catch (error) {
      console.error('Error restoring document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore document',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get all archived documents
   */
  getArchivedDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id; // Get the authenticated user's ID

      console.log('📍 [ArchiveController] Fetching archived documents for user:', userId);
      console.log('📍 [ArchiveController] archiveService instance:', !!this.archiveService);
      
      const archivedDocs = await this.archiveService.getArchivedDocuments(userId);

      res.status(200).json({
        success: true,
        count: archivedDocs.length,
        data: archivedDocs
      });
    } catch (error) {
      console.error('❌ [ArchiveController] Error fetching archived documents:', error);
      console.error('❌ [ArchiveController] Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ [ArchiveController] Error stack:', error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({
        success: false,
        message: 'Failed to fetch archived documents',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get a specific archived document
   */
  getArchivedDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { documentId } = req.params;
      const userId = authReq.user?.id; // Get the authenticated user's ID

      if (!documentId) {
        res.status(400).json({ error: 'Document ID is required' });
        return;
      }

      const archivedDoc = await this.archiveService.getArchivedDocument(documentId, userId);

      if (!archivedDoc) {
        res.status(404).json({
          success: false,
          message: 'Archived document not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: archivedDoc
      });
    } catch (error) {
      console.error('Error fetching archived document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch archived document',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}