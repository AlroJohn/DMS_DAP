import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Endpoint to get text placeholders for a document
router.get('/documents/:documentId/text-placeholders', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    const placeholders = await prisma.textPlaceholder.findMany({
      where: { document_id: documentId },
      include: {
        documentFile: true
      }
    });

    res.json(placeholders);
  } catch (error) {
    console.error('Error fetching text placeholders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to create text placeholders
router.post('/documents/:documentId/text-placeholders', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const {
      document_file_id,
      page_number,
      x_position,
      y_position,
      width,
      height,
      font_family,
      font_size,
      font_color,
      text_value
    } = req.body;

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

    const placeholder = await prisma.textPlaceholder.create({
      data: {
        document_id: documentId,
        document_file_id,
        page_number,
        x_position,
        y_position,
        width,
        height,
        font_family,
        font_size,
        font_color,
        text_value
      }
    });

    res.status(201).json(placeholder);
  } catch (error) {
    console.error('Error creating text placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
