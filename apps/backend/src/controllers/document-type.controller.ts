import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth-middleware';
import { DocumentTypeService } from '../services/document-type.service';

export class DocumentTypeController {
  private documentTypeService: DocumentTypeService;
  
  constructor() {
    this.documentTypeService = new DocumentTypeService();
  }
  
  // Get all document types with pagination and search
  async getAllDocumentTypes(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      
      const result = await this.documentTypeService.getAllDocumentTypes(pageNum, limitNum, search as string);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching document types:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching document types',
        error: (error as Error).message
      });
    }
  }

  // Get document type by ID
  async getDocumentTypeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const documentType = await this.documentTypeService.getDocumentTypeById(id);
      
      if (!documentType) {
        return res.status(404).json({
          success: false,
          message: 'Document type not found'
        });
      }
      
      res.json({
        success: true,
        data: documentType
      });
    } catch (error) {
      console.error('Error fetching document type:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching document type',
        error: (error as Error).message
      });
    }
  }

  // Create new document type
  async createDocumentType(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const { name, description = '', active = true } = req.body;
      
      // Validation
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Document type name is required'
        });
      }
      
      try {
        const documentType = await this.documentTypeService.createDocumentType(
          name.trim(), 
          description, 
          active
        );
        
        res.status(201).json({
          success: true,
          message: 'Document type created successfully',
          data: documentType
        });
      } catch (serviceError) {
        // Handle specific service errors
        if ((serviceError as Error).message === 'Document type name is required') {
          return res.status(400).json({
            success: false,
            message: (serviceError as Error).message
          });
        } else if ((serviceError as Error).message === 'Document type with this name already exists') {
          return res.status(409).json({
            success: false,
            message: (serviceError as Error).message
          });
        }
        throw serviceError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error creating document type:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating document type',
        error: (error as Error).message
      });
    }
  }

  // Update document type
  async updateDocumentType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, active } = req.body;
      
      // Validation
      if (name === undefined && description === undefined && active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one field (name, description, or active) must be provided for update'
        });
      }
      
      try {
        const updatedType = await this.documentTypeService.updateDocumentType(id, name?.trim(), description, active);
        
        res.json({
          success: true,
          message: 'Document type updated successfully',
          data: updatedType
        });
      } catch (serviceError) {
        // Handle specific service errors
        if ((serviceError as Error).message === 'Document type not found') {
          return res.status(404).json({
            success: false,
            message: (serviceError as Error).message
          });
        } else if ((serviceError as Error).message === 'Document type with this name already exists') {
          return res.status(409).json({
            success: false,
            message: (serviceError as Error).message
          });
        }
        throw serviceError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error updating document type:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating document type',
        error: (error as Error).message
      });
    }
  }

  // Delete document type (hard delete)
  async deleteDocumentType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      try {
        const deletedType = await this.documentTypeService.deleteDocumentType(id);
        
        res.json({
          success: true,
          message: 'Document type deleted successfully',
          data: deletedType
        });
      } catch (serviceError) {
        // Handle specific service errors
        if ((serviceError as Error).message === 'Document type not found') {
          return res.status(404).json({
            success: false,
            message: (serviceError as Error).message
          });
        }
        throw serviceError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error deleting document type:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting document type',
        error: (error as Error).message
      });
    }
  }

  // Toggle document type status
  async toggleDocumentTypeStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      try {
        const updatedType = await this.documentTypeService.toggleDocumentTypeStatus(id);
        
        res.json({
          success: true,
          message: `Document type ${updatedType.active ? 'activated' : 'deactivated'} successfully`,
          data: updatedType
        });
      } catch (serviceError) {
        // Handle specific service errors
        if ((serviceError as Error).message === 'Document type not found') {
          return res.status(404).json({
            success: false,
            message: (serviceError as Error).message
          });
        } else if ((serviceError as Error).message === 'Cannot activate document type that is still in use by documents') {
          return res.status(400).json({
            success: false,
            message: (serviceError as Error).message
          });
        }
        throw serviceError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error toggling document type status:', error);
      res.status(500).json({
        success: false,
        message: 'Error toggling document type status',
        error: (error as Error).message
      });
    }
  }
}