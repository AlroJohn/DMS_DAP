import { PrismaClient } from '@prisma/client';
import { DocumentFile } from '@prisma/client';

const prisma = new PrismaClient();

interface UsageReportStatistics {
  totalDocuments: number;
  activeUsers: number;
  storageUsed: string;
  apiCalls: number;
  documentsThisMonth: number;
  usersThisMonth: number;
  storageChange: string;
  apiCallChange: string;
}

interface DepartmentUsage {
  name: string;
  documents: number;
  users: number;
  storage: string;
  activity: number;
}

interface RecentActivity {
  action: string;
  user: string;
  time: string;
}

interface UsageReport {
  statistics: UsageReportStatistics;
  departmentUsage: DepartmentUsage[];
  recentActivity: RecentActivity[];
}

export class DocumentReportsService {
  /**
   * Get usage report data
   */
  async getUsageReport(dateRange: string = '30days'): Promise<UsageReport> {
    try {
      // Calculate date range based on input
      const endDate = new Date();
      let startDate = new Date();

      switch(dateRange) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30); // Default to 30 days
      }

      // Get total documents count
      const totalDocuments = await prisma.document.count();

      // Get documents created in the specified date range
      const documentsThisPeriod = await prisma.document.count({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Get active users count
      const activeUsers = await prisma.account.count({
        where: {
          last_login: {
            gte: startDate
          }
        }
      });

      // Get users created in the specified date range
      const usersThisPeriod = await prisma.user.count({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Get total storage used (in bytes)
      const documentsWithFiles = await prisma.documentFile.findMany({
        where: {
          uploaded_at: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          file_size: true
        }
      });

      const storageUsedBytes = documentsWithFiles.reduce((sum, file) => sum + Number(file.file_size), 0);
      const storageUsedGB = (storageUsedBytes / (1024 * 1024 * 1024)).toFixed(1);

      // Calculate storage change percentage
      const prevStartDate = new Date(startDate);
      const prevEndDate = new Date(startDate);
      const periodDiff = endDate.getTime() - startDate.getTime();

      prevStartDate.setTime(prevStartDate.getTime() - periodDiff);
      prevEndDate.setTime(prevEndDate.getTime() - periodDiff);

      const prevPeriodStorage = await prisma.documentFile.findMany({
        where: {
          uploaded_at: {
            gte: prevStartDate,
            lte: prevEndDate
          }
        },
        select: {
          file_size: true
        }
      });

      const prevStorageUsedBytes = prevPeriodStorage.reduce((sum, file) => sum + Number(file.file_size), 0);
      const prevStorageUsedGB = (prevStorageUsedBytes / (1024 * 1024 * 1024)).toFixed(1);

      let storageChange = '0%';
      if (prevStorageUsedBytes > 0) {
        const change = ((storageUsedBytes - prevStorageUsedBytes) / prevStorageUsedBytes) * 100;
        storageChange = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
      }

      // Mock API calls data (in a real implementation, you would track actual API calls)
      const apiCalls = 18429; // Placeholder value
      const apiCallChange = '-3%'; // Placeholder value

      // Get department usage data
      const departmentUsage = await prisma.department.findMany({
        where: {
          active: true
        },
        include: {
          Account: {
            include: {
              user: true
            }
          }
        }
      });

      const formattedDepartmentUsage = await Promise.all(
        departmentUsage.map(async (dept) => {
          // Get user IDs in this department
          const userIds = dept.Account
            .map(account => account.user?.user_id)
            .filter((id): id is string => id !== null && id !== undefined);

          // Count documents associated with users in this department through document trails
          let documentsInDept: number = 0; // Default to 0 if no users in department
          if (userIds.length > 0) {
            const uniqueTrails = await prisma.documentTrail.findMany({
              where: {
                action_date: {
                  gte: startDate,
                  lte: endDate
                },
                user_id: {
                  in: userIds
                }
              },
              select: {
                document_id: true
              },
              distinct: ['document_id']  // Count unique documents
            });
            const count: number = uniqueTrails.length;
            documentsInDept = count;
          }

          // Calculate storage used by department
          const deptFiles = await prisma.documentFile.findMany({
            where: {
              uploaded_at: {
                gte: startDate,
                lte: endDate
              },
              uploaded_by_account: {
                department_id: dept.department_id
              }
            },
            select: {
              file_size: true
            }
          });

          const deptStorageBytes = deptFiles.reduce((sum, file) => sum + Number(file.file_size), 0);
          const deptStorageGB = (deptStorageBytes / (1024 * 1024 * 1024)).toFixed(1);

          // Calculate activity percentage (mock calculation)
          const activity = Math.min(100, Math.floor(Math.random() * 40) + 60); // Random between 60-100%

          return {
            name: dept.name,
            documents: documentsInDept,
            users: dept.Account.length,
            storage: `${deptStorageGB} GB`,
            activity
          };
        })
      );

      // Get recent activity
      const recentActivity = await prisma.documentTrail.findMany({
        where: {
          action_date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        include: {
          user: {
            include: {
              account: {
                include: {
                  department: true
                }
              }
            }
          },
          document: true,
          documentAction: true
        },
        orderBy: {
          action_date: 'desc'
        },
        take: 10
      });

      // Format recent activity
      const formattedRecentActivity = recentActivity.map(trail => {
        // Create a more descriptive action when documentAction is not available
        let actionDescription = trail.documentAction?.action_name || 'Action';

        // If action_name is not available, create a descriptive action based on available data
        if (!trail.documentAction?.action_name) {
          // Try to construct a meaningful action based on the trail data
          if (trail.document) {
            // Determine the type of action based on available fields
            let actionType = 'activity';

            // Check for specific action indicators in the trail
            if (trail.action_date && trail.document.created_at &&
                Math.abs(trail.action_date.getTime() - trail.document.created_at.getTime()) < 60000) { // Within 1 minute
              actionType = 'created';
            } else if (trail.document.updated_at &&
                      Math.abs(trail.action_date.getTime() - trail.document.updated_at.getTime()) < 60000) { // Within 1 minute
              actionType = 'updated';
            } else if (trail.document.status) {
              // Try to infer action from document status
              switch(trail.document.status.toLowerCase()) {
                case 'completed':
                  actionType = 'completed';
                  break;
                case 'in-transit':
                  actionType = 'sent for review';
                  break;
                case 'released':
                  actionType = 'released';
                  break;
                case 'archived':
                  actionType = 'archived';
                  break;
                default:
                  actionType = 'status updated';
              }
            }

            actionDescription = `Document ${actionType} - ${trail.document.title || trail.document.document_code || 'a document'}`;
          } else {
            actionDescription = 'System activity';
          }
        }

        return {
          action: actionDescription,
          user: `${trail.user?.first_name} ${trail.user?.last_name}`,
          time: this.formatTimeAgo(trail.action_date)
        };
      });

      return {
        statistics: {
          totalDocuments,
          activeUsers,
          storageUsed: `${storageUsedGB} GB`,
          apiCalls,
          documentsThisMonth: documentsThisPeriod,
          usersThisMonth: usersThisPeriod,
          storageChange,
          apiCallChange
        },
        departmentUsage: formattedDepartmentUsage,
        recentActivity: formattedRecentActivity
      };
    } catch (error) {
      console.error('Error getting usage report:', error);
      throw error;
    }
  }

  /**
   * Helper function to format time ago
   */
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  /**
   * Get version history report for all documents
   */
  async getVersionHistoryReport() {
    try {
      // Get all document files grouped by document to show version history
      const documentsWithVersions = await prisma.document.findMany({
        include: {
          files: {
            include: {
              uploaded_by_account: {
                include: {
                  user: true
                }
              },
              DocumentMetadata: true
            },
            orderBy: {
              version: 'asc' // Order by version number
            }
          },
          document_trails: {
            include: {
              user: true,
              documentAction: true
            },
            orderBy: {
              action_date: 'desc'
            },
            take: 1 // Get the most recent trail for each document
          }
        }
      });

      // Calculate statistics
      const totalVersions = documentsWithVersions.reduce(
        (sum, doc) => sum + doc.files.length, 
        0
      );
      
      const currentMonth = new Date();
      currentMonth.setDate(1); // Set to first day of month
      currentMonth.setHours(0, 0, 0, 0);
      
      const versionsThisMonth = documentsWithVersions.reduce(
        (sum, doc) => 
          sum + doc.files.filter(file => 
            file.uploaded_at >= currentMonth
          ).length, 
        0
      );
      
      const avgVersionsPerDoc = documentsWithVersions.length > 0 
        ? parseFloat((totalVersions / documentsWithVersions.length).toFixed(1)) 
        : 0;

      // Get recent version changes (last 10)
      const recentChanges = await prisma.documentFile.findMany({
        include: {
          Document: true,
          uploaded_by_account: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          uploaded_at: 'desc'
        },
        take: 10
      });

      return {
        statistics: {
          totalVersions,
          versionsThisMonth,
          avgVersionsPerDoc
        },
        recentChanges: recentChanges.map(file => ({
          fileId: file.file_id,
          fileName: file.original_name,
          documentTitle: file.Document.title,
          documentCode: file.Document.document_code,
          version: file.version,
          uploadedAt: file.uploaded_at,
          uploadedBy: file.uploaded_by_account?.user 
            ? `${file.uploaded_by_account.user.first_name} ${file.uploaded_by_account.user.last_name}`
            : 'Unknown User'
        }))
      };
    } catch (error) {
      console.error('Error getting version history report:', error);
      throw error;
    }
  }

  /**
   * Get version history for a specific document
   */
  async getDocumentVersionHistory(identifier: string) {
    try {
      // Check if the identifier looks like a UUID or a document code
      // A UUID has a specific format: 8-4-4-4-12 hex characters separated by hyphens
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      let document;
      if (isUUID) {
        // If it's a UUID, search by document_id
        document = await prisma.document.findUnique({
          where: { document_id: identifier },
          include: {
            files: {
              include: {
                uploaded_by_account: {
                  include: {
                    user: true
                  }
                },
                DocumentMetadata: true
              },
              orderBy: {
                version: 'asc' // Order by version number
              }
            }
          }
        });
      } else {
        // If it's not a UUID, search by document_code
        document = await prisma.document.findUnique({
          where: { document_code: identifier },
          include: {
            files: {
              include: {
                uploaded_by_account: {
                  include: {
                    user: true
                  }
                },
                DocumentMetadata: true
              },
              orderBy: {
                version: 'asc' // Order by version number
              }
            }
          }
        });
      }

      if (!document) {
        throw new Error('Document not found');
      }

      return {
        documentId: document.document_id,
        documentTitle: document.title,
        documentCode: document.document_code,
        versions: document.files.map(file => ({
          fileId: file.file_id,
          fileName: file.original_name,
          version: file.version,
          fileSize: file.file_size,
          uploadedAt: file.uploaded_at,
          uploadedBy: file.uploaded_by_account?.user
            ? `${file.uploaded_by_account.user.first_name} ${file.uploaded_by_account.user.last_name}`
            : 'Unknown User',
          mimeType: file.mime_type,
          metadata: file.DocumentMetadata
        }))
      };
    } catch (error) {
      console.error('Error getting document version history:', error);
      throw error;
    }
  }

  /**
   * Get version comparison between two document versions
   */
  async compareDocumentVersions(fileId1: string, fileId2: string) {
    try {
      const file1 = await prisma.documentFile.findUnique({
        where: { file_id: fileId1 },
        include: {
          Document: true,
          uploaded_by_account: {
            include: {
              user: true
            }
          },
          DocumentMetadata: true
        }
      });

      const file2 = await prisma.documentFile.findUnique({
        where: { file_id: fileId2 },
        include: {
          Document: true,
          uploaded_by_account: {
            include: {
              user: true
            }
          },
          DocumentMetadata: true
        }
      });

      if (!file1 || !file2) {
        throw new Error('One or both files not found');
      }

      if (file1.document_id !== file2.document_id) {
        throw new Error('Cannot compare files from different documents');
      }

      return {
        documentId: file1.document_id,
        documentTitle: file1.Document.title,
        version1: {
          fileId: file1.file_id,
          fileName: file1.original_name,
          version: file1.version,
          uploadedAt: file1.uploaded_at,
          uploadedBy: file1.uploaded_by_account?.user 
            ? `${file1.uploaded_by_account.user.first_name} ${file1.uploaded_by_account.user.last_name}`
            : 'Unknown User',
          fileSize: file1.file_size,
          metadata: file1.DocumentMetadata
        },
        version2: {
          fileId: file2.file_id,
          fileName: file2.original_name,
          version: file2.version,
          uploadedAt: file2.uploaded_at,
          uploadedBy: file2.uploaded_by_account?.user 
            ? `${file2.uploaded_by_account.user.first_name} ${file2.uploaded_by_account.user.last_name}`
            : 'Unknown User',
          fileSize: file2.file_size,
          metadata: file2.DocumentMetadata
        }
      };
    } catch (error) {
      console.error('Error comparing document versions:', error);
      throw error;
    }
  }
}