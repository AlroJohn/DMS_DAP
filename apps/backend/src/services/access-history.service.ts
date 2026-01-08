import { prisma } from '../lib/prisma';

export interface AccessHistoryLog {
  id: string;
  user: string;
  userAvatar?: string;
  document: string;
  documentCode: string;
  action: string;
  timestamp: string;
  department: string;
  ipAddress?: string;
  source: 'trail' | 'checkout' | 'session'; // Track the source of the log
}

export interface AccessHistoryStats {
  totalAccesses: number;
  uniqueUsers: number;
  avgAccessPerDay: number;
  byActionType: {
    views: number;
    downloads: number;
    checkouts: number;
    signs: number;
  };
}

export class AccessHistoryService {
  /**
   * Get comprehensive access history logs from multiple sources
   */
  async getAccessHistory(
    departmentId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      documentId?: string;
      limit?: number;
      offset?: number;
      includeCheckouts?: boolean;
    } = {}
  ): Promise<{ accessLogs: AccessHistoryLog[]; total: number }> {
    try {
      const {
        startDate,
        endDate,
        userId,
        documentId,
        limit = 50,
        offset = 0,
        includeCheckouts = true,
      } = filters;

      // Build the where clause for access-related activities
      // We're looking for trails that indicate document access
      const whereClause: any = {
        OR: [
          { from_department: departmentId },
          { to_department: departmentId },
        ],
        // Filter for access-related statuses
        status: {
          in: ['received', 'intransit', 'completed', 'signed'],
        },
      };

      if (startDate || endDate) {
        whereClause.action_date = {};
        if (startDate) whereClause.action_date.gte = startDate;
        if (endDate) whereClause.action_date.lte = endDate;
      }

      if (userId) {
        whereClause.user_id = userId;
      }

      if (documentId) {
        whereClause.document_id = documentId;
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
              account: {
                select: {
                  email: true,
                },
              },
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
        },
        orderBy: {
          action_date: 'desc',
        },
        take: limit,
        skip: offset,
      });

      // Transform the data
      const accessLogs: AccessHistoryLog[] = trails.map((trail) => {
        const userName = trail.user
          ? `${trail.user.first_name} ${trail.user.last_name}`
          : 'Unknown User';

        // Determine action based on status
        let action = 'Accessed';
        if (trail.status === 'received') action = 'Viewed';
        else if (trail.status === 'intransit') action = 'Accessed';
        else if (trail.status === 'completed') action = 'Completed';
        else if (trail.status === 'signed') action = 'Signed';

        const department = trail.toDept?.name || trail.fromDept?.name || 'Unknown';

        return {
          id: trail.trail_id,
          user: userName,
          userAvatar: trail.user?.avatar || undefined,
          document: trail.document?.title || 'Unknown Document',
          documentCode: trail.document?.document_code || 'N/A',
          action,
          timestamp: trail.action_date.toISOString(),
          department,
          source: 'trail' as const,
        };
      });

      return { accessLogs, total };
    } catch (error) {
      console.error('Error fetching access history:', error);
      throw error;
    }
  }

  /**
   * Get access history statistics
   */
  async getAccessHistoryStats(departmentId: string): Promise<AccessHistoryStats> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const whereClause = {
        OR: [
          { from_department: departmentId },
          { to_department: departmentId },
        ],
        status: {
          in: ['received', 'intransit', 'completed', 'signed'],
        },
      };

      // Get total accesses
      const totalAccesses = await prisma.documentTrail.count({
        where: whereClause,
      });

      // Get unique users who accessed documents
      const uniqueUsersData = await prisma.documentTrail.groupBy({
        by: ['user_id'],
        where: {
          ...whereClause,
          user_id: {
            not: null,
          },
        },
      });

      const uniqueUsers = uniqueUsersData.length;

      // Get accesses in the last 30 days for average calculation
      const recentAccesses = await prisma.documentTrail.count({
        where: {
          ...whereClause,
          action_date: {
            gte: thirtyDaysAgo,
          },
        },
      });

      const avgAccessPerDay = Math.round(recentAccesses / 30);

      // Get counts by action type
      const viewsCount = await prisma.documentTrail.count({
        where: {
          ...whereClause,
          status: 'received',
        },
      });

      const signsCount = await prisma.documentTrail.count({
        where: {
          ...whereClause,
          status: 'signed',
        },
      });

      const completedCount = await prisma.documentTrail.count({
        where: {
          ...whereClause,
          status: 'completed',
        },
      });

      // Get checkout count (as a proxy for downloads)
      const checkoutsCount = await prisma.userCheckout.count({
        where: {
          documentFile: {
            Document: {
              DocumentAdditionalDetails: {
                some: {
                  work_flow_id: {
                    path: [],
                    string_contains: departmentId,
                  },
                },
              },
            },
          },
        },
      });

      return {
        totalAccesses,
        uniqueUsers,
        avgAccessPerDay,
        byActionType: {
          views: viewsCount,
          downloads: checkoutsCount,
          checkouts: checkoutsCount,
          signs: signsCount,
        },
      };
    } catch (error) {
      console.error('Error fetching access history stats:', error);
      throw error;
    }
  }

  /**
   * Get access history for a specific document
   */
  async getAccessHistoryByDocument(documentId: string): Promise<AccessHistoryLog[]> {
    try {
      const trails = await prisma.documentTrail.findMany({
        where: {
          document_id: documentId,
          status: {
            in: ['received', 'intransit', 'completed', 'signed'],
          },
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
        },
        orderBy: {
          action_date: 'desc',
        },
      });

      return trails.map((trail) => {
        const userName = trail.user
          ? `${trail.user.first_name} ${trail.user.last_name}`
          : 'Unknown User';

        let action = 'Accessed';
        if (trail.status === 'received') action = 'Viewed';
        else if (trail.status === 'intransit') action = 'Accessed';
        else if (trail.status === 'completed') action = 'Completed';
        else if (trail.status === 'signed') action = 'Signed';

        const department = trail.toDept?.name || trail.fromDept?.name || 'Unknown';

        return {
          id: trail.trail_id,
          user: userName,
          userAvatar: trail.user?.avatar || undefined,
          document: trail.document?.title || 'Unknown Document',
          documentCode: trail.document?.document_code || 'N/A',
          action,
          timestamp: trail.action_date.toISOString(),
          department,
          source: 'trail' as const,
        };
      });
    } catch (error) {
      console.error('Error fetching access history by document:', error);
      throw error;
    }
  }

  /**
   * Get access history for a specific user
   */
  async getAccessHistoryByUser(
    userId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ accessLogs: AccessHistoryLog[]; total: number }> {
    try {
      const { startDate, endDate, limit = 50, offset = 0 } = filters;

      const whereClause: any = {
        user_id: userId,
        status: {
          in: ['received', 'intransit', 'completed', 'signed'],
        },
      };

      if (startDate || endDate) {
        whereClause.action_date = {};
        if (startDate) whereClause.action_date.gte = startDate;
        if (endDate) whereClause.action_date.lte = endDate;
      }

      const total = await prisma.documentTrail.count({ where: whereClause });

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
        },
        orderBy: {
          action_date: 'desc',
        },
        take: limit,
        skip: offset,
      });

      const accessLogs: AccessHistoryLog[] = trails.map((trail) => {
        const userName = trail.user
          ? `${trail.user.first_name} ${trail.user.last_name}`
          : 'Unknown User';

        let action = 'Accessed';
        if (trail.status === 'received') action = 'Viewed';
        else if (trail.status === 'intransit') action = 'Accessed';
        else if (trail.status === 'completed') action = 'Completed';
        else if (trail.status === 'signed') action = 'Signed';

        const department = trail.toDept?.name || trail.fromDept?.name || 'Unknown';

        return {
          id: trail.trail_id,
          user: userName,
          userAvatar: trail.user?.avatar || undefined,
          document: trail.document?.title || 'Unknown Document',
          documentCode: trail.document?.document_code || 'N/A',
          action,
          timestamp: trail.action_date.toISOString(),
          department,
          source: 'trail' as const,
        };
      });

      return { accessLogs, total };
    } catch (error) {
      console.error('Error fetching access history by user:', error);
      throw error;
    }
  }
}
