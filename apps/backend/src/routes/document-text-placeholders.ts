import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

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
      text_value,
      assigned_user_id
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

    if (assigned_user_id) {
      const assignedUser = await prisma.user.findUnique({
        where: { user_id: assigned_user_id }
      });

      if (!assignedUser) {
        return res.status(404).json({ error: 'Assigned user not found' });
      }
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
        text_value,
        assigned_user_id: assigned_user_id || null
      }
    });

    res.status(201).json(placeholder);
  } catch (error) {
    console.error('Error creating text placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to update a text placeholder
router.put('/documents/:documentId/update-text-placeholder', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { placeholder_id, text_value } = req.body;

    // Validate input
    if (!placeholder_id) {
      return res.status(400).json({ error: 'Placeholder ID is required' });
    }

    // Verify the placeholder belongs to the document
    const placeholder = await prisma.textPlaceholder.findFirst({
      where: {
        placeholder_id,
        document_id: documentId
      }
    });

    if (!placeholder) {
      return res.status(404).json({ error: 'Text placeholder not found for this document' });
    }

    // Update the text value - allow empty strings but not undefined/null
    const updatedPlaceholder = await prisma.textPlaceholder.update({
      where: {
        placeholder_id
      },
      data: {
        text_value: text_value ?? ''  // Use empty string if null/undefined
      }
    });

    res.json(updatedPlaceholder);
  } catch (error) {
    console.error('Error updating text placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to update a text placeholder
router.put('/documents/:documentId/update-text-placeholder', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { placeholder_id, text_value } = req.body;

    // Validate input
    if (!placeholder_id) {
      return res.status(400).json({ error: 'Placeholder ID is required' });
    }

    // Verify the placeholder belongs to the document
    const placeholder = await prisma.textPlaceholder.findFirst({
      where: {
        placeholder_id,
        document_id: documentId
      }
    });

    if (!placeholder) {
      return res.status(404).json({ error: 'Text placeholder not found for this document' });
    }

    // Update the text value - allow empty strings but not undefined/null
    const updatedPlaceholder = await prisma.textPlaceholder.update({
      where: {
        placeholder_id
      },
      data: {
        text_value: text_value ?? ''  // Use empty string if null/undefined
      }
    });

    res.json(updatedPlaceholder);
  } catch (error) {
    console.error('Error updating text placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to delete a text placeholder
router.delete('/documents/:documentId/delete-text-placeholder', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { placeholder_id } = req.body;

    // Verify the placeholder belongs to the document
    const placeholder = await prisma.textPlaceholder.findFirst({
      where: {
        placeholder_id,
        document_id: documentId
      }
    });

    if (!placeholder) {
      return res.status(404).json({ error: 'Text placeholder not found for this document' });
    }

    // Delete the text placeholder
    await prisma.textPlaceholder.delete({
      where: {
        placeholder_id
      }
    });

    res.json({ message: 'Text placeholder deleted successfully' });
  } catch (error) {
    console.error('Error deleting text placeholder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
