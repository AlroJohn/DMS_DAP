import express, { Request, Response } from 'express';
import { DocumentSignatureWorkflowService } from '../services/DocumentSignatureWorkflowService.service';
import { auditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import { emitSignatureSave } from '../socket';

const router = express.Router();
const notificationService = new NotificationService();
const upload = multer();

// Helper to safely extract string from req.params
const getParamString = (param: string | string[] | undefined): string | undefined => {
  if (Array.isArray(param)) return param[0];
  return param;
};

// Endpoint to batch create signature placeholders (for adding multiple at once)
router.post('/documents/:documentId/signature-placeholders/batch', async (req: Request, res: Response) => {
  console.log('\n\n========== BATCH PLACEHOLDER ENDPOINT CALLED ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request params:', req.params);
  console.log('Request body keys:', Object.keys(req.body));
  console.log('========================================\n');
  
  try {
    const documentId = getParamString(req.params.documentId);
    const { placeholders, user_id } = req.body;

    console.log(`📍 [Batch Placeholder] Request received for document ${documentId}`);
    console.log(`📍 [Batch Placeholder] Placeholders:`, placeholders);
    console.log(`📍 [Batch Placeholder] User ID:`, user_id);

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    if (!Array.isArray(placeholders) || placeholders.length === 0) {
      console.log(`❌ [Batch Placeholder] Invalid placeholders array`);
      return res.status(400).json({ error: 'Placeholders array is required' });
    }

    console.log(`📍 [Batch Placeholder] Creating ${placeholders.length} placeholders for document ${documentId}`);

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { document_id: documentId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get user info
    const creatingUser = user_id ? await prisma.user.findUnique({
      where: { user_id: user_id },
      select: { first_name: true, last_name: true, department_id: true }
    }) : null;

    // Batch create placeholders in one go
    await prisma.signaturePlaceholder.createMany({
      data: placeholders.map((placeholder: any) => ({
        document_id: documentId,
        document_file_id: placeholder.document_file_id,
        page_number: placeholder.page_number,
        x_position: placeholder.x_position,
        y_position: placeholder.y_position,
        width: placeholder.width,
        height: placeholder.height,
        rotation: placeholder.rotation ?? 0,
        assigned_user_id: placeholder.assigned_user_id || null,
        department_id: placeholder.department_id || null
      }))
    });

    console.log(`✅ [Batch Placeholder] Created ${placeholders.length} placeholders`);

    // Update or create ONE consolidated trail entry for all placeholders
    console.log(`📍 [Batch Placeholder] Checking if should create/update trail: user_id=${user_id}, creatingUser=${!!creatingUser}`);
    
    if (user_id && creatingUser) {
      console.log(`📍 [Batch Placeholder] Creating/updating trail entry for user ${user_id}`);
      
      // Get ALL current placeholders for this document (not just the ones we created)
      const allPlaceholders = await prisma.signaturePlaceholder.findMany({
        where: { document_id: documentId },
        include: {
          assigned_user: {
            select: {
              first_name: true,
              last_name: true,
              department_id: true
            }
          }
        },
        orderBy: { created_at: 'asc' }
      });

      console.log(`📊 [Batch Placeholder] Total placeholders on document: ${allPlaceholders.length}`);

      // Get department name
      const deptName = creatingUser.department_id
        ? (await prisma.department.findUnique({
            where: { department_id: creatingUser.department_id },
            select: { name: true }
          }))?.name
        : 'Unknown Department';

      // Build the description without header line
      let placeholderDesc = `Added by: ${creatingUser.first_name} ${creatingUser.last_name}\n`;
      placeholderDesc += `Department: ${deptName}\n\n`;

      // Collect ALL assigned user information
      const assignedUsers: string[] = [];
      for (let i = 0; i < allPlaceholders.length; i++) {
        const placeholder = allPlaceholders[i];

        if (placeholder.assigned_user_id && placeholder.assigned_user) {
          // Get department name for the assigned user
          const assignedUserDeptName = placeholder.assigned_user.department_id
            ? (await prisma.department.findUnique({
                where: { department_id: placeholder.assigned_user.department_id },
                select: { name: true }
              }))?.name || ''
            : '';
          assignedUsers.push(`Placeholder ${i + 1}: ${placeholder.assigned_user.first_name} ${placeholder.assigned_user.last_name}${assignedUserDeptName ? ` (${assignedUserDeptName})` : ''}`);
        } else {
          const placeholderDeptName = placeholder.department_id
            ? (await prisma.department.findUnique({
                where: { department_id: placeholder.department_id },
                select: { name: true }
              }))?.name || ''
            : '';
          assignedUsers.push(
            `Placeholder ${i + 1}: Open${placeholderDeptName ? ` (${placeholderDeptName})` : ' (any user can sign)'}`
          );
        }
      }
      
      placeholderDesc += `ASSIGNED TO:\n${assignedUsers.join('\n')}`;

      console.log(`📍 [Batch Placeholder] Trail description:\n${placeholderDesc}`);

      // Check if a placeholder trail entry already exists
      const existingTrail = await prisma.documentTrail.findFirst({
        where: {
          document_id: documentId,
          status: 'placeholder_added'
        },
        orderBy: { created_at: 'desc' }
      });

      if (existingTrail) {
        // Update existing trail entry
        await prisma.documentTrail.update({
          where: { trail_id: existingTrail.trail_id },
          data: {
            remarks: placeholderDesc,
            updated_at: new Date(),
          },
        });
        console.log(`✅ [Batch Placeholder] Trail entry UPDATED (trail_id: ${existingTrail.trail_id})`);
      } else {
        // Create new trail entry
        await auditService.logSignaturePlaceholderAdded(user_id, documentId, {
          description: placeholderDesc,
          fromDepartmentId: creatingUser.department_id,
          toDepartmentId: creatingUser.department_id
        });
        console.log(`✅ [Batch Placeholder] Trail entry CREATED`);
      }
    } else {
      console.log(`⚠️  [Batch Placeholder] Skipping trail entry - user_id: ${user_id}, creatingUser: ${!!creatingUser}`);
    }

    // Send notifications to assigned users or departments
    console.log(`📧 [Batch Placeholder] Sending notifications to assigned users/departments`);
    const uniqueAssignedUserIds = new Set<string>();
    const uniqueDepartmentIds = new Set<string>();
    
    placeholders.forEach(placeholder => {
      if (placeholder.assigned_user_id) {
        uniqueAssignedUserIds.add(placeholder.assigned_user_id);
      } else if (placeholder.department_id) {
        uniqueDepartmentIds.add(placeholder.department_id);
      }
    });

    console.log(`📧 [Batch Placeholder] Found ${uniqueAssignedUserIds.size} unique assigned users`);

    if (uniqueAssignedUserIds.size > 0) {
      // Get document title for notification
      const documentTitle = document.title || `Document ${documentId}`;
      
      // Send notification to each unique assigned user
      for (const assignedUserId of uniqueAssignedUserIds) {
        try {
          console.log(`📧 [Batch Placeholder] Attempting to send notification to user ${assignedUserId}`);
          
          // Verify user exists
          const assignedUser = await prisma.user.findUnique({
            where: { user_id: assignedUserId },
            select: { 
              user_id: true, 
              first_name: true, 
              last_name: true,
              active: true 
            }
          });

          if (!assignedUser) {
            console.warn(`⚠️  [Batch Placeholder] User ${assignedUserId} not found, skipping notification`);
            continue;
          }

          if (!assignedUser.active) {
            console.warn(`⚠️  [Batch Placeholder] User ${assignedUserId} is inactive, skipping notification`);
            continue;
          }

          console.log(`📧 [Batch Placeholder] Sending notification to ${assignedUser.first_name} ${assignedUser.last_name}`);

          const notification = await notificationService.createNotification(
            assignedUserId,
            'Signature Required',
            `You have been assigned to sign the document: ${documentTitle}`,
            'workflow',
            'signature_pending',
            { 
              documentId, 
              documentTitle,
              createdBy: creatingUser ? `${creatingUser.first_name} ${creatingUser.last_name}` : 'System'
            }
          );

          if (notification) {
            console.log(`✅ [Batch Placeholder] Notification created successfully for user ${assignedUserId} (notification_id: ${notification.notification_id})`);
          } else {
            console.log(`ℹ️  [Batch Placeholder] Notification blocked by user preferences for user ${assignedUserId}`);
          }
        } catch (notificationError) {
          console.error(`❌ [Batch Placeholder] Failed to send notification to user ${assignedUserId}:`, notificationError);
          console.error(`❌ [Batch Placeholder] Error details:`, notificationError instanceof Error ? notificationError.message : String(notificationError));
          // Continue with other notifications even if one fails
        }
      }
      
      console.log(`✅ [Batch Placeholder] Completed sending notifications to ${uniqueAssignedUserIds.size} users`);
    } else {
      console.log(`ℹ️  [Batch Placeholder] No assigned users to notify`);
    }

    if (uniqueDepartmentIds.size > 0) {
      const documentTitle = document.title || `Document ${documentId}`;
      const departmentUsers = await prisma.user.findMany({
        where: {
          department_id: { in: Array.from(uniqueDepartmentIds) },
          active: true
        },
        select: {
          user_id: true,
          department_id: true
        }
      });

      const departmentUserIds = Array.from(
        new Set(departmentUsers.map((user) => user.user_id))
      );

      console.log(`📧 [Batch Placeholder] Notifying ${departmentUserIds.length} department users`);

      await Promise.all(
        departmentUserIds.map((userId) =>
          notificationService
            .createNotification(
              userId,
              'Signature Required',
              `You have been assigned to sign the document: ${documentTitle}`,
              'workflow',
              'signature_pending',
              {
                documentId,
                documentTitle,
                createdBy: creatingUser
                  ? `${creatingUser.first_name} ${creatingUser.last_name}`
                  : 'System'
              }
            )
            .catch((error) => {
              console.error(
                `❌ [Batch Placeholder] Failed to notify department user ${userId}:`,
                error
              );
            })
        )
      );
    }

    res.status(201).json(placeholders);
  } catch (error) {
    console.error('Error creating signature placeholders (batch):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get signature placeholders for a document
router.get('/documents/:documentId/signature-placeholders', async (req: Request, res: Response) => {
  try {
    const documentId = getParamString(req.params.documentId);

    const placeholders = await prisma.signaturePlaceholder.findMany({
      where: { document_id: documentId },
      include: {
        documentFile: true
      }
    });

    res.json(placeholders);
  } catch (error) {
    console.error('Error fetching signature placeholders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to create signature placeholders
router.post('/documents/:documentId/signature-placeholders', async (req: Request, res: Response) => {
  try {
    const documentId = getParamString(req.params.documentId);
    const {
      document_file_id,
      page_number,
      x_position,
      y_position,
      width,
      height,
      user_id,
      assigned_user_id,
      department_id
    } = req.body;

    // Verify document and file exist
    const document = await prisma.document.findUnique({
      where: { document_id: documentId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const documentFile = await prisma.documentFile.findUnique({
      where: { file_id: document_file_id }
    });

    if (!documentFile) {
      return res.status(404).json({ error: 'Document file not found' });
    }

    const creatingUser = user_id
      ? await prisma.user.findUnique({
          where: { user_id: user_id },
          select: { first_name: true, last_name: true, department_id: true }
        })
      : null;

    if (assigned_user_id) {
      const assignedUser = await prisma.user.findUnique({
        where: { user_id: assigned_user_id }
      });

      if (!assignedUser) {
        return res.status(404).json({ error: 'Assigned user not found' });
      }
    }

    if (department_id) {
      const department = await prisma.department.findUnique({
        where: { department_id }
      });

      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }
    }

    const placeholder = await prisma.signaturePlaceholder.create({
      data: {
        document_id: documentId!,
        document_file_id,
        page_number,
        x_position,
        y_position,
        width,
        height,
        assigned_user_id: assigned_user_id || null,
        department_id: department_id || null
      }
    });

    // Log signature placeholder addition to document trail if user_id is provided
    if (user_id) {
      let placeholderDesc: string;
      
      // Build description without verbose prefixes
      if (assigned_user_id) {
        const assignedUser = await prisma.user.findUnique({
          where: { user_id: assigned_user_id },
          select: { first_name: true, last_name: true, department_id: true }
        });
        
        if (assignedUser && creatingUser) {
          // Get assigned user's department name
          let assignedDeptName = '';
          if (assignedUser.department_id) {
            const assignedDept = await prisma.department.findUnique({
              where: { department_id: assignedUser.department_id },
              select: { name: true }
            });
            assignedDeptName = assignedDept ? ` (${assignedDept.name})` : '';
          }
          
          const deptName = creatingUser.department_id
            ? (await prisma.department.findUnique({
                where: { department_id: creatingUser.department_id },
                select: { name: true }
              }))?.name || 'Unknown Department'
            : 'Unknown Department';
          
          placeholderDesc = `Added by: ${creatingUser.first_name} ${creatingUser.last_name}\n`;
          placeholderDesc += `Department: ${deptName}\n\n`;
          placeholderDesc += `ASSIGNED TO:\n`;
          placeholderDesc += `Placeholder 1: ${assignedUser.first_name} ${assignedUser.last_name}${assignedDeptName}`;
        } else {
          placeholderDesc = `ASSIGNED TO:\nPlaceholder 1: Unknown User`;
        }
      } else {
        if (creatingUser) {
          const deptName = creatingUser.department_id
            ? (await prisma.department.findUnique({
                where: { department_id: creatingUser.department_id },
                select: { name: true }
              }))?.name || 'Unknown Department'
            : 'Unknown Department';

          const targetDeptName = department_id
            ? (await prisma.department.findUnique({
                where: { department_id: department_id },
                select: { name: true }
              }))?.name || 'Unknown Department'
            : null;

          placeholderDesc = `Added by: ${creatingUser.first_name} ${creatingUser.last_name}\n`;
          placeholderDesc += `Department: ${deptName}\n\n`;
          placeholderDesc += `ASSIGNED TO:\nPlaceholder 1: Open${
            targetDeptName ? ` (${targetDeptName})` : ' (any user can sign)'
          }`;
        } else {
          const targetDeptName = department_id
            ? (await prisma.department.findUnique({
                where: { department_id: department_id },
                select: { name: true }
              }))?.name || 'Unknown Department'
            : null;

          placeholderDesc = `ASSIGNED TO:\nPlaceholder 1: Open${
            targetDeptName ? ` (${targetDeptName})` : ' (any user can sign)'
          }`;
        }
      }

      await auditService.logSignaturePlaceholderAdded(user_id, documentId!, {
        description: placeholderDesc,
        fromDepartmentId: creatingUser?.department_id,
        toDepartmentId: creatingUser?.department_id
      });
    }

    // Send notification to assigned user or department
    if (assigned_user_id) {
      try {
        console.log(`📧 [Single Placeholder] Attempting to send notification to user ${assigned_user_id}`);
        
        // Verify user is active
        const assignedUser = await prisma.user.findUnique({
          where: { user_id: assigned_user_id },
          select: { 
            user_id: true, 
            first_name: true, 
            last_name: true,
            active: true 
          }
        });

        if (!assignedUser) {
          console.warn(`⚠️  [Single Placeholder] User ${assigned_user_id} not found, skipping notification`);
        } else if (!assignedUser.active) {
          console.warn(`⚠️  [Single Placeholder] User ${assigned_user_id} is inactive, skipping notification`);
        } else {
          const documentTitle = document.title || `Document ${documentId}`;
          const creatorName = creatingUser ? `${creatingUser.first_name} ${creatingUser.last_name}` : 'System';
          
          console.log(`📧 [Single Placeholder] Sending notification to ${assignedUser.first_name} ${assignedUser.last_name}`);

          const notification = await notificationService.createNotification(
            assigned_user_id,
            'Signature Required',
            `You have been assigned to sign the document: ${documentTitle}`,
            'workflow',
            'signature_pending',
            { 
              documentId, 
              documentTitle,
              createdBy: creatorName
            }
          );
          
          if (notification) {
            console.log(`✅ [Single Placeholder] Notification created successfully for user ${assigned_user_id} (notification_id: ${notification.notification_id})`);
          } else {
            console.log(`ℹ️  [Single Placeholder] Notification blocked by user preferences for user ${assigned_user_id}`);
          }
        }
      } catch (notificationError) {
        console.error(`❌ [Single Placeholder] Failed to send notification to user ${assigned_user_id}:`, notificationError);
        console.error(`❌ [Single Placeholder] Error details:`, notificationError instanceof Error ? notificationError.message : String(notificationError));
        // Continue even if notification fails
      }
    } else if (department_id) {
      try {
        const documentTitle = document.title || `Document ${documentId}`;
        const departmentUsers = await prisma.user.findMany({
          where: {
            department_id: department_id,
            active: true
          },
          select: { user_id: true }
        });

        await Promise.all(
          departmentUsers.map((deptUser) =>
            notificationService
              .createNotification(
                deptUser.user_id,
                'Signature Required',
                `You have been assigned to sign the document: ${documentTitle}`,
                'workflow',
                'signature_pending',
                {
                  documentId,
                  documentTitle,
                  createdBy: creatingUser
                    ? `${creatingUser.first_name} ${creatingUser.last_name}`
                    : 'System'
                }
              )
              .catch((notificationError) => {
                console.error(
                  `❌ [Single Placeholder] Failed to notify department user ${deptUser.user_id}:`,
                  notificationError
                );
              })
          )
        );
      } catch (notificationError) {
        console.error(
          `❌ [Single Placeholder] Failed to send department notifications:`,
          notificationError
        );
      }
    }

    res.status(201).json(placeholder);
  } catch (error) {
    console.error('Error creating signature placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to place a signature on a document
router.post('/documents/:documentId/place-signature', async (req: Request, res: Response) => {
  try {
    const documentId = getParamString(req.params.documentId);
    const { signee_id, document_file_id, page_number, x_position, y_position, width, height, signature_data } = req.body;

    // Verify document, file, and user exist
    const document = await prisma.document.findUnique({
      where: { document_id: documentId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const documentFile = await prisma.documentFile.findUnique({
      where: { file_id: document_file_id }
    });

    if (!documentFile) {
      return res.status(404).json({ error: 'Document file not found' });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: signee_id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use user's signature if not provided in the request
    const signatureToUse = signature_data || user.signature;

    const signedDocument = await prisma.signedDocument.create({
      data: {
        document_id: documentId!,
        signee_id,
        documentFileFile_id: document_file_id,
        page_number,
        x_position,
        y_position,
        width,
        height,
        signature_data: signatureToUse
      }
    });

    // Update the corresponding signature placeholder's status to true
    // Find the signature placeholder that matches the position and document file
    const EPSILON = 0.5; // Small tolerance for floating point comparisons
    const signaturePlaceholder = await prisma.signaturePlaceholder.findFirst({
      where: {
        document_file_id: document_file_id,
        page_number: page_number,
        // Using approximate matching for positions due to potential floating point precision differences
        x_position: {
          gte: x_position - EPSILON,
          lte: x_position + EPSILON
        },
        y_position: {
          gte: y_position - EPSILON,
          lte: y_position + EPSILON
        },
        width: {
          gte: width - EPSILON,
          lte: width + EPSILON
        },
        height: {
          gte: height - EPSILON,
          lte: height + EPSILON
        }
      }
    });

    if (signaturePlaceholder) {
      await prisma.signaturePlaceholder.update({
        where: {
          placeholder_id: signaturePlaceholder.placeholder_id
        },
        data: {
          signature_status: true
        }
      });
    }

    // Log signature to document trail
    await auditService.logDocumentSigned(signee_id, documentId!, {
      description: `Document signed by ${user.first_name} ${user.last_name}`
    });

    if (documentId) emitSignatureSave(documentId, document_file_id, signee_id);

    res.status(201).json(signedDocument);
  } catch (error) {
    console.error('Error placing signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to process document with all signatures
router.post('/documents/:documentId/process-signed-document', async (req: Request, res: Response) => {
  try {
    const documentId = getParamString(req.params.documentId)!;
    const { document_file_id } = req.body;

    // Process document with signatures using the service
    const signedPdfPath = await DocumentSignatureWorkflowService.processDocumentSignatureWorkflow(
      documentId,
      document_file_id
    );

    res.json({
      message: 'Document processed with signatures successfully',
      signedPdfPath
    });
  } catch (error) {
    console.error('Error processing signed document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get all signatures for a document
router.get('/documents/:documentId/signatures', async (req: Request, res: Response) => {
  try {
    const documentId = getParamString(req.params.documentId);

    const signatures = await prisma.signedDocument.findMany({
      where: { document_id: documentId },
      include: {
        signee: {
          select: {
            first_name: true,
            last_name: true,
            user_name: true
          }
        },
        documentFile: true
      }
    });

    res.json(signatures);
  } catch (error) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to delete a signature placeholder
router.delete('/documents/:documentId/delete-signature-placeholder', async (req: Request, res: Response) => {
  try {
    const documentId = getParamString(req.params.documentId);
    const { placeholder_id } = req.body;

    // Verify the placeholder belongs to the document
    const placeholder = await prisma.signaturePlaceholder.findFirst({
      where: {
        placeholder_id,
        document_id: documentId
      }
    });

    if (!placeholder) {
      return res.status(404).json({ error: 'Signature placeholder not found for this document' });
    }

    // Delete the signature placeholder
    await prisma.signaturePlaceholder.delete({
      where: {
        placeholder_id
      }
    });

    res.json({ message: 'Signature placeholder deleted successfully' });
  } catch (error) {
    console.error('Error deleting signature placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
