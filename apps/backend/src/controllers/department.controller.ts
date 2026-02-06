import { Request, Response } from 'express';
import { io } from '../index'; // For real-time notifications
import { AuthRequest } from '../middleware/auth-middleware';
import { DepartmentService } from '../services/department.service';

export class DepartmentController {
  private departmentService: DepartmentService;

  constructor() {
    this.departmentService = new DepartmentService();
  }

  // Helper method to extract string value from potentially array parameter
  private getStringValue = (param: string | string[] | undefined): string | undefined => {
    if (Array.isArray(param)) {
      return param[0];
    }
    return param;
  };

  // Get all departments with pagination
  async getAllDepartments(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search = '', hierarchy = 'false' } = req.query;

      if (String(hierarchy).toLowerCase() === 'true') {
        const result = await this.departmentService.getDepartmentHierarchy();
        return res.json({
          success: true,
          data: result
        });
      }

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
      // Helper function to extract string value from potentially array parameter
      const getStringValue = (param: string | string[] | undefined): string | undefined => {
        if (Array.isArray(param)) {
          return param[0]; // Take the first value if it's an array
        }
        return param;
      };
      
      const { id } = req.params;
      const idStr = getStringValue(id);

      if (!idStr) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID'
        });
      }

      const department = await this.departmentService.getDepartmentById(idStr);

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
      const { name, code, group_id, groupId, center_id, centerId } = req.body;
      const resolvedGroupId = group_id ?? groupId ?? null;

      // Validation
      if (!name || !code || !resolvedGroupId) {
        return res.status(400).json({
          success: false,
          message: 'Name, code, and group are required'
        });
      }

      try {
        const department = await this.departmentService.createDepartment(
          name, 
          code.toUpperCase(), 
          authReq.user?.id || '00000000-0000-0000-0000-000000000000', // This would be the user ID
          resolvedGroupId,
          center_id ?? centerId ?? null
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
      // Helper function to extract string value from potentially array parameter
      const getStringValue = (param: string | string[] | undefined): string | undefined => {
        if (Array.isArray(param)) {
          return param[0]; // Take the first value if it's an array
        }
        return param;
      };
      
      const { id } = req.params;
      const idStr = getStringValue(id);
      const { name, code, active, group_id, groupId, center_id, centerId } = req.body;

      // Validation
      if (!idStr) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID'
        });
      }

      if (!name || !code || active === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Name, code, and active status are required'
        });
      }

      try {
        const updatedDepartment = await this.departmentService.updateDepartment(
          idStr,
          name,
          code.toUpperCase(),
          active,
          group_id ?? groupId ?? undefined,
          center_id ?? centerId
        );

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
      // Helper function to extract string value from potentially array parameter
      const getStringValue = (param: string | string[] | undefined): string | undefined => {
        if (Array.isArray(param)) {
          return param[0]; // Take the first value if it's an array
        }
        return param;
      };
      
      const { id } = req.params;
      const idStr = getStringValue(id);

      if (!idStr) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID'
        });
      }

      try {
        await this.departmentService.hardDeleteDepartment(idStr);

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
      // Helper function to extract string value from potentially array parameter
      const getStringValue = (param: string | string[] | undefined): string | undefined => {
        if (Array.isArray(param)) {
          return param[0]; // Take the first value if it's an array
        }
        return param;
      };
      
      const { id } = req.params;
      const idStr = getStringValue(id);

      if (!idStr) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID'
        });
      }

      try {
        const updatedDepartment = await this.departmentService.toggleDepartmentStatus(idStr);

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

  // Get users by department ID
  async getUsersByDepartment(req: Request, res: Response) {
    try {
      const id = this.getStringValue(req.params.id);
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID'
        });
      }

      const users = await this.departmentService.getUsersByDepartmentId(id);

      res.json({
        success: true,
        users
      });
    } catch (error) {
      console.error('Error fetching users for department:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching users for department',
        error: (error as Error).message
      });
    }
  }
}
