import { prisma } from '../lib/prisma';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { getSocketInstance } from '../socket';
import { EmailService, DocumentSharedEmailData } from './email.service';
import { NotificationService } from './notification.service';

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

interface SharedDocument {
  id: string;
  qrCode: string;
  barcode: string;
  document: string;
  documentId: string;
  contactPerson: string;
  contactOrganization: string;
  type: string;
  classification: string;
  status: string;
  activity: string;
  activityTime: string;
  checkedOutBy?: any;
  checkedOutAt?: Date | null;
}

export class SharedDocumentService {
  /**
   * Get documents that have been shared to the current user (documents where user is specifically in received_by_users)
   */
  async getSharedDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      console.log('📍 [getSharedDocuments] Request:', { userId, page, limit });

      // Get the user's information
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          department_id: true,
          first_name: true,
          last_name: true,
          account: {
            select: {
              email: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      console.log('📍 [getSharedDocuments] User ID:', userId);
      console.log('📍 [getSharedDocuments] User department:', user.department_id);
      console.log('📍 [getSharedDocuments] User email:', user.account?.email);

      // Get all document additional details - get ALL details to ensure we have complete data
      const allDocumentDetails = await prisma.documentAdditionalDetails.findMany({
        include: {
          Document: true  // Include the related document to verify status
        }
      });

      console.log('📍 [getSharedDocuments] Total document details found:', allDocumentDetails.length);

      // Filter documents that have been specifically shared to this user
      // Look for the user ID in received_by_departments field (which we're now using for user IDs)
      const sharedDocumentDetails = allDocumentDetails.filter((detail: any) => {
        // Check if document is not deleted
        if (detail.Document?.status === 'deleted') {
          console.log('📍 [getSharedDocuments] Document is deleted, skipping:', detail.document_id);
          return false;
        }

        let receivedByUsers: string[] = [];

        // Handle different possible formats of received_by_departments (which now stores user IDs)
        if (Array.isArray(detail.received_by_departments)) {
          receivedByUsers = detail.received_by_departments as string[];
          console.log('📍 [getSharedDocuments] Document received_by_users (array):', detail.document_id, receivedByUsers);
        } else if (typeof detail.received_by_departments === 'string' && detail.received_by_departments) {
          try {
            receivedByUsers = JSON.parse(detail.received_by_departments);
            console.log('📍 [getSharedDocuments] Document received_by_users (parsed):', detail.document_id, receivedByUsers);
          } catch (e) {
            console.error('📍 [getSharedDocuments] Error parsing received_by_departments for doc', detail.document_id, e);
            return false;
          }
        } else if (detail.received_by_departments && typeof detail.received_by_departments === 'object') {
          // If it's already parsed as an object/array
          receivedByUsers = detail.received_by_departments as string[];
          console.log('📍 [getSharedDocuments] Document received_by_users (object):', detail.document_id, receivedByUsers);
        } else {
          console.log('📍 [getSharedDocuments] Document has no received_by_users, skipping:', detail.document_id);
          return false; // Document has not been shared to any specific users
        }

        // Check if the current user is in the received_by_users list
        const isSharedToUser = receivedByUsers.includes(userId);

        console.log('📍 [getSharedDocuments] Document:', detail.document_id,
          'isSharedToUser:', isSharedToUser,
          'currentUser:', userId,
          'receivedByUsers:', receivedByUsers);

        return isSharedToUser;
      });

      const sharedDocumentIds = sharedDocumentDetails.map((detail: any) => detail.document_id);

      console.log('📍 [getSharedDocuments] Shared document IDs:', sharedDocumentIds.length, sharedDocumentIds);

      if (sharedDocumentIds.length === 0) {
        console.log('📍 [getSharedDocuments] No shared documents found for user');
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

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: sharedDocumentIds
            },
            status: {
              not: 'deleted' // Exclude deleted documents
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
              in: sharedDocumentIds
            },
            status: {
              not: 'deleted' // Exclude deleted documents from count
            }
          }
        })
      ]);

      console.log('📍 [getSharedDocuments] Documents found:', documents.length, 'Total count:', total);

      // Create a map of document details for quick lookup
      const documentDetailsMap = new Map();
      sharedDocumentDetails.forEach((detail: any) => {
        documentDetailsMap.set(detail.document_id, detail);
      });

      // Transform documents to frontend format with QR codes and barcodes
      const transformedDocuments = await Promise.all(
        documents.map(async (doc) => {
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

          // Get the original creator (first in workflow) to show as contact person
          const detail = documentDetailsMap.get(doc.document_id);
          let contactOrganization = 'N/A';

          if (detail && detail.work_flow_id) {
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

            if (workflowDepartments.length > 0) {
              const originatorDeptId = workflowDepartments[0];  // The "first" department is the originator
              const originatorDept = await prisma.department.findUnique({
                where: { department_id: originatorDeptId },
                select: { name: true }
              });

              if (originatorDept) {
                contactOrganization = originatorDept.name;
              }
            }
          }

          // Get the DocumentType name based on the stored type ID
          let documentTypeName = (doc as any).document_type || 'General';
          if ((doc as any).document_type) {
            const documentType = await prisma.documentType.findUnique({
              where: { type_id: (doc as any).document_type },
              select: { name: true }
            });
            if (documentType) {
              documentTypeName = documentType.name;
            }
          }

          // Get the root owner of the document (the user who first uploaded to this document, typically the creator)
          let contactPerson = 'N/A';
          if (doc.files && doc.files.length > 0) {
            // Sort files by upload date to get the first uploaded file (likely the document creator)
            const sortedFiles = [...doc.files].sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
            const firstUploadedFile = sortedFiles[0]; // First file by upload date

            if (firstUploadedFile && firstUploadedFile.uploaded_by) {
              const uploader = await prisma.user.findUnique({
                where: { user_id: firstUploadedFile.uploaded_by },
                select: { first_name: true, last_name: true }
              });
              if (uploader) {
                contactPerson = `${uploader.first_name} ${uploader.last_name}`;
              }
            }
          }

          // Get checkout information - check if any of the document's files are checked out
          let checkedOutBy = null;
          let checkedOutAt = null;

          // Check if any of the document's files are checked out
          const checkedOutFile = await prisma.userCheckout.findFirst({
            where: {
              file_id: {
                in: doc.files.map((file: any) => file.file_id)
              }
            },
            include: {
              checked_out_by_account: {
                select: {
                  email: true,
                  user: {
                    select: {
                      user_id: true,
                      first_name: true,
                      last_name: true,
                    }
                  }
                }
              }
            }
          });

          if (checkedOutFile) {
            const checkoutUser = checkedOutFile.checked_out_by_account?.user;
            const checkoutEmail = checkedOutFile.checked_out_by_account?.email;

            if (checkoutUser) {
              checkedOutBy = {
                id: checkoutUser.user_id, // Use the user ID for comparison in frontend
                name: `${checkoutUser.first_name} ${checkoutUser.last_name}`,
                email: checkoutEmail
              };
            }
            checkedOutAt = checkedOutFile.checked_out_at;
          }

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: `${doc.title || 'Untitled'} ${doc.document_code ? `(${doc.document_code})` : ''}`.trim(),
            documentId: doc.document_code || doc.document_id,
            contactPerson: contactPerson, // This will now be the root owner (first uploader)
            contactOrganization: contactOrganization,
            type: documentTypeName,
            classification: doc.classification,
            status: doc.status,
            activity: 'shared',
            activityTime: new Date(doc.created_at).toLocaleString(),
            checkedOutBy,
            checkedOutAt,
          };
        })
      );

      console.log('📍 [getSharedDocuments] Returning', transformedDocuments.length, 'documents');
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
      console.error('📍 [getSharedDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Share a document with specific users
   */
  async shareDocument(documentId: string, userId: string, userIds: string[]) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return { success: false, error: 'Invalid document ID format' };
    }

    for (const id of userIds) {
      if (!uuidRegex.test(id)) {
        return { success: false, error: `Invalid user ID format: ${id}` };
      }
    }

    try {
      console.log('📍 [shareDocument] Sharing document:', documentId, 'from user:', userId, 'to users:', userIds);

      // Get the document to verify it exists
      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: {
          DocumentAdditionalDetails: true
        }
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      // Get the current user to verify they have access to this document
      const currentUser = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          department_id: true,
          account: {
            select: {
              account_id: true
            }
          }
        }
      });

      if (!currentUser) {
        return { success: false, error: 'User not found' };
      }

      // Verify the user has access to this document
      // Check if document's workflow includes the user's department
      const currentDetail = document.DocumentAdditionalDetails?.[0];
      let currentWorkflow: string[] = [];
      let currentReceivedByUsers: string[] = [];
      let createdBy: string | null = null;

      if (currentDetail) {
        if (currentDetail.work_flow_id) {
          if (Array.isArray(currentDetail.work_flow_id)) {
            currentWorkflow = currentDetail.work_flow_id as string[];
            console.log('📍 [shareDocument] Current workflow (array):', currentWorkflow);
          } else if (typeof currentDetail.work_flow_id === 'string') {
            try {
              currentWorkflow = JSON.parse(currentDetail.work_flow_id as string);
              console.log('📍 [shareDocument] Current workflow (parsed):', currentWorkflow);
            } catch (e) {
              console.error('📍 [shareDocument] Error parsing work_flow_id:', e);
              // If parsing fails, set an empty array so we can still add new departments
              currentWorkflow = [];
            }
          } else if (typeof currentDetail.work_flow_id === 'object') {
            // Check if it's a valid array-like object
            if (Array.isArray(currentDetail.work_flow_id)) {
              currentWorkflow = currentDetail.work_flow_id as string[];
              console.log('📍 [shareDocument] Current workflow (object array):', currentWorkflow);
            } else {
              console.error('📍 [shareDocument] Unexpected workflow format:', typeof currentDetail.work_flow_id);
              currentWorkflow = [];
            }
          } else {
            // If it's any other format, start with empty array
            console.error('📍 [shareDocument] Unexpected workflow type:', typeof currentDetail.work_flow_id);
            currentWorkflow = [];
          }
        }

        // Track which users specifically received this document (for user-level sharing)
        if (currentDetail.received_by_departments) {
          // Note: This field is named "received_by_departments" in the schema but we'll use it for user IDs
          if (Array.isArray(currentDetail.received_by_departments)) {
            currentReceivedByUsers = currentDetail.received_by_departments as string[];
            console.log('📍 [shareDocument] Current received_by_users (array):', currentReceivedByUsers);
          } else if (typeof currentDetail.received_by_departments === 'string') {
            try {
              currentReceivedByUsers = JSON.parse(currentDetail.received_by_departments as string);
              console.log('📍 [shareDocument] Current received_by_users (parsed):', currentReceivedByUsers);
            } catch (e) {
              console.error('📍 [shareDocument] Error parsing received_by_departments:', e);
              currentReceivedByUsers = [];
            }
          } else if (typeof currentDetail.received_by_departments === 'object' && Array.isArray(currentDetail.received_by_departments)) {
            currentReceivedByUsers = currentDetail.received_by_departments as string[];
            console.log('📍 [shareDocument] Current received_by_users (object array):', currentReceivedByUsers);
          } else {
            console.error('📍 [shareDocument] Unexpected received_by_departments type:', typeof currentDetail.received_by_departments);
            currentReceivedByUsers = [];
          }
        }
      }

      // Check if the user has permission to share this document
      // A user can share a document if:
      // 1. Their department is in the document's workflow, OR
      // 2. They are the creator of the document (first in workflow), OR
      // 3. They have uploaded files to this document, OR
      // 4. They have administrative/superuser permissions
      let userHasAccess = currentWorkflow.includes(currentUser.department_id);
      
      // Check if user is the original creator (first in workflow)
      if (!userHasAccess && currentWorkflow.length > 0 && currentWorkflow[0] === currentUser.department_id) {
        userHasAccess = true;
      }
      
      // Check if user has uploaded files to this document (making them a contributor/owner)
      if (!userHasAccess) {
        const userFiles = await prisma.documentFile.count({
          where: {
            document_id: documentId,
            uploaded_by: currentUser.user_id
          }
        });
        
        if (userFiles > 0) {
          userHasAccess = true;
        }
      }
      
      // Additional check: Allow sharing if the user has special permissions (admin, superuser, etc.)
      if (!userHasAccess) {
        // Check if user has administrative permissions or special document sharing permissions
        // This requires checking user roles/permissions in the system
        const userWithPermissions = await prisma.user.findUnique({
          where: { user_id: currentUser.user_id },
          include: {
            user_roles: {
              include: {
                role: true
              }
            },
            user_permissions: {
              include: {
                permission: true
              }
            }
          }
        });
        
        if (userWithPermissions) {
          // Check if user has administrative privileges through roles
          const hasAdminRole = userWithPermissions.user_roles.some(userRole => 
            userRole.role?.name?.toLowerCase().includes('admin') || 
            userRole.role?.name === 'SuperAdmin'
          );
          
          // Check if user has explicit document sharing permissions
          const hasSharePermission = userWithPermissions.user_permissions.some(userPerm => 
            userPerm.permission?.permission === 'document_write' || 
            userPerm.permission?.permission === 'document_share'
          );
          
          if (hasAdminRole || hasSharePermission) {
            userHasAccess = true;
          }
        }
      }

      if (!userHasAccess) {
        return { success: false, error: 'You do not have permission to share this document' };
      }

      // Check if the target users exist and are active
      const targetUsers = await prisma.user.findMany({
        where: {
          user_id: { in: userIds },
          active: true // Only share with active users
        },
        include: {
          account: {
            select: {
              email: true
            }
          }
        }
      });

      // Check if all requested users were found
      const targetUserIds = targetUsers.map(user => user.user_id);
      const notFoundUserIds = userIds.filter(id => !targetUserIds.includes(id));

      if (notFoundUserIds.length > 0) {
        console.log('📍 [shareDocument] Some users not found or not active:', notFoundUserIds);
        // Instead of failing completely, we can share with the valid users
        // Or we could return an error - let's check what's appropriate
      }

      console.log('📍 [shareDocument] Target users found:', targetUsers.length);

      // Create the updated list of users who received this document
      // Add new users to the existing list
      const updatedReceivedByUsers = [...new Set([...currentReceivedByUsers, ...targetUserIds])];

      console.log('📍 [shareDocument] Original received_by_users:', currentReceivedByUsers);
      console.log('📍 [shareDocument] Target users to add:', targetUserIds);
      console.log('📍 [shareDocument] Updated received_by_users:', updatedReceivedByUsers);

      // Update document details with the new list of users
      // If we already have details for this document, update the existing record
      // Otherwise, create a new record
      if (currentDetail) {
        // Update the existing document details record
        console.log('📍 [shareDocument] Updating existing document details:', currentDetail.detail_id);
        await prisma.documentAdditionalDetails.update({
          where: { detail_id: currentDetail.detail_id },
          data: {
            received_by_departments: updatedReceivedByUsers  // Using the field for user IDs
          }
        });
      } else {
        // No existing details, create a new record
        console.log('📍 [shareDocument] Creating new document details record');
        await prisma.documentAdditionalDetails.create({
          data: {
            document_id: documentId,
            received_by_departments: updatedReceivedByUsers,  // Using the field for user IDs
            work_flow_id: []  // Initialize with empty workflow if not set
          }
        });
      }

      // Get the final state of received_by_users for confirmation
      const finalDetails = await prisma.documentAdditionalDetails.findFirst({
        where: { document_id: documentId },
        select: { received_by_departments: true }
      });
      const finalReceivedBy = Array.isArray(finalDetails?.received_by_departments)
        ? finalDetails.received_by_departments as string[]
        : JSON.parse(finalDetails?.received_by_departments as string || '[]');

      console.log(`Document shared with ${targetUsers.length} user(s): Document ID ${documentId}, User ID ${userId}`);
      console.log('📍 [shareDocument] Document shared successfully with users:', userIds);

      // Emit socket event to notify the sharing user and target users
      const io = getSocketInstance();

      // Emit specific document shared event
      io.emit('documentShared', {
        documentId,
        sharedWith: targetUsers.map(user => user.user_id),
        sharedBy: userId,
        timestamp: new Date()
      });

      // Also emit to specific user rooms for targeted notification
      for (const user of targetUsers) {
        io.to(`user-${user.user_id}`).emit('documentSharedToYou', {
          documentId,
          documentTitle: document.title,
          sharedBy: userId,
          timestamp: new Date()
        });
      }

      // Send notification to target users
      const notificationService = new NotificationService();
      for (const user of targetUsers) {
        try {
          await notificationService.createDocumentSharedNotification(
            user.user_id,
            documentId,
            document.title
          );
        } catch (notificationError) {
          console.error(`Error creating notification for user ${user.user_id}:`, notificationError);
        }
      }

      // Send email notifications to target users
      const emailService = new EmailService();
      
      // Get the name of the user who is sharing the document
      const sharingUser = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          first_name: true,
          last_name: true
        }
      });
      const sharingUserName = sharingUser ? `${sharingUser.first_name} ${sharingUser.last_name}` : 'A user';

      for (const userWithAccount of targetUsers) {
        if (userWithAccount.account?.email) {
          const emailData: DocumentSharedEmailData = {
            recipientEmail: userWithAccount.account.email,
            recipientName: `${userWithAccount.first_name} ${userWithAccount.last_name}`,
            documentTitle: document.title || 'Untitled Document',
            sharedBy: sharingUserName,
            documentUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/documents/${documentId}`,
            message: `A document has been shared with you by ${sharingUserName}.`
          };

          emailService.sendDocumentSharedEmail(emailData).catch(err => {
            console.error(`Failed to send document shared email to ${userWithAccount.account.email}:`, err);
          });
        }
      }

      return {
        success: true,
        message: `Document shared with ${targetUsers.length} user(s) successfully`,
        sharedWith: targetUsers.map(user => ({
          id: user.user_id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.account?.email
        })),
        finalReceivedBy: finalReceivedBy
      };
    } catch (error: any) {
      console.error('📍 [shareDocument] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to share document'
      };
    }
  }
}