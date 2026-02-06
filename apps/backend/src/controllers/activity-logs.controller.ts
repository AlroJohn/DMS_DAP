import { Response } from 'express';
import { ActivityLogsService } from '../services/activity-logs.service';
import { AuthRequest } from '../middleware/auth-middleware';
import { prisma } from '../lib/prisma';

export class ActivityLogsController {
  private activityLogsService: ActivityLogsService;

  constructor() {
    this.activityLogsService = new ActivityLogsService();
  }

  // Helper method to extract string value from potentially array parameter
  private getStringValue = (param: string | string[] | undefined): string | undefined => {
    if (Array.isArray(param)) {
      return param[0];
    }
    return param;
  };

  /**
   * Get activity logs with optional filters
   */
  getActivityLogs = async (req: AuthRequest, res: Response) => {
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
        actionType,
        status,
        limit,
        offset,
      } = req.query;

      const filters: any = {};

      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (userId) filters.userId = userId as string;
      if (actionType) filters.actionType = actionType as string;
      if (status) filters.status = status as string;
      if (limit) filters.limit = parseInt(limit as string, 10);
      if (offset) filters.offset = parseInt(offset as string, 10);

      const result = await this.activityLogsService.getActivityLogs(
        user.department_id,
        filters
      );

      res.json({
        success: true,
        data: result.activities,
        pagination: {
          total: result.total,
          limit: filters.limit || 50,
          offset: filters.offset || 0,
        },
      });
    } catch (error: any) {
      console.error('Error in getActivityLogs:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch activity logs',
      });
    }
  };

  /**
   * Get activity statistics
   */
  getActivityStats = async (req: AuthRequest, res: Response) => {
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

      const stats = await this.activityLogsService.getActivityStats(
        user.department_id
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error in getActivityStats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch activity stats',
      });
    }
  };

  /**
   * Get activity logs for a specific document
   */
  getActivityLogsByDocument = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const documentId = this.getStringValue(req.params.documentId);

      if (!documentId) {
        return res.status(400).json({
          success: false,
          error: 'Document ID is required',
        });
      }

      const activities = await this.activityLogsService.getActivityLogsByDocument(
        documentId
      );

      res.json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      console.error('Error in getActivityLogsByDocument:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch document activity logs',
      });
    }
  };
}
