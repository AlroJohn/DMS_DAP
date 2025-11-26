import { Request, Response } from 'express';
import { DocumentCheckoutService } from '../services/document-checkout.service';
import { AuthRequest } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError } from '../utils/response';

export class DocumentCheckoutController {
  private checkoutService: DocumentCheckoutService;

  constructor() {
    this.checkoutService = new DocumentCheckoutService();
  }

  /**
   * POST /api/files/:fileId/checkout
   */
  checkoutFile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { fileId } = req.params;

    const result = await this.checkoutService.checkoutFile(fileId, authReq.user.id);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to check out file', result.statusCode || 400);
    }

    return sendSuccess(res, result.data);
  });

  /**
   * POST /api/files/:fileId/checkin
   */
  checkinFile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { fileId } = req.params;

    const result = await this.checkoutService.checkinFile(fileId, authReq.user.id);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to check in file', result.statusCode || 400);
    }

    return sendSuccess(res, result.data);
  });

  /**
   * POST /api/files/:fileId/override-checkout
   */
  overrideFileCheckout = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { fileId } = req.params;

    const result = await this.checkoutService.overrideFileCheckout(fileId, authReq.user.id);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to override checkout', result.statusCode || 400);
    }

    return sendSuccess(res, result.data);
  });

  /**
   * GET /api/files/:fileId/status
   */
  getFileCheckoutStatus = asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.params;
    const result = await this.checkoutService.getCheckoutStatus(fileId);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to get checkout status', result.statusCode || 400);
    }

    return sendSuccess(res, result.data);
  });
}
