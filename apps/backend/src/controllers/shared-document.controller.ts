import { Request, Response } from 'express';
import { SharedDocumentService } from '../services/shared-document.service';
import { AuthRequest } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError, getPaginationParams, validateRequiredFields } from '../utils/response';

export class SharedDocumentController {
  private sharedDocumentService: SharedDocumentService;

  constructor() {
    this.sharedDocumentService = new SharedDocumentService();
  }

  private getStringValue = (param: string | string[] | undefined): string | undefined => {
    if (Array.isArray(param)) {
      return param[0];
    }
    return param;
  };

  async getSharedDocuments(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id as string;
      const { page, limit } = getPaginationParams(req);

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      const result = await this.sharedDocumentService.getSharedDocuments(userId, page, limit);

      // Return in the format expected by the frontend
      return sendSuccess(res, result.data, 200, {
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error in getSharedDocuments:', error);
      res.status(500).json({ error: 'Failed to fetch shared documents' });
    }
  }

  async shareDocument(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id as string;
      const id = this.getStringValue(req.params.id);
      const { userIds } = req.body;

      // Validate required fields
      const missingFields = validateRequiredFields(req.body, ['userIds']);
      if (missingFields.length > 0) {
        return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
      }

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        console.log('📍 [ShareDocumentController.shareDocument] Invalid document ID format:', id);
        return sendError(res, 'Invalid document ID format', 400);
      }

      // Validate user IDs format
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return sendError(res, 'User IDs must be a non-empty array', 400);
      }

      for (const userId of userIds) {
        if (!uuidRegex.test(userId)) {
          return sendError(res, `Invalid user ID format: ${userId}`, 400);
        }
      }

      const result = await this.sharedDocumentService.shareDocument(id, userId, userIds);

      if (result.success) {
        return sendSuccess(res, result, 200);
      } else {
        return sendError(res, result.error || 'Failed to share document', 500);
      }
    } catch (error) {
      console.error('Error in shareDocument:', error);
      res.status(500).json({ error: 'Failed to share document' });
    }
  }
}
