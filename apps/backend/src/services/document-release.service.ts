import { prisma } from '../lib/prisma';
import { getSocketInstance } from '../socket';
import { EmailService, DocumentReleasedEmailData } from './email.service';
import { NotificationService } from './notification.service';
import { recordReceiveStatus, recordReleaseStatus } from './workflow-status.service';

export class DocumentReleaseService {
  prisma = prisma; // Expose prisma instance for use in controllers

  /**
   * Release a document to another department
   */
  async releaseDocument(
    documentId: string,
    departmentId: string,
    requestAction: string | string[], // Can be a single action or an array of actions
    remarks: string | undefined,
    userId: string
  ) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId) || !uuidRegex.test(departmentId)) {
      throw new Error('Invalid document ID or department ID format');
    }

    try {
      console.log('📍 [DocumentReleaseService.releaseDocument] Releasing document:', documentId, 'to department:', departmentId);

      // Verify document exists and get its additional details
      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: {
          DocumentAdditionalDetails: true
        }
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      const releasingUser = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true }
      });

      // Get the current workflow
      const currentDetail = document.DocumentAdditionalDetails?.[0];
      let currentWorkflow: any = {};

      if (currentDetail && currentDetail.work_flow_id) {
        try {
          // Handle different possible formats of work_flow_id (could be object or JSON string)
          if (typeof currentDetail.work_flow_id === 'object' && currentDetail.work_flow_id !== null) {
            currentWorkflow = currentDetail.work_flow_id;
          } else if (typeof currentDetail.work_flow_id === 'string') {
            currentWorkflow = JSON.parse(currentDetail.work_flow_id);
          }
        } catch (e) {
          console.error('📍 [DocumentReleaseService.releaseDocument] Error parsing work_flow_id:', e);
          // Initialize with empty object
          currentWorkflow = {};
        }
      }

      console.log('📍 [DocumentReleaseService.releaseDocument] Current workflow object:', currentWorkflow);

      // Check if the department is already in the workflow by looking at all values
      const workflowDepartments = Object.values(currentWorkflow);
      if (!workflowDepartments.includes(departmentId)) {
        // Determine the next position in the workflow (first, second, third, etc.)
        let nextPosition = 'second'; // default to second if 'first' exists
        if ('first' in currentWorkflow) {
          // Count existing positions to determine the next key
          const keys = Object.keys(currentWorkflow).sort();
          if (keys.length > 0) {
            // Find the highest positioned key and get the next one
            const lastKey = keys[keys.length - 1];
            const positionMatch = lastKey.match(/(\d+)$/); // Look for numeric suffix like "step1", "step2", etc.
            if (positionMatch) {
              const lastNumber = parseInt(positionMatch[1]);
              nextPosition = `step${lastNumber + 1}`;
            } else {
              // If using names like "first", "second", etc., try to follow the sequence
              if (lastKey === 'first') {
                nextPosition = 'second';
              } else if (lastKey === 'second') {
                nextPosition = 'third';
              } else if (lastKey === 'third') {
                nextPosition = 'fourth';
              } else if (lastKey === 'fourth') {
                nextPosition = 'fifth';
              } else {
                // For other cases, just append a number to "step"
                nextPosition = `step${keys.length + 1}`;
              }
            }
          }
        } else {
          // If 'first' doesn't exist, use 'first' as the position (this would be an edge case)
          nextPosition = 'first';
        }

        // Add the destination department to the workflow with the next position
        currentWorkflow[nextPosition] = departmentId;
        console.log(`📍 [DocumentReleaseService.releaseDocument] Added department at position '${nextPosition}':`, departmentId);
        console.log('📍 [DocumentReleaseService.releaseDocument] Updated workflow object:', currentWorkflow);
      } else {
        console.log('📍 [DocumentReleaseService.releaseDocument] Department already in workflow, skipping');
      }

      // Update document status to intransit (being routed)
      await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'intransit',
          updated_at: new Date()
        }
      });

      // Update DocumentAdditionalDetails with new workflow and pass_to_department
      if (currentDetail) {
        await prisma.documentAdditionalDetails.update({
          where: { detail_id: currentDetail.detail_id },
          data: {
            work_flow_id: currentWorkflow as any,
            remarks: remarks || currentDetail.remarks,
            updated_at: new Date()
          }
        });
        console.log('📍 [DocumentReleaseService.releaseDocument] DocumentAdditionalDetails updated with pass_to_department');
      } else {
        // If no detail exists, create one with the releasing department as 'first'
        // First, get the user's department to set as 'first' in the workflow
        const user = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { department_id: true }
        });

        if (user) {
          const newWorkflow = {
            first: user.department_id,
            second: departmentId
          };

          await prisma.documentAdditionalDetails.create({
            data: {
              document_id: documentId,
              work_flow_id: newWorkflow as any,
              remarks: remarks || null,
              account_id: null // Will be updated with actual account ID when we have the user info
            }
          });
          console.log('📍 [DocumentReleaseService.releaseDocument] Created new DocumentAdditionalDetails with proper workflow');
        } else {
          // Fallback - just add the receiving department if we can't get the user's department
          const newWorkflow = {
            first: departmentId // This shouldn't happen in normal flow, but as a fallback
          };

          await prisma.documentAdditionalDetails.create({
            data: {
              document_id: documentId,
              work_flow_id: newWorkflow as any,
              remarks: remarks || null,
              account_id: null
            }
          });
          console.log('📍 [DocumentReleaseService.releaseDocument] Created new DocumentAdditionalDetails with fallback workflow');
        }
      }

      await recordReleaseStatus(documentId, {
        fromDepartmentId: releasingUser?.department_id || null,
        toDepartmentId: departmentId,
        userId,
        requestAction: Array.isArray(requestAction) ? requestAction.join(', ') : requestAction, // Join multiple actions into a string
        remarks
      });

      // Emit socket event to notify frontends of document release/update
      const updatedDocument = await prisma.document.findUnique({
        where: { document_id: documentId }
      });

      if (updatedDocument) {
        const io = getSocketInstance();
        io.emit('documentUpdated', {
          documentId: updatedDocument.document_id,
          title: updatedDocument.title,
          document_code: updatedDocument.document_code,
          classification: updatedDocument.classification,
          document_type: updatedDocument.document_type,
          status: updatedDocument.status,
          updated_at: updatedDocument.updated_at
        });
      }

      // Emit socket event for real-time updates
      const io = getSocketInstance();
      const emailService = new EmailService();
      if (io) {
        io.emit('documentUpdated', {
          documentId: documentId,
          status: 'intransit',
          updatedBy: userId,
          timestamp: new Date().toISOString()
        });

        // Emit specific event for document release notification
        io.emit('documentReleased', {
          documentId: documentId,
          documentTitle: document.title,
          releasedBy: userId,
          toDepartment: departmentId,
          timestamp: new Date().toISOString()
        });

        // Send notifications to users in the receiving department
        const notificationService = new NotificationService();
        try {
          // Get users in the receiving department to send notifications to
          const receivingDepartmentUsers = await prisma.user.findMany({
            where: {
              department_id: departmentId,
              active: true
            },
            select: {
              user_id: true
            }
          });

          // Create notifications for each user in the receiving department
          for (const user of receivingDepartmentUsers) {
            await notificationService.createDocumentReleasedNotification(
              user.user_id,
              documentId,
              document.title,
              departmentId
            );
          }
        } catch (error) {
          console.error('Error creating notifications for document release:', error);
        }
      }

      // Send email notification to the receiving department
      const receivingDepartment = await prisma.department.findUnique({
        where: { department_id: departmentId },
        include: {
          Account: {
            include: {
              user: {
                select: {
                  first_name: true,
                  last_name: true,
                  active: true,
                  account: {
                    select: { email: true }
                  }
                }
              }
            }
          }
        }
      });

      if (receivingDepartment) {
        const releasingUserName = releasingUser ? `${releasingUser.first_name} ${releasingUser.last_name}` : 'A colleague';

        // Send email to all users in the receiving department
        for (const account of receivingDepartment.Account) {
          const user = account.user;
          if (user && user.active && account.email) {
            const emailData: DocumentReleasedEmailData = {
              recipientEmail: account.email,
              recipientName: `${user.first_name} ${user.last_name}`,
              documentTitle: document.title,
              releasedBy: releasingUserName,
              fromDepartment: receivingDepartment.name,
              documentUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/documents/${documentId}`,
              message: `A document has been released to your department by ${releasingUserName}.`
            };

            // Send email notification asynchronously
            emailService.sendDocumentReleasedEmail(emailData).catch(err => {
              console.error(`Failed to send document released email to ${account.email}:`, err);
            });
          }
        }
      }

      return {
        success: true,
        data: { message: 'Document released successfully' }
      };
    } catch (error: any) {
      console.error('📍 [DocumentReleaseService.releaseDocument] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to release document'
      };
    }
  }

  /**
   * Receive a document - marks document as received by the current department
   */
  async receiveDocument(documentId: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return { success: false, error: 'Invalid document ID format' };
    }

    try {
      // console.log('📍 [DocumentReleaseService.receiveDocument] Receiving document:', documentId, 'by user:', userId);

      // Get user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, account: { select: { account_id: true } } }
      });

      if (!user || !user.account?.account_id) {
        return { success: false, error: 'User not found' };
      }

      // Verify document exists and get its additional details
      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: {
          DocumentAdditionalDetails: true
        }
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      const currentDetail = document.DocumentAdditionalDetails?.[0];
      if (!currentDetail) {
        return { success: false, error: 'Document details not found' };
      }

      // Get current workflow and received_by_departments
      let currentWorkflow: any = {};
      let receivedByDepartments: string[] = [];

      if (currentDetail.work_flow_id) {
        try {
          // Handle different possible formats of work_flow_id (could be object or JSON string)
          if (typeof currentDetail.work_flow_id === 'object' && currentDetail.work_flow_id !== null) {
            currentWorkflow = currentDetail.work_flow_id;
          } else if (typeof currentDetail.work_flow_id === 'string') {
            currentWorkflow = JSON.parse(currentDetail.work_flow_id);
          }
        } catch (e) {
          console.error('📍 [DocumentReleaseService.receiveDocument] Error parsing work_flow_id:', e);
        }
      }

      if (currentDetail.received_by_departments) {
        try {
          receivedByDepartments = Array.isArray(currentDetail.received_by_departments)
            ? currentDetail.received_by_departments
            : JSON.parse(currentDetail.received_by_departments as any);
        } catch (e) {
          console.error('📍 [DocumentReleaseService.receiveDocument] Error parsing received_by_departments:', e);
        }
      }

      // Check if department is in workflow (allowed to receive) by looking at workflow object values
      const workflowDepartments = Object.values(currentWorkflow);
      if (!workflowDepartments.includes(user.department_id)) {
        return { success: false, error: 'Department not in document workflow' };
      }

      // Check if already received by this department
      if (receivedByDepartments.includes(user.department_id)) {
        return { success: false, error: 'Document already received by this department' };
      }

      // Add department to received_by_departments array
      receivedByDepartments.push(user.department_id);

      // Update the document status to 'received' when all intended departments have received it
      // For now, we'll just update the status to 'received' when this department receives it
      await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'received',
          updated_at: new Date()
        }
      });

      // Update DocumentAdditionalDetails to set received_by field and clear pass_to_department
      await prisma.documentAdditionalDetails.update({
        where: { detail_id: currentDetail.detail_id },
        data: {
          received_by_departments: receivedByDepartments as any,
          updated_at: new Date()
        }
      });

      await recordReceiveStatus(documentId, {
        departmentId: user.department_id,
        userId
      });

      console.log('📍 [DocumentReleaseService.receiveDocument] Document received successfully by department:', user.department_id);

      // Send notification to users in the receiving department
      const notificationService = new NotificationService();
      try {
        // Get the document to include its title in the notification
        const document = await prisma.document.findUnique({
          where: { document_id: documentId },
          select: { title: true }
        });

        // Get users in the department to send notifications to
        const deptUsers = await prisma.user.findMany({
          where: {
            department_id: user.department_id,
            active: true
          },
          select: {
            user_id: true
          }
        });

        // Send notification to each user in the department
        for (const deptUser of deptUsers) {
          await notificationService.createDocumentReceivedNotification(
            deptUser.user_id,
            documentId,
            document?.title || 'Untitled Document'
          );
        }
      } catch (notificationError) {
        console.error('Error creating notifications for document received:', notificationError);
      }

      return {
        success: true,
        data: { message: 'Document received successfully' }
      };
    } catch (error: any) {
      console.error('📍 [DocumentReleaseService.receiveDocument] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to receive document'
      };
    }
  }
}
