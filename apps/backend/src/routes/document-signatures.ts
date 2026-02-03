import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises } from 'fs';
import { auditService } from '../services/audit.service';
import { prisma } from '../lib/prisma';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/signatures/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Endpoint to get document with signature placeholders
router.get('/documents/:documentId/signatures', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await prisma.document.findUnique({
      where: { document_id: documentId },
      include: {
        signature_placeholders: {
          include: {
            documentFile: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document.signature_placeholders);
  } catch (error) {
    console.error('Error fetching signature placeholders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to add signature placeholder to document
router.post('/documents/:documentId/signatures', upload.none(), async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const {
      page_number,
      x_position,
      y_position,
      width,
      height,
      document_file_id,
      user_id,
      assigned_user_id,
      department_id
    } = req.body;

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { document_id: documentId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify document file exists
    const documentFile = await prisma.documentFile.findUnique({
      where: { file_id: document_file_id }
    });

    if (!documentFile) {
      return res.status(404).json({ error: 'Document file not found' });
    }

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

    // Create signature placeholder
    const signaturePlaceholder = await prisma.signaturePlaceholder.create({
      data: {
        document_id: documentId,
        document_file_id: document_file_id,
        page_number: parseInt(page_number),
        x_position: parseFloat(x_position),
        y_position: parseFloat(y_position),
        width: parseFloat(width),
        height: parseFloat(height),
        assigned_user_id: assigned_user_id || null,
        department_id: department_id || null
      }
    });

    // Log signature placeholder addition to document trail
    if (user_id) {
      // Get user who created the placeholder
      const creatingUser = await prisma.user.findUnique({
        where: { user_id: user_id },
        select: { first_name: true, last_name: true, department_id: true }
      });

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
          placeholderDesc += `Placeholder 1: ${assignedUser.first_name} ${assignedUser.last_name}${assignedDeptName} (Page ${page_number})`;
        } else {
          placeholderDesc = `ASSIGNED TO:\nPlaceholder 1: Unknown User (Page ${page_number})`;
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
          } - Page ${page_number}`;
        } else {
          const targetDeptName = department_id
            ? (await prisma.department.findUnique({
                where: { department_id: department_id },
                select: { name: true }
              }))?.name || 'Unknown Department'
            : null;

          placeholderDesc = `ASSIGNED TO:\nPlaceholder 1: Open${
            targetDeptName ? ` (${targetDeptName})` : ' (any user can sign)'
          } - Page ${page_number}`;
        }
      }

      await auditService.logSignaturePlaceholderAdded(user_id, documentId, {
        description: placeholderDesc,
        fromDepartmentId: creatingUser?.department_id,
        toDepartmentId: creatingUser?.department_id
      });
    }

    res.status(201).json(signaturePlaceholder);
  } catch (error) {
    console.error('Error creating signature placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to update signature placeholder position
router.put('/signatures/:placeholderId', upload.none(), async (req: Request, res: Response) => {
  try {
    const { placeholderId } = req.params;
    const { page_number, x_position, y_position, width, height } = req.body;

    const updatedPlaceholder = await prisma.signaturePlaceholder.update({
      where: { placeholder_id: placeholderId },
      data: {
        page_number: parseInt(page_number),
        x_position: parseFloat(x_position),
        y_position: parseFloat(y_position),
        width: parseFloat(width),
        height: parseFloat(height)
      }
    });

    res.json(updatedPlaceholder);
  } catch (error) {
    console.error('Error updating signature placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to delete signature placeholder
router.delete('/signatures/:placeholderId', async (req: Request, res: Response) => {
  try {
    const { placeholderId } = req.params;

    await prisma.signaturePlaceholder.delete({
      where: { placeholder_id: placeholderId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting signature placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to place signature on document (create signed document record)
router.post('/documents/:documentId/sign', upload.single('signature_image'), async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { signee_id, x_position, y_position, width, height, page_number, document_file_id } = req.body;

    // Get user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { user_id: signee_id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { document_id: documentId }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify document file exists
    const documentFile = await prisma.documentFile.findUnique({
      where: { file_id: document_file_id }
    });

    if (!documentFile) {
      return res.status(404).json({ error: 'Document file not found' });
    }

    // Handle signature data (either from file upload or base64 string)
    let signatureData: string | undefined;

    if (req.file) {
      // If file was uploaded, store its path
      signatureData = `/uploads/signatures/${req.file.filename}`;
    } else if (req.body.signature_data) {
      // If signature data was passed as a base64 string
      signatureData = req.body.signature_data;
    } else if (user.signature) {
      // If user has a default signature
      signatureData = user.signature;
    }

    // Create the signed document record
    const signedDocument = await prisma.signedDocument.create({
      data: {
        document_id: documentId,
        signee_id: signee_id,
        x_position: parseFloat(x_position),
        y_position: parseFloat(y_position),
        width: parseFloat(width),
        height: parseFloat(height),
        page_number: parseInt(page_number),
        signature_data: signatureData,
        documentFileFile_id: document_file_id
      }
    });

    // Log signature to document trail
    await auditService.logDocumentSigned(signee_id, documentId, {
      description: `Document signed by ${user.first_name} ${user.last_name}`
    });

    // Update document status to reflect that it has been signed
    // await prisma.document.update({
    //   where: { document_id: documentId },
    //   data: {
    //     status: 'completed' // or another appropriate status
    //   }
    // });

    res.status(201).json(signedDocument);
  } catch (error) {
    console.error('Error placing signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get all signed documents for a document
router.get('/documents/:documentId/signed', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    const signedDocuments = await prisma.signedDocument.findMany({
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

    res.json(signedDocuments);
  } catch (error) {
    console.error('Error fetching signed documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
