import { Request, Response } from 'express';
import { auditService } from '../services/audit.service';

export class DocumentTrailingController {
  // Get document trails for a specific department
  async getDocumentTrailsForDepartment(req: Request, res: Response) {
    try {
      const departmentId = req.params.departmentId;
      const userId = req.user?.id; // Assuming user info is attached by auth middleware
      
      const { status, ownership, searchTerm } = req.query;

      const filters = {
        status: status as string,
        ownership: ownership as 'owned' | 'shared' | 'all',
        searchTerm: searchTerm as string,
      };

      const trails = await auditService.getDocumentTrailsForDepartment(
        departmentId,
        userId,
        filters
      );

      res.status(200).json({
        success: true,
        message: 'Document trails retrieved successfully',
        data: trails,
      });
    } catch (error) {
      console.error('Error in getDocumentTrailsForDepartment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve document trails',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get detailed trail history for a specific document
  async getDocumentTrailDetails(req: Request, res: Response) {
    try {
      const { documentId } = req.params;
      const departmentId = req.user?.department_id; // Assuming department info is attached by auth middleware

      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required',
        });
      }

      const result = await auditService.getDocumentTrailDetails(documentId, departmentId);

      res.status(200).json({
        success: true,
        message: 'Document trail details retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error in getDocumentTrailDetails:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve document trail details',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
