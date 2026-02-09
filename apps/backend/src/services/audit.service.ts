

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


      const trail = await prisma.documentTrail.create({
        data: {
          document_id: documentId,
          user_id: userId,
          from_department: fromDepartment,
          to_department: toDepartment,
          status,
          remarks: details.description,
        },
      });

      return trail;
    } catch (error) {
      console.error('❌ [AuditService] Failed to create document trail:', error);
      throw error;
    }
  }

  async logDocumentCreated(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'pending', {
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

  async logSignaturePlaceholderAdded(userId: string, documentId: string, details: TrailLogDetails = {}) {
    // Get user information for detailed logging
    let userName = 'Unknown User';
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { first_name: true, last_name: true }
      });
      if (user) {
        userName = `${user.first_name} ${user.last_name}`.trim();
      }
    } catch (error) {
      console.error('Failed to fetch user for signature placeholder log:', error);
    }


    return this.createDocumentTrail(userId, documentId, details.status ?? 'placeholder_added', {
      description: details.description ?? `Signature placeholder added by ${userName}`,
      ...details,
    });
  }

  async logDocumentSigned(userId: string, documentId: string, details: TrailLogDetails = {}) {
    // Get user information for detailed logging
    let userName = 'Unknown User';
    let deptName = 'Unknown Department';
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          first_name: true,
          last_name: true,
          department_id: true
        }
      });
      if (user) {
        userName = `${user.first_name} ${user.last_name}`.trim();

        // Fetch department name separately
        if (user.department_id) {
          const department = await prisma.department.findUnique({
            where: { department_id: user.department_id },
            select: { name: true }
          });
          deptName = department?.name || 'Unknown Department';
        }


        const defaultDescription = `Document signed by ${userName} from ${deptName}`;
        return this.createDocumentTrail(userId, documentId, details.status ?? 'signed', {
          description: details.description ?? defaultDescription,
          ...details,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user for document signing log:', error);
    }


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
      fromDate?: string;
      toDate?: string;
      classification?: string;
      documentType?: string;
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

      // Apply date range filters
      if (filters.fromDate || filters.toDate) {
        whereClause.action_date = {};
        if (filters.fromDate) {
          whereClause.action_date.gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          whereClause.action_date.lte = new Date(filters.toDate);
        }
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

      // Build document filter for classification and document type
      if (filters.classification && filters.classification !== 'all') {
        if (!whereClause.document) whereClause.document = {};
        whereClause.document.classification = filters.classification;
      }
      if (filters.documentType && filters.documentType !== 'all') {
        if (!whereClause.document) whereClause.document = {};
        whereClause.document.document_type = filters.documentType;
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
              description: true,
              processType: {
                select: {
                  process_type_id: true,
                  code: true,
                  name: true,
                  description: true,
                  duration_value: true,
                  duration_unit: true
                }
              }
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

      // Get document status and creation information to determine if document is completed and calculate durations
      const documentStatuses = await prisma.document.findMany({
        where: {
          document_id: {
            in: documentIds
          }
        },
        select: {
          document_id: true,
          status: true,
          created_at: true
        }
      });

      // Get all trails for duration calculation, grouped by document
      const allTrailsByDocument = await prisma.documentTrail.findMany({
        where: {
          document_id: {
            in: documentIds
          }
        },
        select: {
          trail_id: true,
          document_id: true,
          action_date: true
        },
        orderBy: {
          action_date: 'asc'
        }
      });

      // Create maps for document workflow, status, and trail durations
      const documentWorkflowMap = new Map<string, any>();
      const documentStatusMap = new Map<string, string>();
      const documentCreatedAtMap = new Map<string, Date>();
      const trailDurationMap = new Map<string, number>(); // trail_id -> duration in ms

      documentDetails.forEach(detail => {
        documentWorkflowMap.set(detail.document_id, detail.work_flow_id);
      });

      documentStatuses.forEach(doc => {
        documentStatusMap.set(doc.document_id, doc.status);
        documentCreatedAtMap.set(doc.document_id, doc.created_at);
      });

      // Calculate duration for each trail (time held before next action)
      const trailsByDoc = new Map<string, typeof allTrailsByDocument>();
      allTrailsByDocument.forEach(trail => {
        if (!trailsByDoc.has(trail.document_id)) {
          trailsByDoc.set(trail.document_id, []);
        }
        trailsByDoc.get(trail.document_id)!.push(trail);
      });

      // For each document, calculate duration only for meaningful transfers
      // Duration is calculated when:
      // 1. There's a next trail (not the last one)
      // 2. The trail represents a user holding the document before releasing it
      trailsByDoc.forEach((docTrails, documentId) => {
        for (let i = 0; i < docTrails.length - 1; i++) {
          const currentTrail = docTrails[i];
          const nextTrail = docTrails[i + 1];
          
          // Calculate duration: time from current action to next action
          const currentTime = new Date(currentTrail.action_date).getTime();
          const nextTime = new Date(nextTrail.action_date).getTime();
          const duration = nextTime - currentTime;
          
          // Store duration for this trail (time held before next action)
          trailDurationMap.set(currentTrail.trail_id, duration);
        }
        
        // For the last trail, calculate duration to now if status indicates it's still in progress
        if (docTrails.length > 0) {
          const lastTrail = docTrails[docTrails.length - 1];
          const currentTime = new Date(lastTrail.action_date).getTime();
          const nowTime = new Date().getTime();
          const duration = nowTime - currentTime;
          
          // Only set duration for last trail if document is not completed/archived/deleted
          trailDurationMap.set(lastTrail.trail_id, duration);
        }
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

        // Get duration for this trail (time held before next action)
        const durationMs = trailDurationMap.get(trail.trail_id) || null;

        // Get document creation date for total duration calculation
        const documentCreatedAt = documentCreatedAtMap.get(trail.document_id);

        return {
          id: trail.trail_id,
          documentId: trail.document_id,
          documentTitle: trail.document?.title || 'Unknown Document',
          documentCode: trail.document?.document_code || 'N/A',
          documentType: trail.document?.document_type || 'Unknown',
          documentDescription: trail.document?.description || '',
          processType: trail.document?.processType ? {
            id: trail.document.processType.process_type_id,
            code: trail.document.processType.code,
            name: trail.document.processType.name,
            description: trail.document.processType.description || '',
            durationValue: trail.document.processType.duration_value,
            durationUnit: trail.document.processType.duration_unit
          } : null,
          status: finalStatus,
          actionName: trail.documentAction?.action_name || '',
          fromDepartment: trail.fromDept?.name || 'Unknown',
          toDepartment: trail.toDept?.name || 'Unknown',
          user: `${trail.user?.first_name || ''} ${trail.user?.last_name || ''}`.trim() || 'Unknown User',
          actionDate: trail.action_date.toISOString(),
          createdAt: trail.created_at.toISOString(),
          updatedAt: trail.updated_at.toISOString(),
          remarks: trail.remarks || '',
          isOwned,
          durationMs, // Time held in this stage before next action
          documentCreatedAt: documentCreatedAt?.toISOString() || null // Document creation date for total duration
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
          created_at: true,
          processType: {
            select: {
              process_type_id: true,
              code: true,
              name: true,
              description: true,
              duration_value: true,
              duration_unit: true
            }
          }
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
          action_date: 'desc'
        }
      });

      const documentInfo = {
        id: documentId,
        title: document?.title || 'Unknown Document',
        code: document?.document_code || 'N/A',
        type: document?.document_type || 'Unknown',
        classification: document?.classification || 'simple',
        status: document?.status || 'pending',
        createdAt: document?.created_at ? document.created_at.toISOString() : new Date().toISOString(),
        processType: document?.processType ? {
          id: document.processType.process_type_id,
          code: document.processType.code,
          name: document.processType.name,
          description: document.processType.description || '',
          durationValue: document.processType.duration_value,
          durationUnit: document.processType.duration_unit
        } : null
      };

      // Sort trails in chronological order (oldest first) for duration calculation
      const sortedTrails = [...trails].sort((a, b) => 
        new Date(a.action_date).getTime() - new Date(b.action_date).getTime()
      );

      const trailDetails = sortedTrails.map((trail, index) => {
        // Calculate duration to next trail (time spent in this stage)
        let durationToNext: number | null = null;
        if (index < sortedTrails.length - 1) {
          const currentTime = new Date(trail.action_date).getTime();
          const nextTime = new Date(sortedTrails[index + 1].action_date).getTime();
          durationToNext = nextTime - currentTime; // Duration in milliseconds
        } else {
          // For the last trail, calculate duration to now
          const currentTime = new Date(trail.action_date).getTime();
          const nowTime = new Date().getTime();
          durationToNext = nowTime - currentTime;
        }

        return {
          id: trail.trail_id,
          documentId: trail.document_id,
          actionDate: trail.action_date.toISOString(),
          createdAt: trail.created_at.toISOString(),
          updatedAt: trail.updated_at.toISOString(),
          actionName: trail.documentAction?.action_name || '',
          user: `${trail.user?.first_name || ''} ${trail.user?.last_name || ''}`.trim() || 'Unknown User',
          fromDepartment: trail.fromDept?.name || 'Unknown',
          toDepartment: trail.toDept?.name || 'Unknown',
          status: trail.status,
          remarks: trail.remarks || '',
          durationMs: durationToNext
        };
      });

      // Reverse back to descending order for display
      trailDetails.reverse();

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
