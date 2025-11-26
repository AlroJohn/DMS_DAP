import { prisma } from '../lib/prisma';

export interface DocumentStats {
  owned: number;
  inTransit: number;
  shared: number;
  archive: number;
  recycleBin: number;
  total: number;
}

export interface DashboardStats {
  documentStats: DocumentStats;
  recentActivity: number;
  pendingApprovals: number;
  activeWorkflows: number;
  collaborators: number;
  storageUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  complianceStatus: number;
  systemActivity: Array<{
    id: string;
    action: string;
    timestamp: Date;
    user?: string;
  }>;
  topDocuments: Array<{
    id: string;
    title: string;
    views: number;
  }>;
  departmentPerformance: {
    name: string;
    documentsProcessed: number;
    efficiency: number;
  }[];
  workflowStats: {
    totalWorkflows: number;
    completedWorkflows: number;
    pendingWorkflows: number;
    inProgressWorkflows: number;
  };
  recentDocuments: Array<{
    id: string;
    title: string;
    sender: {
      name: string;
      initials: string;
    };
    timeAgo: string;
  }>;
  documentTrends: Array<{
    month: string;
    active: number;
    archived: number;
  }>;
}

export class DashboardService {
  async getDocumentStats(userId: string): Promise<DocumentStats> {
    try {
      // Get the user's information including department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          department_id: true,
          account_id: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Count owned documents (documents created by this user, not deleted)
      const owned = await prisma.document.count({
        where: {
          files: {
            some: {
              uploaded_by: user.account_id
            }
          },
          status: {
            notIn: ['deleted']
          }
        }
      });

      // Count in-transit documents (documents with status 'intransit')
      const inTransit = await prisma.document.count({
        where: {
          status: 'intransit',
          NOT: {
            files: {
              some: {
                uploaded_by: user.account_id
              }
            }
          }
        }
      });

      // Count shared documents (documents in received_by_departments containing user ID)
      const allDocumentDetails = await prisma.documentAdditionalDetails.findMany({
        where: {
          Document: {
            status: {
              not: 'deleted'
            }
          }
        },
        select: {
          received_by_departments: true,
          Document: {
            select: {
              files: {
                select: {
                  uploaded_by: true
                }
              }
            }
          }
        }
      });

      // Filter for documents shared to this user
      const shared = allDocumentDetails.filter((detail: any) => {
        // Skip if document was uploaded by user
        const isOwner = detail.Document?.files?.some((file: any) => file.uploaded_by === user.account_id);
        if (isOwner) return false;

        // Check if user ID is in received_by_departments
        let receivedByUsers: string[] = [];
        if (Array.isArray(detail.received_by_departments)) {
          receivedByUsers = detail.received_by_departments as string[];
        } else if (typeof detail.received_by_departments === 'string' && detail.received_by_departments) {
          try {
            const parsed = JSON.parse(detail.received_by_departments);
            if (Array.isArray(parsed)) {
              receivedByUsers = parsed;
            } else if (typeof parsed === 'object') {
              receivedByUsers = Object.values(parsed).filter((v): v is string => typeof v === 'string');
            }
          } catch {
            receivedByUsers = [];
          }
        }

        return receivedByUsers.includes(userId);
      }).length;

      // Count archived documents (status 'completed' or documents marked with deleted_at but status not 'deleted')
      const archive = await prisma.document.count({
        where: {
          files: {
            some: {
              uploaded_by: user.account_id
            }
          },
          status: 'completed'
        }
      });

      // Count recycle bin documents (status 'deleted')
      const recycleBin = await prisma.document.count({
        where: {
          files: {
            some: {
              uploaded_by: user.account_id
            }
          },
          status: 'deleted'
        }
      });

      // Total documents user has access to (excluding deleted)
      const total = owned + inTransit + shared;

      return {
        owned,
        inTransit,
        shared,
        archive,
        recycleBin,
        total
      };
    } catch (error) {
      console.error('Error fetching document stats:', error);
      throw new Error('Failed to fetch document statistics');
    }
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // Get document stats
      const documentStats = await this.getDocumentStats(userId);

      // Get recent activity count (last 7 days) - using DocumentAction since documentActivity doesn't exist
      const recentActivity = await prisma.documentAction.count({
        where: {
          action_date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      });

      // Get pending approvals (documents with status 'pending')
      const pendingApprovals = await prisma.document.count({
        where: {
          status: 'dispatch', // Assuming 'dispatch' means pending action
        },
      });

      // Get active workflows count - using documents with intransit status as proxy for active workflows
      const activeWorkflows = await prisma.document.count({
        where: {
          status: 'intransit'
        }
      });

      // Get collaborators count (users in same department or shared documents)
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, account_id: true }
      });

      let collaborators = 0;
      if (user?.department_id) {
        collaborators = await prisma.user.count({
          where: {
            department_id: user.department_id,
            user_id: { not: userId }, // Exclude current user
          },
        });
      }

      // Storage usage stats (placeholder logic - adjust based on your storage implementation)
      const storageUsage = {
        used: 128, // Placeholder - replace with actual storage calculation
        total: 1000, // 1000 GB total
        percentage: 12.8,
      };

      // Compliance status (calculate from audit records)
      const complianceStatus = 94; // Placeholder - calculate from actual compliance data

      // Get recent system activity
      const systemActivity = await prisma.documentAction.findMany({
        take: 4,
        orderBy: { action_date: 'desc' },
        select: {
          document_action_id: true,
          action_name: true,
          action_date: true,
        },
      }).then(activities =>
        activities.map(activity => ({
          id: activity.document_action_id,
          action: activity.action_name,
          timestamp: activity.action_date,
        }))
      );

      // Get top documents by recent activity (using document actions)
      const topDocuments = await prisma.document.findMany({
        take: 3,
        orderBy: { created_at: 'desc' }, // Using recent creation as a proxy for popularity
        select: {
          document_id: true,
          title: true,
        },
      }).then(docs =>
        docs.map(doc => ({
          id: doc.document_id,
          title: doc.title,
          views: 100, // Placeholder value since there's no views field in schema
        }))
      );

      // Get department performance stats - simplified version
      const departmentPerformance = await prisma.department.findMany({
        select: {
          name: true,
          department_id: true,
        },
      }).then(async departments => {
        // For each department, calculate documents processed and efficiency
        return Promise.all(departments.map(async dept => {
          // Count documents uploaded by users from this department
          const processedDocs = await prisma.document.count({
            where: {
              files: {
                some: {
                  uploaded_by: { // Check if documents were uploaded by users from this department
                    in: (await prisma.user.findMany({
                      where: {
                        department_id: dept.department_id
                      },
                      select: { account_id: true }
                    })).map(u => u.account_id)
                  }
                }
              }
            },
          });

          // Calculate efficiency based on some metrics (placeholder logic)
          const efficiency = Math.min(100, Math.floor((processedDocs / 10) * 10)); // Placeholder calculation

          return {
            name: dept.name,
            documentsProcessed: processedDocs,
            efficiency,
          };
        }));
      });

      // Placeholder workflow statistics since there's no workflow model in schema
      // Using document statuses as proxy for workflow stages
      const totalWorkflows = await prisma.document.count();
      const completedWorkflows = await prisma.document.count({
        where: { status: 'completed' }
      });
      const pendingWorkflows = await prisma.document.count({
        where: {
          OR: [
            { status: 'dispatch' },
            { status: 'received' }
          ]
        }
      });
      const inProgressWorkflows = await prisma.document.count({
        where: { status: 'intransit' }
      });

      // Get recent documents
      const recentDocs = await prisma.document.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          files: {
            include: {
              uploaded_by_account: {
                include: {
                  user: true  // include user details from the account
                }
              }
            }
          }
        }
      }).then(docs =>
        docs.map(doc => {
          // Create initials from the uploaded user's name
          let initials = 'U';
          if (doc.files && doc.files[0] && doc.files[0].uploaded_by_account?.user) {
            const nameParts = doc.files[0].uploaded_by_account.user.first_name?.split(' ') || ['Unknown'];
            initials = nameParts.map(part => part[0]).join('').toUpperCase() || 'U';
          }

          // Calculate time ago string
          const timeDiff = Math.floor((Date.now() - doc.created_at.getTime()) / 1000);
          let timeAgo = 'Just now';

          if (timeDiff < 60) {
            timeAgo = 'Just now';
          } else if (timeDiff < 3600) {
            const minutes = Math.floor(timeDiff / 60);
            timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
          } else if (timeDiff < 86400) {
            const hours = Math.floor(timeDiff / 3600);
            timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
          } else {
            const days = Math.floor(timeDiff / 86400);
            timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
          }

          return {
            id: doc.document_id, // according to schema, the field is document_id
            title: doc.title || 'Untitled Document',
            sender: {
              name: doc.files && doc.files[0] && doc.files[0].uploaded_by_account?.user
                ? `${doc.files[0].uploaded_by_account.user.first_name} ${doc.files[0].uploaded_by_account.user.last_name || ''}`.trim()
                : 'Unknown User',
              initials
            },
            timeAgo
          };
        })
      );

      return {
        documentStats,
        recentActivity,
        pendingApprovals,
        activeWorkflows,
        collaborators,
        storageUsage,
        complianceStatus,
        systemActivity,
        topDocuments,
        departmentPerformance,
        workflowStats: {
          totalWorkflows,
          completedWorkflows,
          pendingWorkflows,
          inProgressWorkflows,
        },
        recentDocuments: recentDocs,
        documentTrends: [
          { month: "Jan", active: 186, archived: 80 },
          { month: "Feb", active: 305, archived: 200 },
          { month: "Mar", active: 237, archived: 120 },
          { month: "Apr", active: 273, archived: 190 },
          { month: "May", active: 209, archived: 130 },
          { month: "Jun", active: 214, archived: 140 },
        ]
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }
}
