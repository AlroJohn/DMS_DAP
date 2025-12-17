import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DocumentSignatureWorkflowService } from '../services/DocumentSignatureWorkflowService.service';

const router = express.Router();
const prisma = new PrismaClient();

// Endpoint to get signature placeholders for a document
router.get('/documents/:documentId/signature-placeholders', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

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
    const { documentId } = req.params;
    const { document_file_id, page_number, x_position, y_position, width, height } = req.body;

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

    const placeholder = await prisma.signaturePlaceholder.create({
      data: {
        document_id: documentId,
        document_file_id,
        page_number,
        x_position,
        y_position,
        width,
        height
      }
    });

    res.status(201).json(placeholder);
  } catch (error) {
    console.error('Error creating signature placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to place a signature on a document
router.post('/documents/:documentId/place-signature', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
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
        document_id: documentId,
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

    // Update document status to reflect signing
    await prisma.document.update({
      where: { document_id: documentId },
      data: {
        status: 'completed' // or another appropriate status
      }
    });

    res.status(201).json(signedDocument);
  } catch (error) {
    console.error('Error placing signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to process document with all signatures
router.post('/documents/:documentId/process-signed-document', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
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
    const { documentId } = req.params;

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

export default router;