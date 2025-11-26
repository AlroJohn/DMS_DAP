import { prisma } from '../lib/prisma';
import { User, Account } from '@prisma/client';
import { hash } from 'bcryptjs';

export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  user_name?: string;
  title?: string;
  type?: string;
  department_id: string;
  role_id: string;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  user_name?: string;
  title?: string;
  type?: string;
  department_id?: string;
  role_id?: string; // Add role_id to allow updating user's role
  active?: boolean;
}

export interface UserWithRelations {
  user_id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  user_name?: string;
  title?: string;
  type?: string;
  avatar?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  account: {
    email: string;
    is_active: boolean;
    email_verified: boolean;
    last_login?: Date;
  };
  department: {
    department_id: string;
    name: string;
    code: string;
  };
  user_roles?: {
    role: {
      role_id: string;
      name: string;
      code: string;
    };
  }[];
}

export class UserService {
  /**
   * Get all users with full relations (account, department, roles)
   */
  async getAllUsersWithRelations(): Promise<UserWithRelations[]> {
    const users = await prisma.user.findMany({
      include: {
        account: {
          select: {
            email: true,
            is_active: true,
            email_verified: true,
            last_login: true,
            department: {
              select: {
                department_id: true,
                name: true,
                code: true,
              }
            }
          }
        },
        user_roles: {
          where: { is_active: true },
          include: {
            role: {
              select: {
                role_id: true,
                name: true,
                code: true,
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return users.map(user => ({
      user_id: user.user_id,
      account_id: user.account_id,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || undefined,
      user_name: user.user_name || undefined,
      title: user.title || undefined,
      type: user.type || undefined,
      avatar: user.avatar || undefined,
      active: user.active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      account: {
        email: user.account.email,
        is_active: user.account.is_active,
        email_verified: user.account.email_verified,
        last_login: user.account.last_login || undefined,
      },
      department: {
        department_id: user.account.department?.department_id || '',
        name: user.account.department?.name || '',
        code: user.account.department?.code || '',
      },
      user_roles: user.user_roles.map(ur => ({
        role: {
          role_id: ur.role.role_id,
          name: ur.role.name,
          code: ur.role.code,
        }
      }))
    }));
  }

  /**
   * Get all users (without passwords) - legacy method
   */
  async getAllUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await prisma.user.findMany();
    return users.map(user => this.sanitizeUser(user));
  }

  /**
   * Get user by ID (without password)
   */
  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Get user by ID (with password for auth)
   */
  async getUserByIdWithPassword(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { user_id: userId },
    });
  }

  /**
   * Get user by email (with password for auth)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const account = await prisma.account.findUnique({
      where: { email },
      include: { user: true }
    });
    return account?.user || null;
  }

  /**
   * Get full user account by email
   */
  async getAccountByEmail(email: string) {
    return prisma.account.findUnique({
      where: { email },
      include: {
        department: true,
        user: {
          include: {
            user_roles: { include: { role: { include: { role_permissions: { include: { permission: true } } } } } },
            user_permissions: { include: { permission: true } },
          }
        }
      }
    });
  }


  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.update({
      where: { user_id: userId },
      data: updates,
    });
    return this.sanitizeUser(user);
  }

  /**
   * Create a new user with account
   */
  async createUser(userData: CreateUserData, createdByUserId: string): Promise<UserWithRelations> {
    try {
      console.log('🔍 Creating user - createdByUserId:', createdByUserId);
      
      // Get the account ID of the user creating this user
      // Try by user_id first, then by account_id if not found
      let creatorUser = await prisma.user.findUnique({
        where: { user_id: createdByUserId },
        select: { account_id: true }
      });

      // If not found by user_id, try by account_id (in case the token contains account_id)
      if (!creatorUser) {
        console.log('🔍 Creator user not found by user_id, trying by account_id');
        const creatorAccount = await prisma.account.findUnique({
          where: { account_id: createdByUserId },
          select: { account_id: true }
        });
        
        if (creatorAccount) {
          creatorUser = { account_id: creatorAccount.account_id };
        }
      }

      console.log('🔍 Creator user found:', creatorUser);

      if (!creatorUser) {
        throw new Error(`Creator user not found with ID: ${createdByUserId}`);
      }

      // Check if email already exists
      const existingAccount = await prisma.account.findUnique({
        where: { email: userData.email }
      });

      if (existingAccount) {
        throw new Error('Email already exists');
      }

      // Check if username already exists (if provided)
      if (userData.user_name) {
        const existingUser = await prisma.user.findUnique({
          where: { user_name: userData.user_name }
        });

        if (existingUser) {
          throw new Error('Username already exists');
        }
      }

      // Hash password
      const hashedPassword = await hash(userData.password, 12);

      // Create account and user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create account
        const account = await tx.account.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            department_id: userData.department_id,
            is_active: true,
            email_verified: false,
          }
        });

        // Create user
        const user = await tx.user.create({
          data: {
            account_id: account.account_id,
            department_id: userData.department_id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            middle_name: userData.middle_name,
            user_name: userData.user_name,
            title: userData.title,
            type: userData.type,
            active: true,
          }
        });

        // Assign role - use the creator's account ID for assigned_by
        await tx.userRole.create({
          data: {
            user_id: user.user_id,
            role_id: userData.role_id,
            assigned_by: creatorUser.account_id,
            is_active: true,
          }
        });

        return user;
      });

      // Return user with relations
      return await this.getUserByIdWithRelations(result.user_id) as UserWithRelations;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with full relations
   */
  async getUserByIdWithRelations(userId: string): Promise<UserWithRelations | null> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        account: {
          select: {
            email: true,
            is_active: true,
            email_verified: true,
            last_login: true,
            department: {
              select: {
                department_id: true,
                name: true,
                code: true,
              }
            }
          }
        },
        user_roles: {
          where: { is_active: true },
          include: {
            role: {
              select: {
                role_id: true,
                name: true,
                code: true,
              }
            }
          }
        }
      }
    });

    if (!user) return null;

    return {
      user_id: user.user_id,
      account_id: user.account_id,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || undefined,
      user_name: user.user_name || undefined,
      title: user.title || undefined,
      type: user.type || undefined,
      avatar: user.avatar || undefined,
      active: user.active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      account: {
        email: user.account.email,
        is_active: user.account.is_active,
        email_verified: user.account.email_verified,
        last_login: user.account.last_login || undefined,
      },
      department: {
        department_id: user.account.department?.department_id || '',
        name: user.account.department?.name || '',
        code: user.account.department?.code || '',
      },
      user_roles: user.user_roles.map(ur => ({
        role: {
          role_id: ur.role.role_id,
          name: ur.role.name,
          code: ur.role.code,
        }
      }))
    };
  }

  /**
   * Update user
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<UserWithRelations | null> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { user_id: userId }
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check if username conflicts (if provided)
      if (userData.user_name && userData.user_name !== existingUser.user_name) {
        const existingUsername = await prisma.user.findUnique({
          where: { user_name: userData.user_name }
        });

        if (existingUsername) {
          throw new Error('Username already exists');
        }
      }

              // Update user in transaction
            await prisma.$transaction(async (tx) => {
              // Update user
              await tx.user.update({
                where: { user_id: userId },
                data: {
                  first_name: userData.first_name,
                  last_name: userData.last_name,
                  middle_name: userData.middle_name,
                  user_name: userData.user_name,
                  title: userData.title,
                  type: userData.type,
                  department_id: userData.department_id,
                  active: userData.active,
                  updated_at: new Date(),
                }
              });
      
              // Update account department if department_id changed
              if (userData.department_id) {
                await tx.account.update({
                  where: { account_id: existingUser.account_id },
                  data: {
                    department_id: userData.department_id,
                  }
                });
              }
      
              // Update user role if role_id changed
              if (userData.role_id) {
                const currentRole = await tx.userRole.findFirst({
                  where: {
                    user_id: userId,
                    is_active: true,
                  },
                  orderBy: { assigned_at: 'desc' },
                });
      
                if (currentRole && currentRole.role_id !== userData.role_id) {
                  // Deactivate current role
                  await tx.userRole.update({
                    where: { id: currentRole.id },
                    data: { is_active: false },
                  });
      
                  // Assign new role
                  await tx.userRole.create({
                    data: {
                      user_id: userId,
                      role_id: userData.role_id,
                      assigned_by: existingUser.account_id, // Assuming the user performing the update is the one assigning the role
                      is_active: true,
                    },
                  });
                } else if (!currentRole) {
                  // If no current role, assign the new one
                  await tx.userRole.create({
                    data: {
                      user_id: userId,
                      role_id: userData.role_id,
                      assigned_by: existingUser.account_id,
                      is_active: true,
                    },
                  });
                }
              }
            });
      return await this.getUserByIdWithRelations(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Toggle user status (activate/deactivate)
   */
  async toggleUserStatus(userId: string): Promise<UserWithRelations | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: { account: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const newStatus = !user.active;

      // Update both user and account status
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { user_id: userId },
          data: { active: newStatus }
        });

        await tx.account.update({
          where: { account_id: user.account_id },
          data: { is_active: newStatus }
        });
      });

      return await this.getUserByIdWithRelations(userId);
    } catch (error) {
      console.error('Error toggling user status:', error);
      throw error;
    }
  }

  /**
   * Soft delete user (deactivate)
   */
  async softDeleteUser(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: { account: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.active) {
        throw new Error('User is already deactivated');
      }

      // Deactivate user and account
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { user_id: userId },
          data: { 
            active: false,
            updated_at: new Date()
          }
        });

        await tx.account.update({
          where: { account_id: user.account_id },
          data: { 
            is_active: false
          }
        });

        // Deactivate user roles
        await tx.userRole.updateMany({
          where: { 
            user_id: userId,
            is_active: true 
          },
          data: { 
            is_active: false
          }
        });

        // Also update any active sessions
        await tx.userSession.updateMany({
          where: {
            account_id: user.account_id,
            is_active: true
          },
          data: {
            is_active: false,
            updated_at: new Date()
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Error soft deleting user:', error);
      throw error;
    }
  }

  /**
   * Delete user (hard delete)
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      await prisma.user.delete({ where: { user_id: userId } });
      return true;
    } catch (error) {
      // e.g., record not found
      return false;
    }
  }

  /**
   * Get users for document sharing (with limited information)
   */
  async getUsersForDocumentSharing(): Promise<UserWithRelations[]> {
    try {
      // First, get the users with their account info using proper Prisma relations
      // Note: User has account relation but not direct department relation
      // The department information comes through the account's department relation
      const usersWithAccount = await prisma.user.findMany({
        where: {
          active: true,  // Only return active users
        },
        include: {
          account: {
            select: {
              email: true,
              is_active: true,
              email_verified: true,
              last_login: true,
              department: {
                select: {
                  department_id: true,
                  name: true,
                  code: true,
                }
              }
            },
          },
        },
        orderBy: { last_name: 'asc' }  // Order by last name alphabetically
      });

      // Transform the data to match UserWithRelations interface
      return usersWithAccount.map(user => ({
        user_id: user.user_id,
        account_id: user.account_id,
        first_name: user.first_name,
        last_name: user.last_name,
        middle_name: user.middle_name || undefined,
        user_name: user.user_name || undefined,
        title: user.title || undefined,
        type: user.type || undefined,
        avatar: user.avatar || undefined,
        active: user.active,
        created_at: user.created_at,
        updated_at: user.updated_at,
        account: {
          email: user.account?.email || '', 
          is_active: user.account?.is_active || false,
          email_verified: user.account?.email_verified || false,
          last_login: user.account?.last_login || undefined, // Convert null to undefined
        },
        department: {
          // Get department info from the account's department relation
          department_id: user.account?.department?.department_id || '',
          name: user.account?.department?.name || '',
          code: user.account?.department?.code || '',
        },
        user_roles: [] // Not including roles for document sharing to keep it simple
      }));
    } catch (error) {
      console.error('Error in getUsersForDocumentSharing:', error);
      throw error;
    }
  }

  /**
   * Remove password from user object
   */
  private sanitizeUser(user: User): Omit<User, 'password'> {
    // The prisma User model doesn't have a password. The password is on the Account model.
    // So, this function is not strictly necessary for the User model itself, but if we were to merge User and Account, it would be.
    // For now, it just returns the user as-is, assuming the password is not on the object.
    const { ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
