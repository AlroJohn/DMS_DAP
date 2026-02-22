import { Response } from 'express';
import { AuthRequest } from '../middleware/auth-middleware';
import { auditService } from '../services/audit.service';

export class DocumentTrailingController {
  // Helper method to extract string value from potentially array parameter
  private getStringValue = (param: string | string[] | undefined): string | undefined => {
    if (Array.isArray(param)) {
      return param[0];
    }
    return param;
  };

  // Get document trails for a specific department
  async getDocumentTrailsForDepartment(req: AuthRequest, res: Response) {
    try {
      const departmentId = this.getStringValue(req.params.departmentId);
      const userId = req.user?.id; // Assuming user info is attached by auth middleware
      if (!departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required',
        });
      }
      
      const { 
        status, 
        ownership, 
        searchTerm, 
        fromDate, 
        toDate, 
        classification, 
        documentType 
      } = req.query;

      const filters = {
        status: status as string,
        ownership: ownership as 'owned' | 'shared' | 'all',
        searchTerm: searchTerm as string,
        fromDate: fromDate as string,
        toDate: toDate as string,
        classification: classification as string,
        documentType: documentType as string,
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
  async getDocumentTrailDetails(req: AuthRequest, res: Response) {
    try {
      const documentId = this.getStringValue(req.params.documentId);
      const departmentId = req.user?.department_id; // Assuming department info is attached by auth middleware

      if (!documentId || !departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID and department ID are required',
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
