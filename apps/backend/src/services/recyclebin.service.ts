import { prisma } from '../lib/prisma';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { getSocketInstance } from '../socket';
import { DocumentTrailsService } from './document-trails.service';

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

export class RecycleBinService {
  /**
   * Get recycle bin documents (soft-deleted documents) for a user's department
   */
  async getRecycleBinDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      console.log('📍 [getRecycleBinDocuments] Request:', { userId, page, limit });

      // Get the user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      console.log('📍 [getRecycleBinDocuments] User department:', user.department_id);

      // Get all document additional details
      const documentDetails = await prisma.documentAdditionalDetails.findMany({
        select: {
          document_id: true,
          work_flow_id: true
        }
      });

      // Filter deleted documents that are in user's workflow
      const deletedDocumentIds = documentDetails
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

            // Check if user's department is in the workflow
            return workflowDepartments.includes(user.department_id);
          } catch (e) {
            console.error('📍 [getRecycleBinDocuments] Error parsing work_flow_id:', e);
            return false;
          }
        })
        .map((detail: any) => detail.document_id);

      console.log('📍 [getRecycleBinDocuments] Deleted document IDs in workflow:', deletedDocumentIds.length);

      if (deletedDocumentIds.length === 0) {
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

      const parseWorkflowDepartments = (workflow: any): string[] => {
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
          console.error('?? [getRecycleBinDocuments] Error parsing work_flow_id:', error);
        }

        return [];
      };

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

      // Get deleted documents
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: deletedDocumentIds
            },
            status: 'deleted'
          },
          include: {
            files: true,
            DocumentAdditionalDetails: true
          },
          orderBy: {
            updated_at: 'desc' // Use updated_at since that's when it was deleted
          },
          skip,
          take: limit
        }),
        prisma.document.count({
          where: {
            document_id: {
              in: deletedDocumentIds
            },
            status: 'deleted'
          }
        })
      ]);

      console.log('📍 [getRecycleBinDocuments] Documents fetched:', documents.length, 'Total:', total);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const documentTypeIds = [...new Set(documents.map(doc => doc.document_type).filter(id => id && uuidRegex.test(id)))];
      const documentTypes = await prisma.documentType.findMany({
        where: { type_id: { in: documentTypeIds } },
        select: { type_id: true, name: true }
      });
      const documentTypeMap = new Map(documentTypes.map(dt => [dt.type_id, dt.name]));

      const transformedDocuments = await Promise.all(
        documents.map(async (doc) => {
          const detail = doc.DocumentAdditionalDetails?.[0];
          const workflowDepartments = detail ? parseWorkflowDepartments(detail.work_flow_id) : [];
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
          } else if (detail?.account_id) {
            contactPerson = await getAccountOwnerName(detail.account_id);
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

          // Get deleted by user info if deleted_by exists
          let deletedByInfo = 'N/A';
          if (detail && detail.deleted_by) {
            try {
              const deletedByAccount = await prisma.account.findUnique({
                where: { account_id: detail.deleted_by },
                include: {
                  user: {
                    select: {
                      first_name: true,
                      last_name: true
                    }
                  }
                }
              });
              if (deletedByAccount && deletedByAccount.user) {
                deletedByInfo = `${deletedByAccount.user.first_name} ${deletedByAccount.user.last_name}`;
              }
            } catch (error) {
              console.error('Error fetching deleted by user info:', error);
            }
          }

          // Get restored by user info if restored_by exists
          let restoredByInfo = undefined;
          if (detail && detail.restored_by) {
            try {
              const restoredByAccount = await prisma.account.findUnique({
                where: { account_id: detail.restored_by },
                include: {
                  user: {
                    select: {
                      first_name: true,
                      last_name: true
                    }
                  }
                }
              });
              if (restoredByAccount && restoredByAccount.user) {
                restoredByInfo = `${restoredByAccount.user.first_name} ${restoredByAccount.user.last_name}`;
              }
            } catch (error) {
              console.error('Error fetching restored by user info:', error);
            }
          }

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title || 'Untitled',
            documentId: doc.document_code || doc.document_id,
            contactPerson,
            contactOrganization,
            currentLocation: 'Recycle Bin',
            type: documentTypeMap.get(doc.document_type) || (doc as any).document_type || 'General',
            classification: doc.classification,
            status: 'deleted',
            activity: 'deleted',
            activityTime: doc.updated_at.toISOString(),
            deletedBy: deletedByInfo,
            deletedAt: detail?.deleted_at ? detail.deleted_at.toISOString() : doc.updated_at.toISOString(),
            restoredBy: restoredByInfo,
            restoredAt: detail?.restored_at ? detail.restored_at.toISOString() : undefined,
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
      console.error('📍 [getRecycleBinDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Restore a document from recycle bin
   */
  async restoreDocument(id: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid document ID format');
    }

    try {
      console.log('📍 [restoreDocument] Attempting to restore document:', id, 'by user:', userId);

      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if document exists and is in recycle bin
      const existingDocument = await prisma.document.findUnique({
        where: { document_id: id }
      });

      if (!existingDocument) {
        throw new Error('Document not found');
      }

      // Check if document is actually in the recycle bin (has been soft deleted)
      const isDeleted = existingDocument.status === 'deleted';

      if (!isDeleted) {
        throw new Error('Document is not in recycle bin and cannot be restored');
      }

      // Additional check: ensure DocumentAdditionalDetails exists
      const existingDetails = await prisma.documentAdditionalDetails.findFirst({
        where: { document_id: id }
      });

      if (!existingDetails) {
        throw new Error('Document details not found');
      }

      await prisma.$transaction(async (tx) => {
        // Update document status back to 'dispatch' (default) or the original status before deletion
        // For now we'll set it back to 'dispatch' which is the default status
        await tx.document.update({
          where: { document_id: id },
          data: {
            status: 'dispatch', // Restore to initial status
            updated_at: new Date(),
          },
        });

        // Update document additional details to set restored_at, restored_by
        // We keep deleted_by and deleted_at as they represent when the document was originally deleted
        await tx.documentAdditionalDetails.updateMany({
          where: { document_id: id },
          data: {
            restored_by: user.account_id, // Set the user who restored the document
            restored_at: new Date(), // Set the timestamp when document was restored
          },
        });
      });

      // Create a document trail entry for document restoration from recycle bin
      const documentTrailsService = new DocumentTrailsService();
      try {
        // Get user's department to include in trail
        const userDetail = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { department_id: true }
        });

        await documentTrailsService.createDocumentTrail({
          document_id: id,
          from_department: userDetail?.department_id, // Department of user performing restoration
          to_department: userDetail?.department_id, // Restoration happens in same department
          user_id: userId, // Use the userId who performed the restoration
          status: 'dispatch', // Status is reset to dispatch after restoration
          remarks: `Document restored from recycle bin: ${existingDocument.title}`
        });
      } catch (error) {
        console.error('Error creating document trail for document restoration from recycle bin:', error);
      }

      // Emit socket event to notify frontends of document restoration
      const io = getSocketInstance();
      io.emit('documentRestored', {
        documentId: id,
        restored_at: new Date(),
        restored_by: userId
      });

      console.log('📍 [restoreDocument] Document successfully restored:', id);
      return true;
    } catch (error: any) {
      console.error('📍 [restoreDocument] Error:', error);
      throw error;
    }
  }

  /**
   * Cancel a document workflow - marks document as canceled
   */
  async cancelDocument(documentId: string, userId: string) {
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

      // Update document status to canceled
      await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'canceled',
          updated_at: new Date()
        }
      });

      // Create a document trail entry for document cancellation
      const documentTrailsService = new DocumentTrailsService();
      try {
        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: user.department_id,
          to_department: user.department_id, // For cancellation, from and to can be same
          user_id: userId,
          status: 'canceled',
          remarks: `Document canceled by ${user.first_name} ${user.last_name}`
        });
      } catch (error) {
        console.error('Error creating document trail for document cancellation:', error);
      }

      return {
        success: true,
        message: 'Document canceled successfully',
        documentId: documentId
      };
    } catch (error) {
      console.error('Error canceling document:', error);
      throw error;
    }
  }

  /**
   * Move a document to recycle bin (soft delete) - marks document as deleted
   */
  async deleteDocument(documentId: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    try {
      // Get user's department and account info
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true, account_id: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify document exists
      const document = await prisma.document.findUnique({
        where: { document_id: documentId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Update document status to deleted
      await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'deleted',
          updated_at: new Date()
        }
      });

      // Update DocumentAdditionalDetails to set deleted_at and deleted_by
      const existingDetails = await prisma.documentAdditionalDetails.findFirst({
        where: { document_id: documentId }
      });

      if (existingDetails) {
        await prisma.documentAdditionalDetails.update({
          where: { detail_id: existingDetails.detail_id },
          data: {
            deleted_at: new Date(),
            deleted_by: user.account_id, // Use account_id instead of user_id
            updated_at: new Date()
          }
        });
      } else {
        // If no detail exists, create one
        await prisma.documentAdditionalDetails.create({
          data: {
            document_id: documentId,
            deleted_at: new Date(),
            deleted_by: user.account_id, // Use account_id instead of user_id
            account_id: user.account_id
          }
        });
      }

      // Create a document trail entry for document deletion/moving to recycle bin
      const documentTrailsService = new DocumentTrailsService();
      try {
        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: user.department_id,
          to_department: user.department_id, // For deletion, from and to can be same
          user_id: userId,
          status: 'deleted',
          remarks: `Document moved to recycle bin by ${user.first_name} ${user.last_name}`
        });
      } catch (error) {
        console.error('Error creating document trail for document deletion:', error);
      }

      return {
        success: true,
        message: 'Document moved to recycle bin successfully',
        documentId: documentId
      };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}
