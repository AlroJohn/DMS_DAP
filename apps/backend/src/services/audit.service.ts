

import { prisma } from '../lib/prisma';

interface TrailLogDetails {
  description?: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  status?: string;
}

class AuditService {
  private async getUserDepartmentId(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true },
      });
      return user?.department_id ?? null;
    } catch (error) {
      console.error('Failed to resolve user department:', error);
      return null;
    }
  }

  private async createDocumentTrail(
    userId: string,
    documentId: string,
    status: string,
    details: TrailLogDetails = {}
  ) {
    try {
      const userDepartmentId = await this.getUserDepartmentId(userId);
      const fromDepartment = details.fromDepartmentId ?? userDepartmentId ?? undefined;
      const toDepartment = details.toDepartmentId ?? userDepartmentId ?? undefined;

      await prisma.documentTrail.create({
        data: {
          document_id: documentId,
          user_id: userId,
          from_department: fromDepartment,
          to_department: toDepartment,
          status,
          remarks: details.description,
        },
      });
    } catch (error) {
      console.error('Failed to create document trail:', error);
    }
  }

  async logDocumentCreated(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'dispatch', {
      description: details.description ?? 'Document created',
      ...details,
    });
  }

  async logDocumentReleased(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'intransit', {
      description: details.description ?? 'Document released',
      ...details,
    });
  }

  async logDocumentReceived(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'received', {
      description: details.description ?? 'Document received',
      ...details,
    });
  }

  async logDocumentDeleted(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'deleted', {
      description: details.description ?? 'Document deleted',
      ...details,
    });
  }

  async logDocumentArchived(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'archive', {
      description: details.description ?? 'Document archived',
      ...details,
    });
  }

  async logDocumentRestored(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'restored', {
      description: details.description ?? 'Document restored',
      ...details,
    });
  }

  async logDocumentSigned(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'signed', {
      description: details.description ?? 'Document signed',
      ...details,
    });
  }

  async getDocumentTrailsForDepartment(
    departmentId: string,
    userId?: string,
    filters: {
      status?: string;
      ownership?: 'owned' | 'shared' | 'all';
      searchTerm?: string;
    } = {}
  ) {
    try {
      // Build the query conditions
      const whereClause: any = {
        OR: [
          { from_department: departmentId },
          { to_department: departmentId }
        ]
      };

      // Apply status filter if provided
      if (filters.status && filters.status !== 'all') {
        whereClause.status = filters.status;
      }

      // Apply search term filter if provided
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        whereClause.OR = [
          ...whereClause.OR,
          { document: { title: { contains: searchTerm, mode: 'insensitive' } } },
          { document: { document_code: { contains: searchTerm, mode: 'insensitive' } } },
          { document: { description: { contains: searchTerm, mode: 'insensitive' } } },
          { remarks: { contains: searchTerm, mode: 'insensitive' } },
          { user: { first_name: { contains: searchTerm, mode: 'insensitive' } } },
          { user: { last_name: { contains: searchTerm, mode: 'insensitive' } } },
        ];
      }

      // Fetch document trails with related data
      const trails = await prisma.documentTrail.findMany({
        where: whereClause,
        include: {
          document: {
            select: {
              title: true,
              document_code: true,
              document_type: true,
              description: true
            }
          },
          documentAction: {
            select: {
              action_name: true
            }
          },
          user: {
            select: {
              first_name: true,
              last_name: true
            }
          },
          fromDept: {
            select: {
              name: true
            }
          },
          toDept: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          action_date: 'desc'
        }
      });

      // Get document creation information to determine ownership
      const documentIds = [...new Set(trails.map(trail => trail.document_id))];
      const documentDetails = await prisma.documentAdditionalDetails.findMany({
        where: {
          document_id: {
            in: documentIds
          }
        },
        select: {
          document_id: true,
          work_flow_id: true
        }
      });

      // Get document status information to determine if document is completed
      const documentStatuses = await prisma.document.findMany({
        where: {
          document_id: {
            in: documentIds
          }
        },
        select: {
          document_id: true,
          status: true
        }
      });

      // Create maps for document workflow and status
      const documentWorkflowMap = new Map<string, any>();
      const documentStatusMap = new Map<string, string>();

      documentDetails.forEach(detail => {
        documentWorkflowMap.set(detail.document_id, detail.work_flow_id);
      });

      documentStatuses.forEach(doc => {
        documentStatusMap.set(doc.document_id, doc.status);
      });

      // Process trails to add ownership information
      let processedTrails = trails.map(trail => {
        // Determine if this document was created by this department
        // Check if the document's workflow starts with this department
        let isOwned = false;
        const workflow = documentWorkflowMap.get(trail.document_id);

        if (workflow) {
          try {
            let workflowDepartments: string[] = [];

            if (typeof workflow === 'object' && workflow !== null) {
              // New format: object with keys like "first", "second", etc.
              workflowDepartments = Object.values(workflow);
            } else if (typeof workflow === 'string') {
              // Could be either a JSON string of an array or a JSON string of an object
              const parsed = JSON.parse(workflow);
              if (Array.isArray(parsed)) {
                workflowDepartments = parsed;
              } else {
                // If it's an object, get its values
                workflowDepartments = Object.values(parsed);
              }
            } else if (Array.isArray(workflow)) {
              // Old format: array
              workflowDepartments = workflow;
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is the FIRST entry in workflow (originated from this department)
            isOwned = workflowDepartments.length > 0 && workflowDepartments[0] === departmentId;
          } catch (e) {
            console.error('Error parsing work_flow_id for ownership check:', e);
            // Fallback to checking if this trail's from_department matches
            isOwned = trail.from_department === departmentId;
          }
        } else {
          // If no workflow info, fallback to checking if this trail's from_department matches
          isOwned = trail.from_department === departmentId;
        }

        // If the document's overall status is 'completed', override the trail status to 'completed'
        // This ensures that completed documents always show as completed regardless of individual trail status
        const documentStatus = documentStatusMap.get(trail.document_id);
        const finalStatus = documentStatus === 'completed' ? 'completed' : trail.status;

        return {
          id: trail.trail_id,
          documentId: trail.document_id,
          documentTitle: trail.document?.title || 'Unknown Document',
          documentCode: trail.document?.document_code || 'N/A',
          documentType: trail.document?.document_type || 'Unknown',
          documentDescription: trail.document?.description || '',
          status: finalStatus,
          actionName: trail.documentAction?.action_name || '',
          fromDepartment: trail.fromDept?.name || 'Unknown',
          toDepartment: trail.toDept?.name || 'Unknown',
          user: `${trail.user?.first_name || ''} ${trail.user?.last_name || ''}`.trim() || 'Unknown User',
          actionDate: trail.action_date.toISOString(),
          remarks: trail.remarks || '',
          isOwned
        };
      });

      // Apply ownership filter if specified
      if (filters.ownership && filters.ownership !== 'all') {
        if (filters.ownership === 'owned') {
          processedTrails = processedTrails.filter(trail => trail.isOwned);
        } else if (filters.ownership === 'shared') {
          processedTrails = processedTrails.filter(trail => !trail.isOwned);
        }
      }

      return processedTrails;
    } catch (error) {
      console.error('Failed to fetch document trails for department:', error);
      throw error;
    }
  }

  async getDocumentTrailDetails(documentId: string, departmentId: string) {
    try {
      // Get document information
      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        select: {
          title: true,
          document_code: true,
          document_type: true,
          classification: true,
          status: true,
          created_at: true
        }
      });

      // Get all trails for this document
      const trails = await prisma.documentTrail.findMany({
        where: { document_id: documentId },
        include: {
          documentAction: {
            select: {
              action_name: true
            }
          },
          user: {
            select: {
              first_name: true,
              last_name: true
            }
          },
          fromDept: {
            select: {
              name: true
            }
          },
          toDept: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          action_date: 'asc'
        }
      });

      const documentInfo = {
        id: documentId,
        title: document?.title || 'Unknown Document',
        code: document?.document_code || 'N/A',
        type: document?.document_type || 'Unknown',
        classification: document?.classification || 'simple',
        status: document?.status || 'dispatch',
        createdAt: document?.created_at ? document.created_at.toISOString() : new Date().toISOString()
      };

      const trailDetails = trails.map(trail => ({
        id: trail.trail_id,
        documentId: trail.document_id,
        actionDate: trail.action_date.toISOString(),
        actionName: trail.documentAction?.action_name || '',
        user: `${trail.user?.first_name || ''} ${trail.user?.last_name || ''}`.trim() || 'Unknown User',
        fromDepartment: trail.fromDept?.name || 'Unknown',
        toDepartment: trail.toDept?.name || 'Unknown',
        status: trail.status,
        remarks: trail.remarks || ''
      }));

      return {
        documentInfo,
        trails: trailDetails
      };
    } catch (error) {
      console.error('Failed to fetch document trail details:', error);
      throw error;
    }
  }
}

export const auditService = new AuditService();
