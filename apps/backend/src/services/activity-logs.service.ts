import { prisma } from '../lib/prisma';

export interface ActivityLog {
  id: string;
  user: string;
  userAvatar?: string;
  action: string;
  document: string;
  documentCode: string;
  timestamp: string;
  type: string;
  status: string;
  fromDepartment?: string;
  toDepartment?: string;
  remarks?: string;
}

export interface ActivityStats {
  totalActions: number;
  today: number;
  thisWeek: number;
  activeUsers: number;
}

export class ActivityLogsService {
  /**
   * Get activity logs with optional filtering
   */
  async getActivityLogs(
    departmentId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      actionType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ activities: ActivityLog[]; total: number }> {
    try {
      const {
        startDate,
        endDate,
        userId,
        actionType,
        status,
        limit = 50,
        offset = 0,
      } = filters;

      // Build the where clause
      const whereClause: any = {
        OR: [
          { from_department: departmentId },
          { to_department: departmentId },
        ],
      };

      if (startDate || endDate) {
        whereClause.action_date = {};
        if (startDate) whereClause.action_date.gte = startDate;
        if (endDate) whereClause.action_date.lte = endDate;
      }

      if (userId) {
        whereClause.user_id = userId;
      }

      if (status) {
        whereClause.status = status;
      }

      // Get total count
      const total = await prisma.documentTrail.count({ where: whereClause });

      // Get paginated results
      const trails = await prisma.documentTrail.findMany({
        where: whereClause,
        include: {
          document: {
            select: {
              title: true,
              document_code: true,
              document_type: true,
            },
          },
          user: {
            select: {
              first_name: true,
              last_name: true,
              avatar: true,
            },
          },
          fromDept: {
            select: {
              name: true,
              code: true,
            },
          },
          toDept: {
            select: {
              name: true,
              code: true,
            },
          },
          documentAction: {
            select: {
              action_name: true,
            },
          },
        },
        orderBy: {
          action_date: 'desc',
        },
        take: limit,
        skip: offset,
      });

      // Transform the data
      const activities: ActivityLog[] = trails.map((trail) => {
        const userName = trail.user
          ? `${trail.user.first_name} ${trail.user.last_name}`
          : 'Unknown User';

        // Determine action type based on status
        let type = 'update';
        if (trail.status === 'dispatch') type = 'create';
        else if (trail.status === 'deleted') type = 'delete';
        else if (trail.status === 'intransit') type = 'transfer';
        else if (trail.status === 'received') type = 'receive';
        else if (trail.status === 'signed') type = 'sign';
        else if (trail.status === 'archive') type = 'archive';
        else if (trail.status === 'completed') type = 'complete';

        // Build action description
        let action = trail.documentAction?.action_name || 'Updated';
        if (trail.status === 'dispatch') action = 'Created document';
        else if (trail.status === 'intransit') action = 'Released document';
        else if (trail.status === 'received') action = 'Received document';
        else if (trail.status === 'deleted') action = 'Deleted document';
        else if (trail.status === 'signed') action = 'Signed document';
        else if (trail.status === 'archive') action = 'Archived document';
        else if (trail.status === 'completed') action = 'Completed document';

        return {
          id: trail.trail_id,
          user: userName,
          userAvatar: trail.user?.avatar || undefined,
          action,
          document: trail.document?.title || 'Unknown Document',
          documentCode: trail.document?.document_code || 'N/A',
          timestamp: trail.action_date.toISOString(),
          type,
          status: trail.status,
          fromDepartment: trail.fromDept?.name,
          toDepartment: trail.toDept?.name,
          remarks: trail.remarks || undefined,
        };
      });

      return { activities, total };
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(departmentId: string): Promise<ActivityStats> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const whereClause = {
        OR: [
          { from_department: departmentId },
          { to_department: departmentId },
        ],
      };

      // Get total actions
      const totalActions = await prisma.documentTrail.count({
        where: whereClause,
      });

      // Get today's actions
      const today = await prisma.documentTrail.count({
        where: {
          ...whereClause,
          action_date: {
            gte: todayStart,
          },
        },
      });

      // Get this week's actions
      const thisWeek = await prisma.documentTrail.count({
        where: {
          ...whereClause,
          action_date: {
            gte: weekStart,
          },
        },
      });

      // Get active users (users who performed actions this week)
      const activeUsersData = await prisma.documentTrail.groupBy({
        by: ['user_id'],
        where: {
          ...whereClause,
          action_date: {
            gte: weekStart,
          },
          user_id: {
            not: null,
          },
        },
      });

      const activeUsers = activeUsersData.length;

      return {
        totalActions,
        today,
        thisWeek,
        activeUsers,
      };
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }

  /**
   * Get activity logs by document
   */
  async getActivityLogsByDocument(documentId: string): Promise<ActivityLog[]> {
    try {
      const trails = await prisma.documentTrail.findMany({
        where: {
          document_id: documentId,
        },
        include: {
          document: {
            select: {
              title: true,
              document_code: true,
              document_type: true,
            },
          },
          user: {
            select: {
              first_name: true,
              last_name: true,
              avatar: true,
            },
          },
          fromDept: {
            select: {
              name: true,
              code: true,
            },
          },
          toDept: {
            select: {
              name: true,
              code: true,
            },
          },
          documentAction: {
            select: {
              action_name: true,
            },
          },
        },
        orderBy: {
          action_date: 'desc',
        },
      });

      return trails.map((trail) => {
        const userName = trail.user
          ? `${trail.user.first_name} ${trail.user.last_name}`
          : 'Unknown User';

        let type = 'update';
        if (trail.status === 'dispatch') type = 'create';
        else if (trail.status === 'deleted') type = 'delete';
        else if (trail.status === 'intransit') type = 'transfer';
        else if (trail.status === 'received') type = 'receive';
        else if (trail.status === 'signed') type = 'sign';
        else if (trail.status === 'archive') type = 'archive';

        let action = trail.documentAction?.action_name || 'Updated';
        if (trail.status === 'dispatch') action = 'Created document';
        else if (trail.status === 'intransit') action = 'Released document';
        else if (trail.status === 'received') action = 'Received document';
        else if (trail.status === 'deleted') action = 'Deleted document';
        else if (trail.status === 'signed') action = 'Signed document';
        else if (trail.status === 'archive') action = 'Archived document';

        return {
          id: trail.trail_id,
          user: userName,
          userAvatar: trail.user?.avatar || undefined,
          action,
          document: trail.document?.title || 'Unknown Document',
          documentCode: trail.document?.document_code || 'N/A',
          timestamp: trail.action_date.toISOString(),
          type,
          status: trail.status,
          fromDepartment: trail.fromDept?.name,
          toDepartment: trail.toDept?.name,
          remarks: trail.remarks || undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching activity logs by document:', error);
      throw error;
    }
  }
}
