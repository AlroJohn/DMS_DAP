import { prisma } from '../lib/prisma';
import { getSocketInstance } from '../socket';
import { DocumentTrailsService } from './document-trails.service';
import { EmailService, DocumentReleasedEmailData } from './email.service';
import { NotificationService } from './notification.service';
import { recordReceiveStatus, recordReleaseStatus } from './workflow-status.service';
import { auditService } from './audit.service';

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
        userId: string,
        signatures?: {
            document_file_id: string;
            page_number: number;
            x_position: number;
            y_position: number;
            width: number;
            height: number;
        }[]
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

            // Get the releasing user's data, including their stored signature
            const releasingUser = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { signature: true, department_id: true, first_name: true, last_name: true }
            });

            if (!releasingUser) {
                return { success: false, error: 'Releasing user not found' };
            }

            // Create SignaturePlaceholder records if signatures are provided
            if (signatures && signatures.length > 0) {
                // If signatures are provided, it means the releasing user is placing placeholders for the recipient to sign
                const placeholderData = signatures.map((sig) => ({
                    document_id: documentId,
                    document_file_id: sig.document_file_id,
                    page_number: sig.page_number,
                    x_position: sig.x_position,
                    y_position: sig.y_position,
                    width: sig.width,
                    height: sig.height,
                }));

                await prisma.signaturePlaceholder.createMany({
                    data: placeholderData,
                });
                console.log('📍 [DocumentReleaseService.releaseDocument] Signature placeholders saved to SignaturePlaceholder table.');

                // We do NOT process the document signature workflow here anymore.
                // The document is released with placeholders, waiting for the recipient to sign.
            } else {
                // If no signatures are provided but the action includes "signature",
                // we should note that the document is being released for signature
                const hasSignatureAction = Array.isArray(requestAction)
                    ? requestAction.some(action => action.toLowerCase().includes('signature'))
                    : requestAction.toLowerCase().includes('signature');

                if (hasSignatureAction) {
                    console.log('📍 [DocumentReleaseService.releaseDocument] Document released for signature, no placeholders placed yet.');
                }
            }

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

            // Create a document trail entry for the release
            const documentTrailsService = new DocumentTrailsService();
            try {
                await documentTrailsService.createDocumentTrail({
                    document_id: documentId,
                    from_department: releasingUser?.department_id,
                    to_department: departmentId,
                    user_id: userId,
                    status: 'intransit',
                    remarks: remarks || `Document released from ${releasingUser?.department_id} to ${departmentId}`
                });
            } catch (error) {
                console.error('Error creating document trail for document release:', error);
            }

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
                // First, get the user's department and account to set as 'first' in the workflow
                const user = await prisma.user.findUnique({
                    where: { user_id: userId },
                    select: { 
                        department_id: true,
                        account: {
                            select: {
                                account_id: true
                            }
                        }
                    }
                });

                if (user && user.account?.account_id) {
                    const newWorkflow = {
                        first: user.department_id,
                        second: departmentId
                    };

                    await prisma.documentAdditionalDetails.create({
                        data: {
                            document_id: documentId,
                            work_flow_id: newWorkflow as any,
                            remarks: remarks || null,
                            account_id: user.account.account_id // Store the releasing user's account ID
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
                            account_id: user?.account?.account_id || null // Try to store account_id if available
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
                                    user_id: true,
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
                    // Skip sending the email back to the releasing user
                    if (user && user.active && account.email && user.user_id !== userId) {
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

    console.log('📍 [DocumentReleaseService.receiveDocument] Start receiving process for document:', documentId, 'by user:', userId);

    try {
      // Get user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, account: { select: { account_id: true } } }
      });

      if (!user || !user.account?.account_id) {
        console.error('📍 [DocumentReleaseService.receiveDocument] Error: User not found or user has no account_id. User:', user);
        return { success: false, error: 'User not found' };
      }
      console.log('📍 [DocumentReleaseService.receiveDocument] User found:', user);

      // Verify document exists and get its additional details
      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: {
          DocumentAdditionalDetails: true
        }
      });

      if (!document) {
        console.error('📍 [DocumentReleaseService.receiveDocument] Error: Document not found with ID:', documentId);
        return { success: false, error: 'Document not found' };
      }
      console.log('📍 [DocumentReleaseService.receiveDocument] Document found:', document);

      if (document.status !== 'intransit') {
        console.warn('📍 [DocumentReleaseService.receiveDocument] Warning: Document is not in transit. Status:', document.status);
        return { success: false, error: 'Document is not in transit' };
      }

      const latestTransitTrail = await prisma.documentTrail.findFirst({
        where: {
          document_id: documentId,
          status: 'intransit'
        },
        orderBy: {
          created_at: 'desc'
        },
        select: {
          to_department: true
        }
      });
      console.log('📍 [DocumentReleaseService.receiveDocument] Latest transit trail:', latestTransitTrail);

      if (latestTransitTrail?.to_department && latestTransitTrail.to_department !== user.department_id) {
        console.error('📍 [DocumentReleaseService.receiveDocument] Error: Document is not assigned to this user\'s department. Assigned to:', latestTransitTrail.to_department, 'User department:', user.department_id);
        return { success: false, error: 'Document is not assigned to your department' };
      }

      const currentDetail = document.DocumentAdditionalDetails?.[0];
      if (!currentDetail) {
        console.error('📍 [DocumentReleaseService.receiveDocument] Error: Document details not found for document ID:', documentId);
        return { success: false, error: 'Document details not found' };
      }
      console.log('📍 [DocumentReleaseService.receiveDocument] Current document details:', currentDetail);

      // Get current workflow and received_by_department_user
      let currentWorkflow: any = {};
      let receivedByUsers: string[] = [];

      if (currentDetail.work_flow_id) {
        try {
          if (typeof currentDetail.work_flow_id === 'object' && currentDetail.work_flow_id !== null) {
            currentWorkflow = currentDetail.work_flow_id;
          } else if (typeof currentDetail.work_flow_id === 'string') {
            currentWorkflow = JSON.parse(currentDetail.work_flow_id);
          }
        } catch (e) {
          console.error('📍 [DocumentReleaseService.receiveDocument] Error parsing work_flow_id:', e);
        }
      }
      console.log('📍 [DocumentReleaseService.receiveDocument] Parsed workflow:', currentWorkflow);

      console.log('📍 [DocumentReleaseService.receiveDocument] received_by_department_user before parsing:', currentDetail.received_by_department_user);
      if (currentDetail.received_by_department_user) {
        try {
          receivedByUsers = Array.isArray(currentDetail.received_by_department_user)
            ? currentDetail.received_by_department_user
            : JSON.parse(currentDetail.received_by_department_user as any);
        } catch (e) {
          console.error('📍 [DocumentReleaseService.receiveDocument] Error parsing received_by_department_user:', e);
          // If parsing fails, and it's a non-array value, we might want to handle it
          // For now, it will default to an empty array.
        }
      }
      console.log('📍 [DocumentReleaseService.receiveDocument] Parsed receivedByUsers:', receivedByUsers);

      // Check if department is in workflow (allowed to receive) by looking at workflow object values
      const workflowDepartments = Object.values(currentWorkflow);
      if (!workflowDepartments.includes(user.department_id)) {
        console.error('📍 [DocumentReleaseService.receiveDocument] Error: Department not in document workflow. User department:', user.department_id, 'Workflow departments:', workflowDepartments);
        return { success: false, error: 'Department not in document workflow' };
      }

      // Check if already received by this user
      if (receivedByUsers.includes(userId)) {
        console.warn('📍 [DocumentReleaseService.receiveDocument] Warning: Document already received by this user.', { userId, receivedByUsers });
        return { success: false, error: 'Document already received by this user' };
      }

      // Add user to received_by_department_user array
      receivedByUsers.push(userId);
      console.log('📍 [DocumentReleaseService.receiveDocument] Updated receivedByUsers:', receivedByUsers);

      // Update the document status to 'received'
      console.log('📍 [DocumentReleaseService.receiveDocument] Updating document status to received for document:', documentId);
      await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'received',
          updated_at: new Date()
        }
      });
      console.log('📍 [DocumentReleaseService.receiveDocument] Document status updated.');

      // Create a document trail entry for the document receiving
      const documentTrailsService = new DocumentTrailsService();
      try {
        console.log('📍 [DocumentReleaseService.receiveDocument] Creating document trail for receive event.');
        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: undefined, // Received from the previous department in workflow
          to_department: user.department_id,
          user_id: userId,
          status: 'received',
          remarks: `Document received by user: ${userId} in department: ${user.department_id}`
        });
        console.log('📍 [DocumentReleaseService.receiveDocument] Document trail created.');
      } catch (error) {
        console.error('Error creating document trail for document receiving:', error);
      }

      // Update DocumentAdditionalDetails
      const updateData = {
        received_by_department_user: receivedByUsers as any,
        updated_at: new Date()
      };
      console.log('📍 [DocumentReleaseService.receiveDocument] Updating DocumentAdditionalDetails with:', updateData);
      await prisma.documentAdditionalDetails.update({
        where: { detail_id: currentDetail.detail_id },
        data: updateData
      });
      console.log('📍 [DocumentReleaseService.receiveDocument] DocumentAdditionalDetails updated.');

      await recordReceiveStatus(documentId, {
        departmentId: user.department_id,
        userId
      });

      console.log('📍 [DocumentReleaseService.receiveDocument] Document received successfully by user:', userId, 'in department:', user.department_id);

      // Send notification to users in the receiving department
      const notificationService = new NotificationService();
      try {
        const documentForNotif = await prisma.document.findUnique({
          where: { document_id: documentId },
          select: { title: true }
        });

        const deptUsers = await prisma.user.findMany({
          where: {
            department_id: user.department_id,
            active: true
          },
          select: {
            user_id: true
          }
        });

        for (const deptUser of deptUsers) {
          await notificationService.createDocumentReceivedNotification(
            deptUser.user_id,
            documentId,
            documentForNotif?.title || 'Untitled Document'
          );
        }
        console.log('📍 [DocumentReleaseService.receiveDocument] Sent received notifications.');
      } catch (notificationError) {
        console.error('Error creating notifications for document received:', notificationError);
      }

      return {
        success: true,
        data: { message: 'Document received successfully' }
      };
        } catch (error: any) {
          console.error('📍 [DocumentReleaseService.receiveDocument] Fatal error:', error);
          return {
            success: false,
            error: error.message || 'Failed to receive document'
          };
        }
      }
}

