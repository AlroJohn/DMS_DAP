import { Request, Response } from 'express';
import { DocumentTrailsService } from '../services/document-trails.service';

const documentTrailsService = new DocumentTrailsService();

export class DocumentTrailsController {
  // Get all document trails for a specific document
  async getDocumentTrails(req: Request, res: Response) {
    try {
      const { documentId } = req.params;

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
        });
      }

      const trails = await documentTrailsService.getDocumentTrails(documentId);

      res.status(200).json({
        success: true,
        data: trails,
        message: 'Document trails retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getDocumentTrails:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Create a new document trail
  async createDocumentTrail(req: Request, res: Response) {
    try {
      const { document_id, action_id, from_department, to_department, user_id, status, remarks } = req.body;

      // Validate required fields
      if (!document_id || !status) {
        return res.status(400).json({
          success: false,
          message: 'Document ID and status are required',
        });
      }

      const trail = await documentTrailsService.createDocumentTrail({
        document_id,
        action_id,
        from_department,
        to_department,
        user_id,
        status,
        remarks,
      });

      res.status(201).json({
        success: true,
        data: trail,
        message: 'Document trail created successfully',
      });
    } catch (error) {
      console.error('Error in createDocumentTrail:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Update an existing document trail
  async updateDocumentTrail(req: Request, res: Response) {
    try {
      const { trailId } = req.params;
      const { action_id, from_department, to_department, user_id, status, remarks } = req.body;

      if (!trailId) {
        return res.status(400).json({
          success: false,
          message: 'Trail ID is required',
        });
      }

      const trail = await documentTrailsService.updateDocumentTrail(trailId, {
        action_id,
        from_department,
        to_department,
        user_id,
        status,
        remarks,
      });

      res.status(200).json({
        success: true,
        data: trail,
        message: 'Document trail updated successfully',
      });
    } catch (error) {
      console.error('Error in updateDocumentTrail:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Get document trail by ID
  async getDocumentTrailById(req: Request, res: Response) {
    try {
      const { trailId } = req.params;

      if (!trailId) {
        return res.status(400).json({
          success: false,
          message: 'Trail ID is required',
        });
      }

      const trail = await documentTrailsService.getDocumentTrailById(trailId);

      if (!trail) {
        return res.status(404).json({
          success: false,
          message: 'Document trail not found',
        });
      }

      res.status(200).json({
        success: true,
        data: trail,
        message: 'Document trail retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getDocumentTrailById:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Delete a document trail
  async deleteDocumentTrail(req: Request, res: Response) {
    try {
      const { trailId } = req.params;

      if (!trailId) {
        return res.status(400).json({
          success: false,
          message: 'Trail ID is required',
        });
      }

      await documentTrailsService.deleteDocumentTrail(trailId);

      res.status(200).json({
        success: true,
        message: 'Document trail deleted successfully',
      });
    } catch (error) {
      console.error('Error in deleteDocumentTrail:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }

  // Get all document trails with optional filters
  async getAllDocumentTrails(req: Request, res: Response) {
    try {
      const { userId, departmentId, status, fromDate, toDate } = req.query;

      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (departmentId) filters.departmentId = departmentId as string;
      if (status) filters.status = status as string;
      if (fromDate) filters.fromDate = fromDate as string;
      if (toDate) filters.toDate = toDate as string;

      const trails = await documentTrailsService.getAllDocumentTrails(filters);

      res.status(200).json({
        success: true,
        data: trails,
        message: 'Document trails retrieved successfully',
      });
    } catch (error) {
      console.error('Error in getAllDocumentTrails:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message,
      });
    }
  }
}