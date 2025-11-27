import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notification.service';

const prisma = new PrismaClient();
const notificationService = new NotificationService();

export class DocumentTrailsService {
  /**
   * Get all document trails for a specific document
   */
  async getDocumentTrails(documentId: string) {
    try {
      const trails = await prisma.documentTrail.findMany({
        where: {
          document_id: documentId,
        },
        include: {
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
    status: string;
    remarks?: string;
  }) {
    try {
      const trail = await prisma.documentTrail.create({
        data: {
          document_id: data.document_id,
          action_id: data.action_id,
          from_department: data.from_department,
          to_department: data.to_department,
          user_id: data.user_id,
          status: data.status,
          remarks: data.remarks,
        },
        include: {
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
      console.error('Error creating document trail:', error);
      throw error;
    }
  }

  /**
   * Update an existing document trail
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
          remarks: data.remarks,
          updated_at: new Date(),
        },
        include: {
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
   */
  async getDocumentTrailById(trailId: string) {
    try {
      const trail = await prisma.documentTrail.findUnique({
        where: {
          trail_id: trailId,
        },
        include: {
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
   */
  async getAllDocumentTrails(filters?: {
    userId?: string;
    departmentId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
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
        include: {
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
          
        case 'dispatch':
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