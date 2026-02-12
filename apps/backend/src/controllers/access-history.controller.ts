import { Response } from 'express';
import { AccessHistoryService } from '../services/access-history.service';
import { AuthRequest } from '../middleware/auth-middleware';
import { prisma } from '../lib/prisma';

export class AccessHistoryController {
  private accessHistoryService: AccessHistoryService;

  constructor() {
    this.accessHistoryService = new AccessHistoryService();
  }

  // Helper method to extract string value from potentially array parameter
  private getStringValue = (param: any): string | undefined => {
    if (param === undefined || param === null) return undefined;
    if (typeof param === 'string') return param;
    if (Array.isArray(param)) {
      const first = param[0];
      return typeof first === 'string' ? first : undefined;
    }
    return undefined;
  };

  /**
   * Get access history logs with optional filters
   */
  getAccessHistory = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Get user's department
      const user = await prisma.user.findUnique({
        where: { user_id: req.user.id },
        select: { department_id: true },
      });

      if (!user || !user.department_id) {
        return res.status(400).json({
          success: false,
          error: 'User department not found',
        });
      }

      // Parse query parameters
      const {
        startDate,
        endDate,
        userId,
        documentId,
        limit,
        offset,
      } = req.query;

      const filters: any = {};

      if (startDate) filters.startDate = new Date(this.getStringValue(startDate) || '');
      if (endDate) filters.endDate = new Date(this.getStringValue(endDate) || '');
      if (userId) filters.userId = this.getStringValue(userId);
      if (documentId) filters.documentId = this.getStringValue(documentId);
      if (limit) filters.limit = parseInt(this.getStringValue(limit) || '0', 10);
      if (offset) filters.offset = parseInt(this.getStringValue(offset) || '0', 10);

      const result = await this.accessHistoryService.getAccessHistory(
        user.department_id,
        filters
      );

      res.json({
        success: true,
        data: result.accessLogs,
        pagination: {
          total: result.total,
          limit: filters.limit || 50,
          offset: filters.offset || 0,
        },
      });
    } catch (error: any) {
      console.error('Error in getAccessHistory:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch access history',
      });
    }
  };

  /**
   * Get access history statistics
   */
  getAccessHistoryStats = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Get user's department
      const user = await prisma.user.findUnique({
        where: { user_id: req.user.id },
        select: { department_id: true },
      });

      if (!user || !user.department_id) {
        return res.status(400).json({
          success: false,
          error: 'User department not found',
        });
      }

      const stats = await this.accessHistoryService.getAccessHistoryStats(
        user.department_id
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error in getAccessHistoryStats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch access history stats',
      });
    }
  };

  /**
   * Get access history for a specific document
   */
  getAccessHistoryByDocument = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const documentId = req.params.documentId as string;

      if (!documentId) {
        return res.status(400).json({
          success: false,
          error: 'Document ID is required',
        });
      }

      const accessLogs = await this.accessHistoryService.getAccessHistoryByDocument(
        documentId
      );

      res.json({
        success: true,
        data: accessLogs,
      });
    } catch (error: any) {
      console.error('Error in getAccessHistoryByDocument:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch document access history',
      });
    }
  };

  /**
   * Get access history for a specific user
   */
  getAccessHistoryByUser = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const userId = req.params.userId as string;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
      }

      // Parse query parameters
      const { startDate, endDate, limit, offset } = req.query;

      const filters: any = {};

      if (startDate) filters.startDate = new Date(this.getStringValue(startDate) || '');
      if (endDate) filters.endDate = new Date(this.getStringValue(endDate) || '');
      if (limit) filters.limit = parseInt(this.getStringValue(limit) || '0', 10);
      if (offset) filters.offset = parseInt(this.getStringValue(offset) || '0', 10);

      const result = await this.accessHistoryService.getAccessHistoryByUser(
        userId,
        filters
      );

      res.json({
        success: true,
        data: result.accessLogs,
        pagination: {
          total: result.total,
          limit: filters.limit || 50,
          offset: filters.offset || 0,
        },
      });
    } catch (error: any) {
      console.error('Error in getAccessHistoryByUser:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user access history',
      });
    }
  };
}
