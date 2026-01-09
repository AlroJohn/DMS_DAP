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
          received_by_department_user: true
        }
      });
      const documentDetailsMap = new Map<string, any>();
      documentDetails.forEach((detail: any) => {
        documentDetailsMap.set(detail.document_id, detail);
      });

      // Get all documents that are currently assigned to this department via document trail
      // This includes documents from other departments or documents sent back to this department
      const incomingDocumentIds = new Set<string>();
      for (const detail of documentDetails) {
        const sharedWithUsers = this.parseReceivedByUsers(detail.received_by_department_user);
        const isSharedToUser = sharedWithUsers.includes(userId);

        // Check if the document is currently assigned to this department via document trail
        // This handles cases where a document is sent to this department (whether from others or returned)
        const currentAssignment = await prisma.documentTrail.findFirst({
          where: {
            document_id: detail.document_id,
            to_department: user.department_id,
            status: { in: ['intransit', 'dispatch', 'received'] } // Document is currently assigned to this department
          },
          orderBy: {
            created_at: 'desc'
          }
        });

        const releasedByOtherDepartment =
          currentAssignment?.from_department &&
          currentAssignment.from_department !== user.department_id;

        if ((currentAssignment && releasedByOtherDepartment) || isSharedToUser) {
          // Incoming means released by another department OR explicitly shared to the user.
          incomingDocumentIds.add(detail.document_id);
        }
      }

      console.log('?? [getIncomingDocuments] Incoming document IDs:', incomingDocumentIds.size);

      if (incomingDocumentIds.size === 0) {
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

      // Get documents with status 'intransit', 'dispatch', or 'received' that are incoming
      // Documents that have been received but are still in workflow should appear in incoming
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: Array.from(incomingDocumentIds)
            },
            status: {
              in: ['intransit', 'dispatch', 'received']
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
              in: Array.from(incomingDocumentIds)
            },
            status: {
              in: ['intransit', 'dispatch', 'received']
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
      const outgoingDocumentIds = await (async () => {
        const ids = [];

        for (const detail of documentDetails) {
          if (!detail.work_flow_id) continue;

          try {
            let workflowDepartments: string[] = [];

            if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
              // New format: object with keys like "first", "second", etc.
              workflowDepartments = Object.values(detail.work_flow_id).map(value => String(value));
            } else if (typeof detail.work_flow_id === 'string') {
              // Could be either a JSON string of an array or a JSON string of an object
              const parsed = JSON.parse(detail.work_flow_id);
              if (Array.isArray(parsed)) {
                workflowDepartments = parsed.map(value => String(value));
              } else {
                // If it's an object, get its values
                workflowDepartments = Object.values(parsed).map(value => String(value));
              }
            } else if (Array.isArray(detail.work_flow_id)) {
              // Old format: array
              workflowDepartments = detail.work_flow_id.map(value => String(value));
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is the first (originator) AND workflow has more than 1 dept (sent to others)
            const isOriginator = workflowDepartments.length > 0 && workflowDepartments[0] === user.department_id;
            const sentToOthers = workflowDepartments.length > 1;

            // Only consider it outgoing if it's originated by this department and sent to others
            if (isOriginator && sentToOthers) {
              ids.push(detail.document_id);
            }
          } catch (e) {
            console.error('📍 [getOutgoingDocuments] Error parsing work_flow_id:', e);
          }
        }

        return ids;
      })();

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
              not: { in: ['completed', 'deleted'] }
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
              not: { in: ['completed', 'deleted'] }
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

  private parseReceivedByUsers(receivedByUsers: any): string[] {
    if (!receivedByUsers) return [];

    try {
      if (Array.isArray(receivedByUsers)) {
        return receivedByUsers as string[];
      }

      if (typeof receivedByUsers === 'string') {
        const parsed = JSON.parse(receivedByUsers);
        return Array.isArray(parsed) ? parsed : [];
      }

      if (typeof receivedByUsers === 'object') {
        return Array.isArray(receivedByUsers)
          ? (receivedByUsers as string[])
          : (Object.values(receivedByUsers) as string[]);
      }
    } catch (error) {
      console.error('?? [IntransitService] Error parsing received_by_department_user:', error);
    }

    return [];
  }

  /**
   * Cancel an in-transit document - reverts status back to dispatch
   */
  async cancelIntransitDocument(documentId: string, userId: string) {
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

      // Verify document exists and is currently in 'intransit' status
      const document = await prisma.document.findUnique({
        where: { document_id: documentId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      if (document.status !== 'intransit') {
        throw new Error('Document is not currently in in-transit status');
      }

      // Check if the user's department is the one that released the document
      // We need to check the document trail to determine if the current user's department released it
      const lastTrail = await prisma.documentTrail.findFirst({
        where: {
          document_id: documentId,
          status: 'intransit'
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      if (!lastTrail || lastTrail.from_department !== user.department_id) {
        throw new Error('Only the department that released the document can cancel it');
      }

      // Update document status back to 'dispatch'
      const updatedDocument = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'dispatch',
          updated_at: new Date()
        }
      });

      // Create a document trail entry for the cancellation
      const documentTrailsService = new DocumentTrailsService();
      try {
        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: user.department_id,
          to_department: user.department_id, // For cancellation, same department
          user_id: userId,
          status: 'canceled',
          remarks: `In-transit document canceled by ${user.first_name} ${user.last_name}, status reverted to dispatch`
        });
      } catch (error) {
        console.error('Error creating document trail for in-transit cancellation:', error);
      }

      // Emit socket event to notify frontends of document status change
      const io = getSocketInstance();
      if (io) {
        io.emit('documentUpdated', {
          documentId: documentId,
          status: 'dispatch',
          updatedBy: userId,
          timestamp: new Date().toISOString()
        });

        // Emit specific event for document cancellation
        io.emit('documentCanceled', {
          documentId: documentId,
          documentTitle: document.title,
          canceledBy: userId,
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        message: 'In-transit document canceled successfully, status reverted to dispatch',
        documentId: documentId,
        updatedDocument
      };
    } catch (error) {
      console.error('Error canceling in-transit document:', error);
      throw error;
    }
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


