import { prisma } from '../lib/prisma';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { DocumentService } from './document.service';
import { DocumentTrailsService } from './document-trails.service';
import { getSocketInstance } from '../socket';

interface PaginationParams {
  page: number;
  limit: number;
}

interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class IntransitService {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  /**
   * Get incoming in-transit documents for a user's department
   * These are documents being sent TO the user's department from other departments
   */
  async getIncomingDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      console.log('📍 [getIncomingDocuments] Request:', { userId, page, limit });

      // Get the user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      console.log('📍 [getIncomingDocuments] User department:', user.department_id);

      // Get all document additional details
      const documentDetails = await prisma.documentAdditionalDetails.findMany({
        select: {
          document_id: true,
          work_flow_id: true,
          received_by_departments: true
        }
      });
      const documentDetailsMap = new Map<string, any>();
      documentDetails.forEach((detail: any) => {
        documentDetailsMap.set(detail.document_id, detail);
      });

      // Filter documents that are incoming to user's department
      // Incoming means: department is in workflow AND NOT the originator AND NOT yet received
      const incomingDocumentIds = documentDetails
        .filter((detail: any) => {
          if (!detail.work_flow_id) return false;

          try {
            let workflowDepartments: string[] = [];

            if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
              // New format: object with keys like "first", "second", etc.
              workflowDepartments = Object.values(detail.work_flow_id);
            } else if (typeof detail.work_flow_id === 'string') {
              // Could be either a JSON string of an array or a JSON string of an object
              const parsed = JSON.parse(detail.work_flow_id);
              if (Array.isArray(parsed)) {
                workflowDepartments = parsed;
              } else {
                // If it's an object, get its values
                workflowDepartments = Object.values(parsed);
              }
            } else if (Array.isArray(detail.work_flow_id)) {
              // Old format: array
              workflowDepartments = detail.work_flow_id;
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is in workflow but NOT the first (not originator)
            const isInWorkflow = workflowDepartments.includes(user.department_id);
            const isNotOriginator = workflowDepartments.length > 0 && workflowDepartments[0] !== user.department_id;  // The first department is the originator

            // Check if not yet received by this department
            let receivedByDepartments: string[] = [];
            if (detail.received_by_departments) {
              try {
                receivedByDepartments = Array.isArray(detail.received_by_departments)
                  ? detail.received_by_departments
                  : JSON.parse(detail.received_by_departments as any);
              } catch (e) {
                console.error('📍 [getIncomingDocuments] Error parsing received_by_departments:', e);
              }
            }

            const notYetReceived = !receivedByDepartments.includes(user.department_id);

            return isInWorkflow && isNotOriginator && notYetReceived;
          } catch (e) {
            console.error('📍 [getIncomingDocuments] Error parsing work_flow_id:', e);
            return false;
          }
        })
        .map((detail: any) => detail.document_id);

      console.log('📍 [getIncomingDocuments] Incoming document IDs:', incomingDocumentIds.length);

      if (incomingDocumentIds.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      const departmentNameCache = new Map<string, string>();
      const accountNameCache = new Map<string, string>();

      const getDepartmentName = async (departmentId?: string | null) => {
        if (!departmentId) return 'N/A';
        if (departmentNameCache.has(departmentId)) {
          return departmentNameCache.get(departmentId)!;
        }

        const department = await prisma.department.findUnique({
          where: { department_id: departmentId },
          select: { name: true }
        });
        const departmentName = department?.name ?? 'N/A';
        departmentNameCache.set(departmentId, departmentName);
        return departmentName;
      };

      const getAccountOwnerName = async (accountId?: string | null) => {
        if (!accountId) return 'N/A';
        if (accountNameCache.has(accountId)) {
          return accountNameCache.get(accountId)!;
        }

        const ownerAccount = await prisma.account.findUnique({
          where: { account_id: accountId },
          select: {
            user: {
              select: { first_name: true, last_name: true }
            }
          }
        });

        const ownerName = ownerAccount?.user
          ? `${ownerAccount.user.first_name} ${ownerAccount.user.last_name}`
          : 'N/A';
        accountNameCache.set(accountId, ownerName);
        return ownerName;
      };

      // Get documents with status 'intransit' or 'dispatch' that are incoming
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: incomingDocumentIds
            },
            status: {
              in: ['intransit', 'dispatch']
            }
          },
          include: {
            files: true
          },
          orderBy: {
            created_at: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.document.count({
          where: {
            document_id: {
              in: incomingDocumentIds
            },
            status: {
              in: ['intransit', 'dispatch']
            }
          }
        })
      ]);

      console.log('📍 [getIncomingDocuments] Documents fetched:', documents.length, 'Total:', total);

      // Transform to frontend format
      const transformedDocuments = await Promise.all(
        documents.map(async (doc) => {
          const detail = documentDetailsMap.get(doc.document_id);
          const workflowDepartments = detail ? this.parseWorkflowDepartments(detail.work_flow_id) : [];
          const originatorDeptId = workflowDepartments.length > 0 ? workflowDepartments[0] : null;
          const contactOrganization = await getDepartmentName(originatorDeptId);

          let contactPerson = 'N/A';
          if (doc.files && doc.files.length > 0) {
            const sortedFiles = [...doc.files].sort(
              (a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
            );
            const firstFile = sortedFiles[0];
            if (firstFile?.uploaded_by) {
              contactPerson = await getAccountOwnerName(firstFile.uploaded_by);
            }
          }

          // Generate QR code
          let qrCode = '';
          try {
            qrCode = await QRCode.toDataURL(doc.document_code || doc.document_id, {
              width: 100,
              margin: 1
            });
          } catch (err) {
            console.error('QR Code generation error:', err);
          }

          // Generate barcode
          let barcode = '';
          try {
            const canvas = await bwipjs.toBuffer({
              bcid: 'code128',
              text: doc.document_code || doc.document_id,
              scale: 2,
              height: 10,
              includetext: false
            });
            barcode = `data:image/png;base64,${canvas.toString('base64')}`;
          } catch (err) {
            console.error('Barcode generation error:', err);
          }

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title,
            documentId: doc.document_code,
            contactPerson,
            contactOrganization,
            type: 'General',
            classification: doc.classification,
            status: doc.status, // Use actual document status instead of hardcoded 'incoming'
            activity: 'incoming',
            activityTime: doc.created_at.toISOString()
          };
        })
      );

      return {
        data: transformedDocuments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('📍 [getIncomingDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Get outgoing in-transit documents from a user's department
   * These are documents the user's department created and sent to other departments
   */
  async getOutgoingDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      console.log('📍 [getOutgoingDocuments] Request:', { userId, page, limit });

      // Get the user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      console.log('📍 [getOutgoingDocuments] User department:', user.department_id);

      // Get all document additional details
      const documentDetails = await prisma.documentAdditionalDetails.findMany({
        select: {
          document_id: true,
          work_flow_id: true
        }
      });
      const documentDetailsMap = new Map<string, any>();
      documentDetails.forEach((detail: any) => {
        documentDetailsMap.set(detail.document_id, detail);
      });

      // Filter documents that are outgoing from user's department
      // Outgoing means: department is the originator AND sent to other departments
      const outgoingDocumentIds = documentDetails
        .filter((detail: any) => {
          if (!detail.work_flow_id) return false;

          try {
            let workflowDepartments: string[] = [];

            if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
              // New format: object with keys like "first", "second", etc.
              workflowDepartments = Object.values(detail.work_flow_id);
            } else if (typeof detail.work_flow_id === 'string') {
              // Could be either a JSON string of an array or a JSON string of an object
              const parsed = JSON.parse(detail.work_flow_id);
              if (Array.isArray(parsed)) {
                workflowDepartments = parsed;
              } else {
                // If it's an object, get its values
                workflowDepartments = Object.values(parsed);
              }
            } else if (Array.isArray(detail.work_flow_id)) {
              // Old format: array
              workflowDepartments = detail.work_flow_id;
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is the first (originator) AND workflow has more than 1 dept (sent to others)
            const isOriginator = workflowDepartments.length > 0 && workflowDepartments[0] === user.department_id;
            const sentToOthers = workflowDepartments.length > 1;

            return isOriginator && sentToOthers;
          } catch (e) {
            console.error('📍 [getOutgoingDocuments] Error parsing work_flow_id:', e);
            return false;
          }
        })
        .map((detail: any) => detail.document_id);

      console.log('📍 [getOutgoingDocuments] Outgoing document IDs:', outgoingDocumentIds.length);

      if (outgoingDocumentIds.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      const departmentNameCache = new Map<string, string>();
      const accountNameCache = new Map<string, string>();

      const getDepartmentName = async (departmentId?: string | null) => {
        if (!departmentId) return 'N/A';
        if (departmentNameCache.has(departmentId)) {
          return departmentNameCache.get(departmentId)!;
        }

        const department = await prisma.department.findUnique({
          where: { department_id: departmentId },
          select: { name: true }
        });
        const departmentName = department?.name ?? 'N/A';
        departmentNameCache.set(departmentId, departmentName);
        return departmentName;
      };

      const getAccountOwnerName = async (accountId?: string | null) => {
        if (!accountId) return 'N/A';
        if (accountNameCache.has(accountId)) {
          return accountNameCache.get(accountId)!;
        }

        const ownerAccount = await prisma.account.findUnique({
          where: { account_id: accountId },
          select: {
            user: {
              select: { first_name: true, last_name: true }
            }
          }
        });

        const ownerName = ownerAccount?.user
          ? `${ownerAccount.user.first_name} ${ownerAccount.user.last_name}`
          : 'N/A';
        accountNameCache.set(accountId, ownerName);
        return ownerName;
      };

      // Get documents that originated from the user's department and are in active workflow state
      // This includes documents that are dispatched, in transit, or have been received but not yet completed
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: outgoingDocumentIds
            },
            status: {
              not: { in: ['completed', 'canceled', 'deleted'] }
            }
          },
          include: {
            files: true
          },
          orderBy: {
            created_at: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.document.count({
          where: {
            document_id: {
              in: outgoingDocumentIds
            },
            status: {
              not: { in: ['completed', 'canceled', 'deleted'] }
            }
          }
        })
      ]);

      console.log('📍 [getOutgoingDocuments] Documents fetched:', documents.length, 'Total:', total);

      // Transform to frontend format
      const transformedDocuments = await Promise.all(
        documents.map(async (doc) => {
          const detail = documentDetailsMap.get(doc.document_id);
          const workflowDepartments = detail ? this.parseWorkflowDepartments(detail.work_flow_id) : [];
          const originatorDeptId = workflowDepartments.length > 0 ? workflowDepartments[0] : null;
          const contactOrganization = await getDepartmentName(originatorDeptId);

          let contactPerson = 'N/A';
          if (doc.files && doc.files.length > 0) {
            const sortedFiles = [...doc.files].sort(
              (a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
            );
            const firstFile = sortedFiles[0];
            if (firstFile?.uploaded_by) {
              contactPerson = await getAccountOwnerName(firstFile.uploaded_by);
            }
          }

          // Generate QR code
          let qrCode = '';
          try {
            qrCode = await QRCode.toDataURL(doc.document_code || doc.document_id, {
              width: 100,
              margin: 1
            });
          } catch (err) {
            console.error('QR Code generation error:', err);
          }

          // Generate barcode
          let barcode = '';
          try {
            const canvas = await bwipjs.toBuffer({
              bcid: 'code128',
              text: doc.document_code || doc.document_id,
              scale: 2,
              height: 10,
              includetext: false
            });
            barcode = `data:image/png;base64,${canvas.toString('base64')}`;
          } catch (err) {
            console.error('Barcode generation error:', err);
          }

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title,
            documentId: doc.document_code,
            contactPerson,
            contactOrganization,
            type: 'General',
            classification: doc.classification,
            status: doc.status, // Use actual document status instead of hardcoded 'sent'
            activity: 'sent',
            activityTime: doc.created_at.toISOString()
          };
        })
      );

      return {
        data: transformedDocuments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('📍 [getOutgoingDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Complete a document workflow - marks document as completed
   */
  async completeDocument(documentId: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    try {
      // Get user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify document exists and get its additional details
      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: {
          DocumentAdditionalDetails: true
        }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Update document status to completed
      await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'completed',
          updated_at: new Date()
        }
      });

      // Create a document trail entry for document completion
      const documentTrailsService = new DocumentTrailsService();
      try {
        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: user.department_id,
          to_department: user.department_id, // For completion, from and to can be same
          user_id: userId,
          status: 'completed',
          remarks: `Document completed by ${user.first_name} ${user.last_name}`
        });
      } catch (error) {
        console.error('Error creating document trail for document completion:', error);
      }

      // Emit socket event to notify frontends of document completion
      const io = getSocketInstance();
      if (io) {
        io.emit('documentUpdated', {
          documentId: documentId,
          status: 'completed',
          updatedBy: userId,
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        message: 'Document completed successfully',
        documentId: documentId
      };
    } catch (error) {
      console.error('Error completing document:', error);
      throw error;
    }
  }

  private parseWorkflowDepartments(workflow: any): string[] {
    if (!workflow) return [];

    try {
      if (Array.isArray(workflow)) {
        return workflow as string[];
      }

      if (typeof workflow === 'string') {
        const parsed = JSON.parse(workflow);
        return Array.isArray(parsed) ? parsed : Object.values(parsed);
      }

      if (typeof workflow === 'object' && workflow !== null) {
        return Object.values(workflow as Record<string, string>);
      }
    } catch (error) {
      console.error('?? [IntransitService] Error parsing work_flow_id:', error);
    }

    return [];
  }

  /**
   * Update a document and create a trail for major changes
   */
  async updateDocumentWithTrail(
    documentId: string,
    userId: string,
    updateData: {
      title?: string;
      description?: string;
      document_type?: string;
      classification?: string;
      status?: string;
      remarks?: string;
    }
  ) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    try {
      // Get user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get the document before update to capture previous values
      const documentBefore = await prisma.document.findUnique({
        where: { document_id: documentId }
      });

      if (!documentBefore) {
        throw new Error('Document not found');
      }

      // Update the document
      const updatedDocument = await prisma.document.update({
        where: { document_id: documentId },
        data: updateData as any
      });

      // Determine the status for the trail based on what was updated
      const statusForTrail = updateData.status || updatedDocument.status;

      // Create a document trail entry for the update
      const documentTrailsService = new DocumentTrailsService();
      try {
        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: user.department_id, // From the department of the user making the change
          to_department: user.department_id, // For an edit, the user's department is where change occurred
          user_id: userId,
          status: statusForTrail,
          remarks: updateData.remarks || `Document updated by ${user.first_name} ${user.last_name}: ${Object.keys(updateData).join(', ')}`
        });
      } catch (error) {
        console.error('Error creating document trail for document update:', error);
      }

      return {
        success: true,
        message: 'Document updated successfully with trail',
        documentId: documentId,
        updatedDocument
      };
    } catch (error) {
      console.error('Error updating document with trail:', error);
      throw error;
    }
  }
}
