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
        assignedUserIds?: string[], // Optional array of user IDs who can receive the document
        signatures?: {
            document_file_id: string;
            page_number: number;
            x_position: number;
            y_position: number;
            width: number;
            height: number;
            assigned_user_id?: string | null;
            department_id?: string | null;
        }[],
        textPlaceholders?: {
            document_file_id: string;
            page_number: number;
            x_position: number;
            y_position: number;
            width: number;
            height: number;
            font_family: string;
            font_size: number;
            font_color: string;
            text_value: string;
            assigned_user_id?: string | null;
            department_id?: string | null;
        }[],
        options?: {
            releaseActionSummary?: string[];
            releaseActionByDepartment?: Record<string, string[]>;
        }
    ) {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(documentId) || !uuidRegex.test(departmentId)) {
            throw new Error('Invalid document ID or department ID format');
        }

        try {

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
                    assigned_user_id: sig.assigned_user_id || null,
                    department_id: sig.department_id || departmentId,
                }));

                await prisma.signaturePlaceholder.createMany({
                    data: placeholderData,
                });

                console.log(`📧 [Document Release] Sending signature notifications for ${signatures.length} placeholders`);

                // Send notifications to assigned users
                const notificationService = new NotificationService();
                const assignedUserIds = signatures
                    .map(sig => sig.assigned_user_id)
                    .filter((id): id is string => !!id);
                const assignedDepartmentIds = signatures
                    .map(sig => sig.department_id)
                    .filter((id): id is string => !!id);

                // Get unique user IDs
                const uniqueUserIds = [...new Set(assignedUserIds)];
                const uniqueDepartmentIds = [
                    ...new Set(
                        assignedDepartmentIds.length ? assignedDepartmentIds : [departmentId]
                    )
                ];

                console.log(`📧 [Document Release] Unique assigned users: ${uniqueUserIds.length}`, uniqueUserIds);

                // Get document details for notification
                const documentDetails = await prisma.document.findUnique({
                    where: { document_id: documentId },
                    select: { title: true }
                });

                const notifyPlaceholders = async () => {
                    const userRecords = await prisma.user.findMany({
                        where: {
                            user_id: { in: uniqueUserIds },
                            active: true,
                        },
                        select: { user_id: true },
                    });

                    const activeUserSet = new Set(userRecords.map(u => u.user_id));
                    const notificationPromises = uniqueUserIds.map((assignedUserId) => {
                        if (!activeUserSet.has(assignedUserId)) {
                            console.log(`⚠️ [Document Release] User ${assignedUserId} not found or inactive - skipping notification`);
                            return Promise.resolve(null);
                        }
                        console.log(`📧 [Document Release] Notifying user ${assignedUserId} about signature requirement`);
                        return notificationService.createNotification(
                            assignedUserId,
                            'Signature Required',
                            `You have been assigned to sign the document: ${documentDetails?.title || 'Untitled'}`,
                            'signature',
                            'signature_pending',
                            {
                                documentId,
                                documentTitle: documentDetails?.title
                            }
                        )
                        .then(() => {
                            console.log(`✅ [Document Release] Notification sent to user ${assignedUserId}`);
                        })
                        .catch((error) => {
                            console.error(`❌ [Document Release] Failed to notify user ${assignedUserId}:`, error);
                        });
                    });
                    await Promise.all(notificationPromises);

                    if (uniqueDepartmentIds.length > 0) {
                        const deptUsers = await prisma.user.findMany({
                            where: {
                                department_id: { in: uniqueDepartmentIds },
                                active: true
                            },
                            select: { user_id: true }
                        });
                        const deptUserIds = [...new Set(deptUsers.map(u => u.user_id))];
                        const deptNotificationPromises = deptUserIds.map((deptUserId) => {
                            return notificationService.createNotification(
                                deptUserId,
                                'Signature Required',
                                `You have been assigned to sign the document: ${documentDetails?.title || 'Untitled'}`,
                                'signature',
                                'signature_pending',
                                {
                                    documentId,
                                    documentTitle: documentDetails?.title
                                }
                            )
                            .catch((error) => {
                                console.error(`❌ [Document Release] Failed to notify department user ${deptUserId}:`, error);
                            });
                        });
                        await Promise.all(deptNotificationPromises);
                    }
                };

                await notifyPlaceholders();

                // Log signature placeholder addition to document trail - create ONE consolidated trail entry
                
                // Get department names
                const fromDeptName = releasingUser.department_id 
                    ? (await prisma.department.findUnique({ 
                        where: { department_id: releasingUser.department_id },
                        select: { name: true }
                      }))?.name 
                    : 'Unknown Department';
                
                const toDeptName = await prisma.department.findUnique({
                    where: { department_id: departmentId },
                    select: { name: true }
                });
                
                // Build the description without header line
                let placeholderDesc = `Added by: ${releasingUser.first_name} ${releasingUser.last_name}\n`;
                placeholderDesc += `From: ${fromDeptName}\n`;
                placeholderDesc += `To: ${toDeptName?.name || 'Unknown Department'}\n\n`;
                
                // Collect assigned user information
                const assignedUsers: string[] = [];
                const departmentNameCache = new Map<string, string>();
                const getDepartmentName = async (deptId?: string | null) => {
                    if (!deptId) return null;
                    if (departmentNameCache.has(deptId)) {
                        return departmentNameCache.get(deptId) || null;
                    }
                    const dept = await prisma.department.findUnique({
                        where: { department_id: deptId },
                        select: { name: true }
                    });
                    const name = dept?.name || null;
                    if (name) {
                        departmentNameCache.set(deptId, name);
                    }
                    return name;
                };
                for (let i = 0; i < signatures.length; i++) {
                    const sig = signatures[i];
                    
                    if (sig.assigned_user_id) {
                        try {
                            const assignedUser = await prisma.user.findUnique({
                                where: { user_id: sig.assigned_user_id },
                                select: { first_name: true, last_name: true, department_id: true }
                            });
                            
                            if (assignedUser) {
                                // Get assigned user's department name
                                let assignedDeptName = '';
                                if (assignedUser.department_id) {
                                    const assignedDept = await prisma.department.findUnique({
                                        where: { department_id: assignedUser.department_id },
                                        select: { name: true }
                                    });
                                    assignedDeptName = assignedDept ? ` (${assignedDept.name})` : '';
                                }
                                
                                assignedUsers.push(`Placeholder ${i + 1}: ${assignedUser.first_name} ${assignedUser.last_name}${assignedDeptName}`);
                            } else {
                                assignedUsers.push(`Placeholder ${i + 1}: Unknown User`);
                            }
                        } catch (error) {
                            console.error('Error fetching assigned user:', error);
                            assignedUsers.push(`Placeholder ${i + 1}: Unknown User`);
                        }
                    } else {
                        const targetDeptName =
                            (await getDepartmentName(sig.department_id)) ||
                            toDeptName?.name ||
                            'target department';
                        assignedUsers.push(`Placeholder ${i + 1}: Open (any user in ${targetDeptName})`);
                    }
                }
                
                // Add all assigned users to description
                placeholderDesc += `ASSIGNED TO:\n${assignedUsers.join('\n')}`;

                // Create single trail entry with all information
                await auditService.logSignaturePlaceholderAdded(userId, documentId, {
                    description: placeholderDesc,
                    fromDepartmentId: releasingUser.department_id ?? undefined,
                    toDepartmentId: departmentId,
                });

                // We do NOT process the document signature workflow here anymore.
                // The document is released with placeholders, waiting for the recipient to sign.
            } else {
                // If no signatures are provided but the action includes "signature",
                // we should note that the document is being released for signature
                const hasSignatureAction = Array.isArray(requestAction)
                    ? requestAction.some(action => action.toLowerCase().includes('signature'))
                    : requestAction.toLowerCase().includes('signature');

                if (hasSignatureAction) {
                    // Document released for signature, no placeholders placed yet.
                }
            }

            if (textPlaceholders && textPlaceholders.length > 0) {
                const textPlaceholderData = textPlaceholders.map((textPlaceholder) => ({
                    document_id: documentId,
                    document_file_id: textPlaceholder.document_file_id,
                    page_number: textPlaceholder.page_number,
                    x_position: textPlaceholder.x_position,
                    y_position: textPlaceholder.y_position,
                    width: textPlaceholder.width,
                    height: textPlaceholder.height,
                    font_family: textPlaceholder.font_family,
                    font_size: textPlaceholder.font_size,
                    font_color: textPlaceholder.font_color,
                    text_value: textPlaceholder.text_value,
                    assigned_user_id: textPlaceholder.assigned_user_id || null,
                    department_id: textPlaceholder.department_id || departmentId,
                }));

                await prisma.textPlaceholder.createMany({
                    data: textPlaceholderData,
                });
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
                    console.error('[DocumentReleaseService.releaseDocument] Error parsing work_flow_id:', e);
                    // Initialize with empty object
                    currentWorkflow = {};
                }
            }

            const releaseActions = Array.isArray(requestAction)
                ? requestAction
                : requestAction
                  ? [requestAction]
                  : [];
            const releaseActionsSummary =
                options?.releaseActionSummary && options.releaseActionSummary.length > 0
                    ? options.releaseActionSummary
                    : releaseActions;
            const releaseActionByDepartment = options?.releaseActionByDepartment;

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
            } else {
                // Department already in workflow, skipping
            }

            // Update document status to intransit (being routed)
            await prisma.document.update({
                where: { document_id: documentId },
                data: {
                    status: 'intransit',
                    updated_at: new Date()
                }
            });

            // Create document trail entries - one for each assigned user, or one for the department if no specific users
            const documentTrailsService = new DocumentTrailsService();
            try {
                const releaseTimestamp = new Date();
                if (assignedUserIds && assignedUserIds.length > 0) {
                    // Create a trail entry for each assigned user
                    for (const assignedUserId of assignedUserIds) {
                        await documentTrailsService.createDocumentTrail({
                            document_id: documentId,
                            from_department: releasingUser?.department_id,
                            to_department: departmentId,
                            user_id: userId,
                            assigned_to_user_id: assignedUserId,
                            status: 'intransit',
                            remarks: remarks || `Document released to specific user`,
                            action_date: releaseTimestamp
                        });
                    }
                } else {
                    // No specific users assigned - release to entire department
                    await documentTrailsService.createDocumentTrail({
                        document_id: documentId,
                        from_department: releasingUser?.department_id,
                        to_department: departmentId,
                        user_id: userId,
                        assigned_to_user_id: null,
                        status: 'intransit',
                        remarks: remarks || `Document released to department`,
                        action_date: releaseTimestamp
                    });
                }
            } catch (error) {
                console.error('Error creating document trail for document release:', error);
            }

            // Update DocumentAdditionalDetails with new workflow and pass_to_department
            if (currentDetail) {
                await prisma.documentAdditionalDetails.update({
                    where: { detail_id: currentDetail.detail_id },
                    data: {
                        work_flow_id: (currentWorkflow as any),
                        remarks: remarks || currentDetail.remarks,
                        release_action: releaseActionsSummary,
                        ...(releaseActionByDepartment
                            ? { release_action_by_department: releaseActionByDepartment as any }
                            : {}),
                        updated_at: new Date()
                    }
                });
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
                        release_action: releaseActionsSummary,
                        ...(releaseActionByDepartment
                            ? { release_action_by_department: releaseActionByDepartment as any }
                            : {}),
                        account_id: user.account.account_id // Store the releasing user's account ID
                        }
                    });
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
                        release_action: releaseActionsSummary,
                        ...(releaseActionByDepartment
                            ? { release_action_by_department: releaseActionByDepartment as any }
                            : {}),
                        account_id: user?.account?.account_id || null // Try to store account_id if available
                        }
                    });
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
                    const notificationPromises = receivingDepartmentUsers.map((user) =>
                        notificationService
                            .createDocumentReleasedNotification(
                                user.user_id,
                                documentId,
                                document.title,
                                departmentId
                            )
                            .catch((error) => {
                                console.error(
                                    'Error creating notification for user in receiving department:',
                                    user.user_id,
                                    error
                                );
                            })
                    );

                    await Promise.allSettled(notificationPromises);
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
                console.log(`[DocumentReleaseService] Skipping department-wide email notifications for release to ${receivingDepartment.name}`);
            }

            return {
                success: true,
                data: { message: 'Document released successfully' }
            };
        } catch (error: any) {
            console.error('[DocumentReleaseService.releaseDocument] Error:', error);
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
      // Get user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { 
          department_id: true, 
          first_name: true, 
          last_name: true, 
          account: { select: { account_id: true } } 
        }
      });

      if (!user || !user.account?.account_id) {
        console.error('[DocumentReleaseService.receiveDocument] Error: User not found or user has no account_id.');
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
        console.error('[DocumentReleaseService.receiveDocument] Error: Document not found with ID:', documentId);
        return { success: false, error: 'Document not found' };
      }

      if (document.status !== 'intransit') {
        console.warn('[DocumentReleaseService.receiveDocument] Warning: Document is not in transit. Status:', document.status);
        return { success: false, error: 'Document is not in transit' };
      }

      const latestTransitTrail = await prisma.documentTrail.findFirst({
        where: {
          document_id: documentId,
          status: 'intransit',
          to_department: user.department_id
        },
        orderBy: {
          created_at: 'desc'
        },
        select: {
          to_department: true,
          trail_id: true
        }
      });

      if (!latestTransitTrail) {
        console.error('[DocumentReleaseService.receiveDocument] Error: Document is not assigned to this user\'s department. User department:', user.department_id);
        return { success: false, error: 'Document is not assigned to your department' };
      }

      // Per-user receive checks happen below to allow multiple users to receive in the same department.

      const currentDetail = document.DocumentAdditionalDetails?.[0];
      if (!currentDetail) {
        console.error('[DocumentReleaseService.receiveDocument] Error: Document details not found for document ID:', documentId);
        return { success: false, error: 'Document details not found' };
      }

      // Get current workflow and received_by_departments
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
          console.error('[DocumentReleaseService.receiveDocument] Error parsing work_flow_id:', e);
        }
      }
      if (currentDetail.received_by_departments) {
        try {
          receivedByUsers = Array.isArray(currentDetail.received_by_departments)
            ? currentDetail.received_by_departments
            : JSON.parse(currentDetail.received_by_departments as any);
        } catch (e) {
          console.error('[DocumentReleaseService.receiveDocument] Error parsing received_by_departments:', e);
          // If parsing fails, and it's a non-array value, we might want to handle it
          // For now, it will default to an empty array.
        }
      }
      const isSharedToUser = receivedByUsers.includes(userId);

      const latestTransitTrailForCheck = await prisma.documentTrail.findFirst({
        where: {
          document_id: documentId,
          status: 'intransit',
          to_department: user.department_id
        },
        orderBy: {
          created_at: 'desc'
        },
        select: {
          to_department: true
        }
      });

      if (!latestTransitTrailForCheck && !isSharedToUser) {
        console.error('[DocumentReleaseService.receiveDocument] Error: Document is not assigned to this user\'s department. User department:', user.department_id);
        return { success: false, error: 'Document is not assigned to your department' };
      }

      // Check if department is in workflow (allowed to receive) by looking at workflow object values
      const workflowDepartments = Object.values(currentWorkflow);
      if (!workflowDepartments.includes(user.department_id) && !isSharedToUser) {
        console.error('[DocumentReleaseService.receiveDocument] Error: Department not in document workflow. User department:', user.department_id, 'Workflow departments:', workflowDepartments);
        return { success: false, error: 'Department not in document workflow' };
      }

      // Check if this specific user has already received the document in the CURRENT TRANSIT CYCLE
      // We need to check if there's a received trail AFTER the latest intransit trail
      const latestIntransitTrailTime = await prisma.documentTrail.findFirst({
        where: {
          document_id: documentId,
          status: 'intransit',
          to_department: user.department_id
        },
        orderBy: {
          created_at: 'desc'
        },
        select: {
          created_at: true,
          trail_id: true
        }
      });

      if (latestIntransitTrailTime) {
        // Check if there's a received trail for this user AFTER the intransit trail
        const receivedAfterIntransit = await prisma.documentTrail.findFirst({
          where: {
            document_id: documentId,
            status: 'received',
            user_id: userId,
            to_department: user.department_id,
            created_at: {
              gte: latestIntransitTrailTime.created_at
            }
          }
        });

        if (receivedAfterIntransit) {
          console.warn('?? [DocumentReleaseService.receiveDocument] Warning: Document already received by this user in current transit cycle.', { userId });
          return { success: false, error: 'Document already received by this user in the current transit cycle' };
        }
      }

      // Add user to received_by_departments array
      receivedByUsers.push(userId);
      // Add user to received_by_department_user array
      if (!receivedByUsers.includes(userId)) {
        receivedByUsers.push(userId);
      }

      // Get the latest intransit trail to extract from_department for the new received trail
      const latestIntransitTrailDetails = await prisma.documentTrail.findFirst({
        where: {
          document_id: documentId,
          status: 'intransit',
          to_department: user.department_id
        },
        orderBy: {
          created_at: 'desc'
        },
        select: {
          from_department: true,
          to_department: true,
          action_id: true
        }
      });

      // Create a NEW trail entry for the receive action instead of updating the existing one
      const documentTrailsService = new DocumentTrailsService();
      await documentTrailsService.createDocumentTrail({
        document_id: documentId,
        action_id: latestIntransitTrailDetails?.action_id || undefined,
        from_department: latestIntransitTrailDetails?.from_department || undefined,
        to_department: user.department_id,
        user_id: userId,
        assigned_to_user_id: null,
        status: 'received',
        remarks: `Document received by ${user.first_name} ${user.last_name}`
      });

      // Update DocumentAdditionalDetails
      const updateData = {
        received_by_departments: receivedByUsers as any,
        updated_at: new Date()
      };
      await prisma.documentAdditionalDetails.update({
        where: { detail_id: currentDetail.detail_id },
        data: updateData
      });

      const intransitTrails = await prisma.documentTrail.findMany({
        where: {
          document_id: documentId,
          status: 'intransit'
        },
        select: {
          to_department: true,
          created_at: true,
          action_date: true,
          assigned_to_user_id: true
        }
      });

      const latestIntransitByDept = new Map<string, Date>();
      for (const trail of intransitTrails) {
        if (!trail.to_department) continue;
        const currentLatest = latestIntransitByDept.get(trail.to_department);
        if (!currentLatest || trail.action_date > currentLatest) {
          latestIntransitByDept.set(trail.to_department, trail.action_date);
        }
      }

      let allReceived = latestIntransitByDept.size > 0;
      for (const [departmentId, intransitSince] of latestIntransitByDept.entries()) {
        const assignedRecipients = intransitTrails
          .filter(
            (trail) =>
              trail.to_department === departmentId &&
              trail.assigned_to_user_id &&
              trail.action_date.getTime() === intransitSince.getTime()
          )
          .map((trail) => trail.assigned_to_user_id as string);

        let targetRecipientIds = Array.from(new Set(assignedRecipients));
        if (targetRecipientIds.length === 0) {
          const departmentUsers = await prisma.user.findMany({
            where: { department_id: departmentId, active: true },
            select: { user_id: true }
          });
          targetRecipientIds = departmentUsers.map((deptUser) => deptUser.user_id);
        }

        const receivedTrails = await prisma.documentTrail.findMany({
          where: {
            document_id: documentId,
            status: 'received',
            to_department: departmentId,
            created_at: { gte: intransitSince }
          },
          select: { user_id: true }
        });
        const receivedUserIds = new Set(
          receivedTrails
            .map((trail) => trail.user_id)
            .filter((id): id is string => Boolean(id))
        );

        const deptAllReceived =
          targetRecipientIds.length > 0 &&
          targetRecipientIds.every((id) => receivedUserIds.has(id));

        if (!deptAllReceived) {
          allReceived = false;
          break;
        }
      }

      if (allReceived) {
        await prisma.document.update({
          where: { document_id: documentId },
          data: {
            status: 'received',
            updated_at: new Date()
          }
        });

        await recordReceiveStatus(documentId, {
          departmentId: user.department_id,
          userId
        });
      }


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
      } catch (notificationError) {
        console.error('Error creating notifications for document received:', notificationError);
      }

      return {
        success: true,
        data: { message: 'Document received successfully' }
      };
    } catch (error: any) {
      console.error('[DocumentReleaseService.receiveDocument] Fatal error:', error);
      return {
        success: false,
        error: error.message || 'Failed to receive document'
      };
    }
  }
}



