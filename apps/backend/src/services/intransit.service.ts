import { prisma } from '../lib/prisma';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { DocumentService } from './document.service';
import { DocumentTrailsService } from './document-trails.service';
import { ProcessStatusService } from './process-status.service';
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
          received_by_departments: true,
          work_flow_status: true
        }
      });
      const documentDetailsMap = new Map<string, any>();
      documentDetails.forEach((detail: any) => {
        documentDetailsMap.set(detail.document_id, detail);
      });

      // Collect all incoming document IDs
      const incomingDocumentIds = new Set<string>();

      // First, get all documents that have been released TO this department via DocumentTrail
      const releasedToThisDepartment = await prisma.documentTrail.findMany({
        where: {
          to_department: user.department_id,
          status: { in: ['intransit', 'pending'] },
          from_department: {
            not: user.department_id // Exclude documents from same department
          },
          OR: [
            { assigned_to_user_id: null },
            { assigned_to_user_id: userId }
          ]
        },
        select: {
          document_id: true,
          from_department: true,
          assigned_to_user_id: true
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      // Add all documents that have been released to this department
      releasedToThisDepartment.forEach(trail => {
        incomingDocumentIds.add(trail.document_id);
      });

      console.log('📍 [getIncomingDocuments] Documents released to department via trail:', releasedToThisDepartment.length);

      // Add documents from workflow analysis (documents in workflow but not yet received)
      for (const detail of documentDetails) {
        if (!detail.work_flow_id) continue;

        try {
          let workflowDepartments: string[] = [];

          if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
            workflowDepartments = Object.values(detail.work_flow_id).filter(val => typeof val === 'string') as string[];
          } else if (typeof detail.work_flow_id === 'string') {
            const parsed = JSON.parse(detail.work_flow_id);
            if (Array.isArray(parsed)) {
              workflowDepartments = parsed;
            } else {
              workflowDepartments = Object.values(parsed).filter(val => typeof val === 'string') as string[];
            }
          } else if (Array.isArray(detail.work_flow_id)) {
            workflowDepartments = detail.work_flow_id;
          } else {
            workflowDepartments = [];
          }

          // Check if user's department is in workflow but NOT the first (not originator)
          const isInWorkflow = workflowDepartments.includes(user.department_id);
          const isNotOriginator = workflowDepartments.length > 0 && workflowDepartments[0] !== user.department_id;

          // Check if document is currently assigned to this department via document trail with 'intransit' status
          const currentIntransitTrail = await prisma.documentTrail.findFirst({
            where: {
              document_id: detail.document_id,
              to_department: user.department_id,
              status: 'intransit',
              OR: [
                { assigned_to_user_id: null },
                { assigned_to_user_id: userId }
              ]
            },
            orderBy: {
              created_at: 'desc'
            }
          });

          // Include document if in workflow, not originator, and has active intransit trail
          if (isInWorkflow && isNotOriginator && currentIntransitTrail) {
            incomingDocumentIds.add(detail.document_id);
          }
        } catch (e) {
          console.error('📍 [getIncomingDocuments] Error processing document:', e);
        }
      }

      // Remove documents that the user has already received IN THE CURRENT TRANSIT CYCLE
      const documentsToCheck = Array.from(incomingDocumentIds);
      for (const docId of documentsToCheck) {
        const latestIntransitTrail = await prisma.documentTrail.findFirst({
          where: {
            document_id: docId,
            to_department: user.department_id,
            status: 'intransit'
          },
          orderBy: {
            created_at: 'desc'
          },
          select: {
            created_at: true
          }
        });

        if (!latestIntransitTrail) {
          incomingDocumentIds.delete(docId);
          continue;
        }

        const receivedAfterIntransit = await prisma.documentTrail.findFirst({
          where: {
            document_id: docId,
            status: 'received',
            user_id: userId,
            to_department: user.department_id,
            created_at: {
              gte: latestIntransitTrail.created_at
            }
          },
          select: { trail_id: true }
        });

        if (receivedAfterIntransit) {
          console.log('📍 [getIncomingDocuments] Document already received by user in current cycle:', docId);
          incomingDocumentIds.delete(docId);
        }
      }

      console.log('📍 [getIncomingDocuments] Incoming document IDs:', incomingDocumentIds.size);

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

      const getDepartmentInfo = async (departmentId?: string | null): Promise<{ code: string; name: string }> => {
        if (!departmentId) return { code: 'N/A', name: 'N/A' };
        if (departmentNameCache.has(departmentId)) {
          const cached = departmentNameCache.get(departmentId)!;
          const [code, name] = cached.split('|');
          return { code: code || name, name };
        }

        const department = await prisma.department.findUnique({
          where: { department_id: departmentId },
          select: { name: true, code: true }
        });
        const code = department?.code || department?.name || 'N/A';
        const name = department?.name || 'N/A';
        departmentNameCache.set(departmentId, `${code}|${name}`);
        return { code, name };
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

      // Get documents with status 'intransit' or 'pending' that are incoming
      // Only show documents that haven't been received yet by this user
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: Array.from(incomingDocumentIds)
            },
            status: {
              in: ['intransit', 'pending'], // Only show intransit/pending
              not: 'received' // Explicitly exclude received documents
            }
          },
          include: {
            files: {
              include: {
                uploaded_by_account: {
                  include: {
                    user: {
                      select: {
                        first_name: true,
                        last_name: true
                      }
                    }
                  }
                }
              },
              orderBy: {
                uploaded_at: 'asc'
              }
            }
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
              in: ['intransit', 'pending'], // Only show intransit/pending
              not: 'received' // Explicitly exclude received documents
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
          const { code: contactOrganization, name: contactOrganizationName } = await getDepartmentInfo(originatorDeptId);

          let contactPerson = 'N/A';
          if (doc.files && doc.files.length > 0) {
            // Files are already ordered by uploaded_at ASC, so first file is the original
            const firstFile = doc.files[0];
            if (firstFile?.uploaded_by_account?.user) {
              contactPerson = `${firstFile.uploaded_by_account.user.first_name} ${firstFile.uploaded_by_account.user.last_name}`;
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

          const workflowStatus = detail
            ? this.parseWorkflowStatus(detail.work_flow_status)
            : {};
          const releaseInfo = this.getLatestReleaseInfo(
            workflowStatus,
            user.department_id
          );

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title,
            documentId: doc.document_code,
            contactPerson,
            contactOrganization,
            contactOrganizationName,
            type: 'General',
            process_type_id: doc.process_type_id,
            classification: doc.classification,
            status: doc.status, // Use actual document status instead of hardcoded 'incoming'
            activity: 'incoming',
            activityTime: doc.created_at.toISOString(),
            created_at: doc.created_at.toISOString(),
            requestAction: releaseInfo?.requestAction || null,
            releaseRemarks: releaseInfo?.remarks || null
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
      // Outgoing means: 
      // 1. Department is the originator AND sent to other departments, OR
      // 2. Department has released/transmitted the document to another department (via DocumentTrail)
      // AND the document is NOT currently assigned back to this department

      // First, get documents released by this department (from DocumentTrail)
      // Get the most recent trail for each document where this department sent it out
      const releasedByDepartment = await prisma.documentTrail.findMany({
        where: {
          from_department: user.department_id,
          to_department: {
            not: user.department_id // Sent to different department
          },
          status: { in: ['intransit', 'pending'] }
        },
        select: {
          document_id: true,
          to_department: true,
          created_at: true
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      // Group by document_id and keep only the latest trail for each document
      const latestTrailsByDoc = new Map<string, any>();
      releasedByDepartment.forEach(trail => {
        if (!latestTrailsByDoc.has(trail.document_id) ||
          new Date(trail.created_at) > new Date(latestTrailsByDoc.get(trail.document_id).created_at)) {
          latestTrailsByDoc.set(trail.document_id, trail);
        }
      });

      const releasedDocumentIds = new Set(latestTrailsByDoc.keys());

      console.log('📍 [getOutgoingDocuments] Documents released by department:', releasedDocumentIds.size);

      const outgoingDocumentIds = await (async () => {
        const ids = new Set<string>();

        // Add documents released by this department
        releasedDocumentIds.forEach(docId => ids.add(docId));

        for (const detail of documentDetails) {
          if (!detail.work_flow_id) continue;
          try {
            let workflowDepartments: string[] = [];

            if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
              // New format: object with keys like "first", "second", etc.
              workflowDepartments = Object.values(detail.work_flow_id).filter(val => typeof val === 'string') as string[];
            } else if (typeof detail.work_flow_id === 'string') {
              // Could be either a JSON string of an array or a JSON string of an object
              const parsed = JSON.parse(detail.work_flow_id);
              if (Array.isArray(parsed)) {
                workflowDepartments = parsed;
              } else {
                // If it's an object, get its values
                workflowDepartments = Object.values(parsed).filter(val => typeof val === 'string') as string[];
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

            // Only add originator documents if they've been sent to others
            if (isOriginator && sentToOthers) {
              ids.add(detail.document_id);
            }
          } catch (e) {
            console.error('📍 [getOutgoingDocuments] Error parsing work_flow_id:', e);
          }
        }

        // Remove documents that are currently assigned back to this department (those should be in incoming)
        // Only remove if the latest trail shows it's coming back TO this department (not going FROM this department)
        const documentsToCheck = Array.from(ids);
        for (const docId of documentsToCheck) {
          // Get all trails for this document
          const allTrails = await prisma.documentTrail.findMany({
            where: {
              document_id: docId,
              status: { in: ['intransit', 'pending'] }
            },
            orderBy: {
              created_at: 'desc'
            }
          });

          if (allTrails.length > 0) {
            const latestTrail = allTrails[0];

            // If the latest trail shows document is coming TO this department (not FROM), 
            // it should be in incoming, not outgoing
            if (latestTrail.to_department === user.department_id &&
              latestTrail.from_department !== user.department_id) {
              ids.delete(docId);
            }
          }
        }

        return Array.from(ids);
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

      const getDepartmentInfo = async (departmentId?: string | null): Promise<{ code: string; name: string }> => {
        if (!departmentId) return { code: 'N/A', name: 'N/A' };
        if (departmentNameCache.has(departmentId)) {
          const cached = departmentNameCache.get(departmentId)!;
          const [code, name] = cached.split('|');
          return { code: code || name, name };
        }

        const department = await prisma.department.findUnique({
          where: { department_id: departmentId },
          select: { name: true, code: true }
        });
        const code = department?.code || department?.name || 'N/A';
        const name = department?.name || 'N/A';
        departmentNameCache.set(departmentId, `${code}|${name}`);
        return { code, name };
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
      // This includes documents that are pending, in transit, or have been received but not yet completed
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: outgoingDocumentIds
            },
            status: {
              notIn: ['completed', 'deleted', 'received', 'cancelled'] // Exclude completed, deleted, received, cancelled
            }
          },
          include: {
            files: {
              include: {
                uploaded_by_account: {
                  include: {
                    user: {
                      select: {
                        first_name: true,
                        last_name: true
                      }
                    }
                  }
                }
              },
              orderBy: {
                uploaded_at: 'asc'
              }
            }
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
              notIn: ['completed', 'deleted', 'received', 'cancelled'] // Exclude completed, deleted, received, cancelled
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
          const { code: contactOrganization, name: contactOrganizationName } = await getDepartmentInfo(originatorDeptId);

          let contactPerson = 'N/A';
          if (doc.files && doc.files.length > 0) {
            // Files are already ordered by uploaded_at ASC, so first file is the original
            const firstFile = doc.files[0];
            if (firstFile?.uploaded_by_account?.user) {
              contactPerson = `${firstFile.uploaded_by_account.user.first_name} ${firstFile.uploaded_by_account.user.last_name}`;
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
            contactOrganizationName,
            type: 'General',
            process_type_id: doc.process_type_id,
            classification: doc.classification,
            status: doc.status, // Use actual document status instead of hardcoded 'sent'
            activity: 'sent',
            activityTime: doc.created_at.toISOString(),
            created_at: doc.created_at.toISOString()
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
          from_department: user!.department_id,
          to_department: user!.department_id, // For completion, from and to can be same
          user_id: userId,
          status: 'completed',
          remarks: `Document completed by ${user!.first_name} ${user!.last_name}`
        });
      } catch (error) {
        console.error('Error creating document trail for document completion:', error);
      }

      // Ensure ProcessStatus reflects completion (in case trail sync did not run)
      try {
        const processStatusService = new ProcessStatusService();
        await processStatusService.syncForDocument(documentId);
      } catch (syncError) {
        console.error('Error syncing ProcessStatus after completion:', syncError);
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
        return workflow.filter(val => typeof val === 'string') as string[];
      }

      if (typeof workflow === 'string') {
        const parsed = JSON.parse(workflow);
        if (Array.isArray(parsed)) {
          return parsed.filter(val => typeof val === 'string') as string[];
        } else {
          return Object.values(parsed).filter(val => typeof val === 'string') as string[];
        }
      }

      if (typeof workflow === 'object' && workflow !== null) {
        return Object.values(workflow).filter(val => typeof val === 'string') as string[];
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

  private parseWorkflowStatus(workflowStatus: any): Record<string, any> {
    if (!workflowStatus) return {};

    if (typeof workflowStatus === 'string') {
      try {
        return this.parseWorkflowStatus(JSON.parse(workflowStatus));
      } catch {
        return {};
      }
    }

    if (Array.isArray(workflowStatus)) {
      return workflowStatus.reduce((acc, entry, index) => {
        if (typeof entry === 'object' && entry) {
          acc[`entry_${index + 1}`] = { ...(entry as any) };
        }
        return acc;
      }, {} as Record<string, any>);
    }

    if (typeof workflowStatus === 'object') {
      return Object.keys(workflowStatus).reduce((acc, key) => {
        const entry = (workflowStatus as Record<string, any>)[key];
        if (typeof entry === 'object' && entry) {
          acc[key] = { ...entry };
        }
        return acc;
      }, {} as Record<string, any>);
    }

    return {};
  }

  private getLatestReleaseInfo(
    workflowStatus: Record<string, any>,
    departmentId: string
  ): { requestAction?: string; remarks?: string } | null {
    const releaseEntries = Object.entries(workflowStatus)
      .filter(([key]) => key.startsWith('released_'))
      .sort(([keyA], [keyB]) =>
        keyA.localeCompare(keyB, undefined, { numeric: true })
      );

    for (let index = releaseEntries.length - 1; index >= 0; index -= 1) {
      const entry = releaseEntries[index][1] || {};
      const targetDepartment =
        entry.to_department_id || entry.toDepartmentId || entry.toDepartment;
      if (targetDepartment === departmentId) {
        return {
          requestAction: entry.request_action || entry.requestAction,
          remarks: entry.remarks
        };
      }
    }

    return null;
  }

  /**
   * Cancel an in-transit document - reverts status back to pending
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

      const isInTransitStatus = ['intransit', 'intransit_signature'].includes(document.status);
      if (!isInTransitStatus && document.status !== 'pending' && document.status !== 'cancelled') {
        throw new Error('Document is not currently in in-transit status');
      }

      const lastIntransitTrail = await prisma.documentTrail.findFirst({
        where: {
          document_id: documentId,
          status: 'intransit'
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      const detail = await prisma.documentAdditionalDetails.findFirst({
        where: { document_id: documentId },
        select: { work_flow_id: true, account_id: true, detail_id: true }
      });

      const isSender = lastIntransitTrail?.user_id === userId;
      const userAccount = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true }
      });
      const isOwner = Boolean(
        detail?.account_id &&
        userAccount?.account_id &&
        userAccount.account_id === detail.account_id
      );

      if (!isSender && !isOwner) {
        throw new Error('Only the document owner or the user who sent the document can cancel this document');
      }

      // If already pending or cancelled, treat as already cancelled
      if (!isInTransitStatus && (document.status === 'pending' || document.status === 'cancelled')) {
        return {
          success: true,
          message: 'Document already cancelled',
          documentId
        };
      }

      // Update document status to 'cancelled'
      const updatedDocument = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'cancelled',
          updated_at: new Date()
        }
      });

      // Clear any received-by users so canceled releases no longer appear in shared lists
      if (detail?.detail_id) {
        try {
          await prisma.documentAdditionalDetails.update({
            where: { detail_id: detail.detail_id },
            data: {
              received_by_departments: [] as any,
              updated_at: new Date()
            }
          });
        } catch (error) {
          console.error('Error clearing received_by_departments on cancel:', error);
        }
      }

      // Create a document trail entry for the cancellation
      const documentTrailsService = new DocumentTrailsService();
      try {
        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: user!.department_id,
          to_department: user!.department_id, // For cancellation, same department
          user_id: userId,
          status: 'canceled',
          remarks: `In-transit document canceled by ${user!.first_name} ${user!.last_name}`
        });

        if (lastIntransitTrail?.to_department) {
          await documentTrailsService.createDocumentTrail({
            document_id: documentId,
            from_department: user!.department_id,
            to_department: lastIntransitTrail.to_department,
            user_id: userId,
            status: 'canceled',
            remarks: `Release canceled by document owner`
          });
        }
      } catch (error) {
        console.error('Error creating document trail for in-transit cancellation:', error);
      }

      // Emit socket event to notify frontends of document status change
      const io = getSocketInstance();
      if (io) {
        io.emit('documentUpdated', {
          documentId: documentId,
          status: 'cancelled',
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
        message: 'In-transit document canceled successfully',
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
          from_department: user!.department_id, // From the department of the user making the change
          to_department: user!.department_id, // For an edit, the user's department is where change occurred
          user_id: userId,
          status: statusForTrail,
          remarks: updateData.remarks || `Document updated by ${user!.first_name} ${user!.last_name}: ${Object.keys(updateData).join(', ')}`
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
