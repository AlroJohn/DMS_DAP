import { Request, Response } from 'express';
import { io } from '../index'; // For real-time notifications
import { AuthRequest } from '../middleware/auth-middleware';
import { DepartmentService } from '../services/department.service';

export class DepartmentController {
  private departmentService: DepartmentService;

  constructor() {
    this.departmentService = new DepartmentService();
  }

  // Get all departments with pagination
  async getAllDepartments(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const result = await this.departmentService.getAllDepartments(pageNum, limitNum, search as string);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching departments',
        error: (error as Error).message
      });
    }
  }

  // Get a specific department by ID
  async getDepartmentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const department = await this.departmentService.getDepartmentById(id);

      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      res.json({
        success: true,
        data: department
      });
    } catch (error) {
      console.error('Error fetching department:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching department',
        error: (error as Error).message
      });
    }
  }

  // Create a new department
  async createDepartment(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const { name, code } = req.body;

      // Validation
      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Name and code are required'
        });
      }

      try {
        const department = await this.departmentService.createDepartment(
          name, 
          code.toUpperCase(), 
          authReq.user?.id || '00000000-0000-0000-0000-000000000000' // This would be the user ID
        );

        res.status(201).json({
          success: true,
          message: 'Department created successfully',
          data: department
        });
      } catch (serviceError) {
        // Handle specific service errors
        if ((serviceError as Error).message === 'Department code already exists') {
          return res.status(409).json({
            success: false,
            message: (serviceError as Error).message
          });
        }
        if ((serviceError as Error).message === 'User not found') {
          return res.status(404).json({
            success: false,
            message: (serviceError as Error).message
          });
        }
        throw serviceError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error creating department:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating department',
        error: (error as Error).message
      });
    }
  }

  // Update a department
  async updateDepartment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, active } = req.body;

      // Validation
      if (!name || !code || active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Name, code, and active status are required'
        });
      }

      try {
        const updatedDepartment = await this.departmentService.updateDepartment(id, name, code.toUpperCase(), active);

        res.json({
          success: true,
          message: 'Department updated successfully',
          data: updatedDepartment
        });
      } catch (serviceError) {
        // Handle specific service errors
        if ((serviceError as Error).message === 'Department not found') {
          return res.status(404).json({
            success: false,
            message: (serviceError as Error).message
          });
        } else if ((serviceError as Error).message === 'Department code already exists') {
          return res.status(409).json({
            success: false,
            message: (serviceError as Error).message
          });
        }
        throw serviceError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error updating department:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating department',
        error: (error as Error).message
      });
    }
  }

  // Delete a department (permanently)
  async deleteDepartment(req: Request, res: Response) {
    try {
      const { id } = req.params;

      try {
        await this.departmentService.hardDeleteDepartment(id);

        res.json({
          success: true,
          message: 'Department permanently deleted successfully',
        });
      } catch (serviceError) {
        // Handle specific service errors
        if ((serviceError as Error).message === 'Department not found') {
          return res.status(404).json({
            success: false,
            message: (serviceError as Error).message
          });
        }
        throw serviceError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting department',
        error: (error as Error).message
      });
    }
  }

  // Toggle department active status
  async toggleDepartmentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;

      try {
        const updatedDepartment = await this.departmentService.toggleDepartmentStatus(id);

        res.json({
          success: true,
          message: `Department ${updatedDepartment.active ? 'activated' : 'deactivated'} successfully`,
          data: updatedDepartment
        });
      } catch (serviceError) {
        // Handle specific service errors
        if ((serviceError as Error).message === 'Department not found') {
          return res.status(404).json({
            success: false,
            message: (serviceError as Error).message
          });
        }
        throw serviceError; // Re-throw other errors
      }
    } catch (error) {
      console.error('Error toggling department status:', error);
      res.status(500).json({
        success: false,
        message: 'Error toggling department status',
        error: (error as Error).message
      });
    }
  }
}