import { prisma } from '../lib/prisma';
import { NotificationService } from './notification.service';
import { ProcessStatusService } from './process-status.service';

const notificationService = new NotificationService();
const processStatusService = new ProcessStatusService();

export class DocumentTrailsService {
  /**
   * Helper function to resolve department names from IDs in remarks
   */
  private async resolveRemarksWithNames(
    remarks: string | undefined,
    fromDepartmentId?: string,
    toDepartmentId?: string,
    userId?: string
  ): Promise<string> {
    if (!remarks) return '';

    let processedRemarks = remarks;

    try {
      // Replace from_department ID with name
      if (fromDepartmentId) {
        const fromDept = await prisma.department.findUnique({
          where: { department_id: fromDepartmentId },
          select: { name: true }
        });
        if (fromDept) {
          processedRemarks = processedRemarks.replace(
            new RegExp(fromDepartmentId, 'g'),
            fromDept.name
          );
        }
      }

      // Replace to_department ID with name
      if (toDepartmentId) {
        const toDept = await prisma.department.findUnique({
          where: { department_id: toDepartmentId },
          select: { name: true }
        });
        if (toDept) {
          processedRemarks = processedRemarks.replace(
            new RegExp(toDepartmentId, 'g'),
            toDept.name
          );
        }
      }

      // Replace user ID with name
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { first_name: true, last_name: true }
        });
        if (user) {
          const userName = `${user.first_name} ${user.last_name}`.trim();
          processedRemarks = processedRemarks.replace(
            new RegExp(userId, 'g'),
            userName
          );
        }
      }

      // Look for any remaining UUID patterns and try to resolve them
      const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      const uuids = processedRemarks.match(uuidPattern);

      if (uuids) {
        for (const uuid of [...new Set(uuids)]) {
          // Try to find if it's a department
          const dept = await prisma.department.findUnique({
            where: { department_id: uuid },
            select: { name: true }
          });
          if (dept) {
            processedRemarks = processedRemarks.replace(
              new RegExp(uuid, 'g'),
              dept.name
            );
            continue;
          }

          // Try to find if it's a user
          const user = await prisma.user.findUnique({
            where: { user_id: uuid },
            select: { first_name: true, last_name: true }
          });
          if (user) {
            const userName = `${user.first_name} ${user.last_name}`.trim();
            processedRemarks = processedRemarks.replace(
              new RegExp(uuid, 'g'),
              userName
            );
            continue;
          }

          // Try to find if it's a document type
          const docType = await prisma.documentType.findUnique({
            where: { type_id: uuid },
            select: { name: true }
          });
          if (docType) {
            processedRemarks = processedRemarks.replace(
              new RegExp(uuid, 'g'),
              docType.name
            );
          }
        }
      }
    } catch (error) {
      console.error('Error resolving names in remarks:', error);
    }

    return processedRemarks;
  }

  /**
   * Get all document trails for a specific document
   * Returns trails with date/time information:
   * - action_date: When the action was performed
   * - created_at: When the trail record was created
   * - updated_at: When the trail record was last updated
   */
  async getDocumentTrails(documentId: string) {
    try {
      const trails = await prisma.documentTrail.findMany({
        where: {
          document_id: documentId,
        },
        select: {
          trail_id: true,
          document_id: true,
          action_id: true,
          from_department: true,
          to_department: true,
          user_id: true,
          status: true,
          remarks: true,
          action_date: true,
          created_at: true,
          updated_at: true,
          documentAction: true,
          fromDept: {
            select: {
              name: true,
              code: true,
            }
          },
          toDept: {
            select: {
              name: true,
              code: true,
            }
          },
          user: {
            select: {
              first_name: true,
              last_name: true,
              user_name: true,
            }
          }
        },
        orderBy: {
          action_date: 'asc',
        },
      });

      return trails;
    } catch (error) {
      console.error('Error fetching document trails:', error);
      throw error;
    }
  }

  /**
   * Create a new document trail
   */
  async createDocumentTrail(data: {
    document_id: string;
    action_id?: string;
    from_department?: string;
    to_department?: string;
    user_id?: string;
    assigned_to_user_id?: string | null;
    status: string;
    remarks?: string;
    action_date?: Date;
  }) {
    try {
      // Resolve UUIDs in remarks to human-readable names
      const processedRemarks = await this.resolveRemarksWithNames(
        data.remarks,
        data.from_department,
        data.to_department,
        data.user_id
      );

      const trail = await prisma.documentTrail.create({
        data: {
          document_id: data.document_id,
          action_id: data.action_id,
          from_department: data.from_department,
          to_department: data.to_department,
          user_id: data.user_id,
          assigned_to_user_id: data.assigned_to_user_id,
          status: data.status,
          remarks: processedRemarks,
          action_date: data.action_date ?? new Date(), // Explicitly set action date to current time
        },
        select: {
          trail_id: true,
          document_id: true,
          action_id: true,
          from_department: true,
          to_department: true,
          user_id: true,
          status: true,
          remarks: true,
          action_date: true,
          created_at: true,
          updated_at: true,
          documentAction: true,
          fromDept: {
            select: {
              name: true,
              code: true,
            }
          },
          toDept: {
            select: {
              name: true,
              code: true,
            }
          },
          user: {
            select: {
              first_name: true,
              last_name: true,
              user_name: true,
            }
          }
        }
      });

      // Send notification based on the action and status
      await this.handleDocumentTrailNotification(trail);

      if (trail.status === 'received' || trail.status === 'completed') {
        try {
          await processStatusService.syncForDocument(trail.document_id);
        } catch (syncError) {
          console.error('Error syncing ProcessStatus:', syncError);
        }
      }

      return trail;
    } catch (error) {
      console.error('Error creating document trail:', error);
      throw error;
    }
  }

  /**
   * Update an existing document trail
   * Updates:
   * - updated_at: Automatically set to current timestamp
   * Preserves:
   * - action_date: Original action date (not modified)
   * - created_at: Original creation date (not modified)
   */
  async updateDocumentTrail(trailId: string, data: {
    action_id?: string;
    from_department?: string;
    to_department?: string;
    user_id?: string;
    status?: string;
    remarks?: string;
  }) {
    try {
      // Resolve UUIDs in remarks to human-readable names
      const processedRemarks = data.remarks
        ? await this.resolveRemarksWithNames(
          data.remarks,
          data.from_department,
          data.to_department,
          data.user_id
        )
        : undefined;

      const trail = await prisma.documentTrail.update({
        where: {
          trail_id: trailId,
        },
        data: {
          action_id: data.action_id,
          from_department: data.from_department,
          to_department: data.to_department,
          user_id: data.user_id,
          status: data.status,
          remarks: processedRemarks,
          updated_at: new Date(),
        },
        select: {
          trail_id: true,
          document_id: true,
          action_id: true,
          from_department: true,
          to_department: true,
          user_id: true,
          status: true,
          remarks: true,
          action_date: true,
          created_at: true,
          updated_at: true,
          document: {
            include: {
              DocumentAdditionalDetails: true,
            }
          },
          documentAction: true,
          fromDept: {
            select: {
              name: true,
              code: true,
            }
          },
          toDept: {
            select: {
              name: true,
              code: true,
            }
          },
          user: {
            select: {
              first_name: true,
              last_name: true,
              user_name: true,
            }
          }
        }
      });

      // Send notification based on the action and status
      await this.handleDocumentTrailNotification(trail);

      return trail;
    } catch (error) {
      console.error('Error updating document trail:', error);
      throw error;
    }
  }

  /**
   * Get document trail by ID
   * Returns trail with complete date/time information:
   * - action_date: When the action was performed
   * - created_at: When the trail record was created
   * - updated_at: When the trail record was last updated
   */
  async getDocumentTrailById(trailId: string) {
    try {
      const trail = await prisma.documentTrail.findUnique({
        where: {
          trail_id: trailId,
        },
        select: {
          trail_id: true,
          document_id: true,
          action_id: true,
          from_department: true,
          to_department: true,
          user_id: true,
          status: true,
          remarks: true,
          action_date: true,
          created_at: true,
          updated_at: true,
          documentAction: true,
          fromDept: {
            select: {
              name: true,
              code: true,
            }
          },
          toDept: {
            select: {
              name: true,
              code: true,
            }
          },
          user: {
            select: {
              first_name: true,
              last_name: true,
              user_name: true,
            }
          }
        }
      });

      return trail;
    } catch (error) {
      console.error('Error fetching document trail by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a document trail
   */
  async deleteDocumentTrail(trailId: string) {
    try {
      const trail = await prisma.documentTrail.delete({
        where: {
          trail_id: trailId,
        },
      });

      return trail;
    } catch (error) {
      console.error('Error deleting document trail:', error);
      throw error;
    }
  }

  /**
   * Get all document trails with optional filters
   * Supports filtering by date range using fromDate and toDate parameters
   * Returns trails ordered by action_date (most recent first)
   * Each trail includes:
   * - action_date: When the action was performed
   * - created_at: When the trail record was created
   * - updated_at: When the trail record was last updated
   */
  async getAllDocumentTrails(filters?: {
    userId?: string;
    departmentId?: string;
    status?: string;
    fromDate?: string; // Filter by action_date >= fromDate
    toDate?: string; // Filter by action_date <= toDate
  }) {
    try {
      const whereClause: any = {};

      if (filters?.userId) {
        whereClause.user_id = filters.userId;
      }

      if (filters?.departmentId) {
        whereClause.OR = [
          { from_department: filters.departmentId },
          { to_department: filters.departmentId }
        ];
      }

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.fromDate || filters?.toDate) {
        whereClause.action_date = {};
        if (filters.fromDate) {
          whereClause.action_date.gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          whereClause.action_date.lte = new Date(filters.toDate);
        }
      }

      const trails = await prisma.documentTrail.findMany({
        where: whereClause,
        select: {
          trail_id: true,
          document_id: true,
          action_id: true,
          from_department: true,
          to_department: true,
          user_id: true,
          status: true,
          remarks: true,
          action_date: true,
          created_at: true,
          updated_at: true,
          document: true,
          documentAction: true,
          fromDept: {
            select: {
              name: true,
              code: true,
            }
          },
          toDept: {
            select: {
              name: true,
              code: true,
            }
          },
          user: {
            select: {
              first_name: true,
              last_name: true,
              user_name: true,
            }
          }
        },
        orderBy: {
          action_date: 'desc',
        },
      });

      return trails;
    } catch (error) {
      console.error('Error fetching all document trails:', error);
      throw error;
    }
  }

  /**
   * Handle notifications for document trail actions
   */
  private async handleDocumentTrailNotification(trail: any) {
    try {
      const document = await prisma.document.findUnique({
        where: { document_id: trail.document_id },
        include: { DocumentAdditionalDetails: true }
      });

      if (!document) {
        console.error('Document not found for trail notification');
        return;
      }

      const documentTitle = document.title;

      // Notify users based on action type and department
      if (trail.to_department) {
        // Find users in the target department to notify
        const usersToNotify = await prisma.user.findMany({
          where: {
            department_id: trail.to_department,
            active: true,
          },
          select: {
            user_id: true,
          }
        });

        for (const user of usersToNotify) {
          // Skip notification if the target user is the same as the action performer
          if (trail.user_id && user.user_id === trail.user_id) {
            continue;
          }

          await notificationService.createDocumentReceivedNotification(
            user.user_id,
            document.document_id,
            documentTitle
          );
        }
      }

      // Additional notifications based on status
      switch (trail.status.toLowerCase()) {
        case 'completed':
          {
            const usersToNotify = await prisma.user.findMany({
              where: {
                OR: [
                  { department_id: trail.from_department },
                  { department_id: trail.to_department },
                ],
                active: true,
              },
              select: {
                user_id: true,
              }
            });

            for (const user of usersToNotify) {
              if (trail.user_id && user.user_id !== trail.user_id) {
                await notificationService.createDocumentCompletedNotification(
                  user.user_id,
                  document.document_id,
                  documentTitle
                );
              }
            }
          }
          break;

        case 'pending':
          {
            const usersToNotify = await prisma.user.findMany({
              where: {
                department_id: trail.from_department,
                active: true,
              },
              select: {
                user_id: true,
              }
            });

            for (const user of usersToNotify) {
              if (trail.user_id && user.user_id !== trail.user_id) {
                await notificationService.createDocumentUpdatedNotification(
                  user.user_id,
                  document.document_id,
                  documentTitle
                );
              }
            }
          }
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error handling document trail notification:', error);
    }
  }
}
