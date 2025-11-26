import { Request, Response } from 'express';
import counterService from '../services/counter.service';
import { sendSuccess, sendError } from '../utils/response';

class CounterController {
  async getDepartmentCount(req: Request, res: Response) {
    try {
      const count = await counterService.getDepartmentCount();
      sendSuccess(res, { count });
    } catch (error: any) {
      sendError(res, error.message);
    }
  }

  async getDocumentTypeCount(req: Request, res: Response) {
    try {
      const count = await counterService.getDocumentTypeCount();
      sendSuccess(res, { count });
    } catch (error: any) {
      sendError(res, error.message);
    }
  }

  async getDocumentActionCount(req: Request, res: Response) {
    try {
      const count = await counterService.getDocumentActionCount();
      sendSuccess(res, { count });
    } catch (error: any) {
      sendError(res, error.message);
    }
  }

  async getUserCount(req: Request, res: Response) {
    try {
      const count = await counterService.getUserCount();
      sendSuccess(res, { count });
    } catch (error: any) {
      sendError(res, error.message);
    }
  }
}

export default new CounterController();
