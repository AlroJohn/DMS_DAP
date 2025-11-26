import { prisma } from '../lib/prisma';
import { Department } from '@prisma/client';
import { io } from '../index'; // For real-time notifications

export class DepartmentService {
  /**
   * Get all departments with pagination and search
   */
  async getAllDepartments(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;

    let whereClause: any = {}; // Return all departments by default

    // Add search functionality
    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive' // Case insensitive search
      };
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          Account: {
            select: {
              email: true,
              user: {
                select: {
                  first_name: true,
                  last_name: true
                }
              }
            }
          }
        }
      }),
      prisma.department.count({ where: whereClause })
    ]);

    return {
      data: departments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string) {
    return await prisma.department.findUnique({
      where: { department_id: id },
      include: {
        Account: {
          select: {
            email: true,
            user: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        }

      }
    });
  }

  /**
   * Create a new department
   */
  async createDepartment(name: string, code: string, userId: string) {
    // Check if department code already exists
    const existingDepartment = await prisma.department.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existingDepartment) {
      throw new Error('Department code already exists');
    }

    // Get the account ID associated with the user ID
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { account_id: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const department = await prisma.department.create({
      data: {
        name,
        code: code.toUpperCase(), // Store codes in uppercase for consistency
        created_by: user.account_id
      }
    });

    // Emit real-time notification
    if (io) {
      io.emit('department_created', {
        message: `New department "${department.name}" was created`,
        department: department
      });
    }

    return department;
  }

  /**
   * Update a department
   */
  async updateDepartment(id: string, name: string, code: string, active: boolean) {
    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { department_id: id }
    });

    if (!existingDepartment) {
      throw new Error('Department not found');
    }

    // Check if new code already exists for a different department
    if (existingDepartment.code !== code.toUpperCase()) {
      const duplicateCode = await prisma.department.findFirst({
        where: {
          code: code.toUpperCase(),
          department_id: { not: id } // Exclude current department
        }
      });

      if (duplicateCode) {
        throw new Error('Department code already exists');
      }
    }

    const updatedDepartment = await prisma.department.update({
      where: { department_id: id },
      data: {
        name,
        code: code.toUpperCase(),
        active
      }
    });

    // Emit real-time notification
    if (io) {
      io.emit('department_updated', {
        message: `Department "${updatedDepartment.name}" was updated`,
        department: updatedDepartment
      });
    }

    return updatedDepartment;
  }

  /**
   * Deactivate a department (soft delete)
   */
  async deactivateDepartment(id: string) {
    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { department_id: id }
    });

    if (!existingDepartment) {
      throw new Error('Department not found');
    }

    const updatedDepartment = await prisma.department.update({
      where: { department_id: id },
      data: { active: false }
    });

    // Emit real-time notification
    if (io) {
      io.emit('department_deleted', {
        message: `Department "${updatedDepartment.name}" was deactivated`,
        department: updatedDepartment
      });
    }

    return updatedDepartment;
  }

  /**
   * Activate a department
   */
  async activateDepartment(id: string) {
    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { department_id: id }
    });

    if (!existingDepartment) {
      throw new Error('Department not found');
    }

    const updatedDepartment = await prisma.department.update({
      where: { department_id: id },
      data: { active: true }
    });

    // Emit real-time notification
    if (io) {
      io.emit('department_activated', {
        message: `Department "${updatedDepartment.name}" was activated`,
        department: updatedDepartment
      });
    }

    return updatedDepartment;
  }

  /**
   * Permanently delete a department
   */
  async hardDeleteDepartment(id: string) {
    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { department_id: id }
    });

    if (!existingDepartment) {
      throw new Error('Department not found');
    }

    const deletedDepartment = await prisma.department.delete({
      where: { department_id: id }
    });

    // Emit real-time notification
    if (io) {
      io.emit('department_deleted_permanently', {
        message: `Department "${deletedDepartment.name}" was permanently deleted`,
        departmentId: deletedDepartment.department_id
      });
    }

    return deletedDepartment;
  }

  /**
   * Toggle department status
   */
  async toggleDepartmentStatus(id: string) {
    // Check if department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { department_id: id }
    });

    if (!existingDepartment) {
      throw new Error('Department not found');
    }

    const updatedDepartment = await prisma.department.update({
      where: { department_id: id },
      data: { active: !existingDepartment.active }
    });

    // Emit real-time notification
    if (io) {
      const action = updatedDepartment.active ? 'activated' : 'deactivated';
      io.emit('department_status_changed', {
        message: `Department "${updatedDepartment.name}" was ${action}`,
        department: updatedDepartment
      });
    }

    return updatedDepartment;
  }
}