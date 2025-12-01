import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Super Admin...');

  try {
    // Step 1: Clear existing superadmin if exists
    console.log('🧹 Checking for existing superadmin...');
    const existingSuperAdmin = await prisma.account.findUnique({
      where: { email: 'superadmin@dms.com' }
    });

    if (existingSuperAdmin) {
      console.log('🗑️ Removing existing superadmin...');
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.findUnique({
          where: { account_id: existingSuperAdmin.account_id }
        });

        if (user) {
          await tx.userRole.deleteMany({
            where: { user_id: user.user_id }
          });
          await tx.user.delete({
            where: { user_id: user.user_id }
          });
        }

        // Delete RolePermissions associated with roles created by the super admin
        await tx.rolePermission.deleteMany({
          where: {
            granted_by: existingSuperAdmin.account_id
          }
        });

        // Delete UserRoles associated with roles created by the super admin
        await tx.userRole.deleteMany({
          where: {
            assigned_by: existingSuperAdmin.account_id
          }
        });

        // Delete UserInvitations that reference roles created by super admin first
        await tx.userInvitation.deleteMany({
          where: {
            role_id: {
              in: (await tx.role.findMany({
                where: {
                  OR: [
                    { created_by: existingSuperAdmin.account_id },
                    { updated_by: existingSuperAdmin.account_id }
                  ]
                },
                select: { role_id: true }
              })).map(r => r.role_id)
            }
          }
        });

        // Delete roles created or updated by the super admin
        await tx.role.deleteMany({
          where: {
            OR: [
              { created_by: existingSuperAdmin.account_id },
              { updated_by: existingSuperAdmin.account_id }
            ]
          }
        });

        await tx.account.delete({
          where: { account_id: existingSuperAdmin.account_id }
        });
      });
    }

    // Step 2: Create temporary department if none exists
    console.log('📁 Creating temporary department...');
    let tempDepartment = await prisma.department.findFirst();

    if (!tempDepartment) {
      tempDepartment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const dept = await tx.department.create({
          data: {
            name: 'Administration',
            code: 'ADMIN',
            active: true,
            created_by: '00000000-0000-0000-0000-000000000000'  // Will be a placeholder
          }
        });
        console.log('✅ Created temporary department');
        return dept;
      });
    } else {
      console.log('✅ Using existing department');
    }

    // Step 3: Create the Super Admin account and user
    console.log('👑 Creating Super Admin account...');
    const superAdminPassword = await bcrypt.hash('admin123', 12); // Use strong password in production

    const superAdminAccount = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create account first
      const account = await tx.account.create({
        data: {
          email: 'superadmin@dms.com',
          password: superAdminPassword,
          email_verified: true,
          is_active: true,
          last_login: new Date(),
          department_id: tempDepartment.department_id
        }
      });

      // Create user associated with the account
      const user = await tx.user.create({
        data: {
          account_id: account.account_id,
          department_id: tempDepartment.department_id,
          first_name: 'Super',
          last_name: 'Admin',
          active: true,
          title: 'System Administrator'
        }
      });

      // Now update the department to reference the account
      await tx.department.update({
        where: { department_id: tempDepartment.department_id },
        data: { created_by: account.account_id }
      });

      return account;
    });

    // Step 4: Create permission definitions if they don't exist
    console.log('🔐 Creating permission definitions...');

    // Define all permissions that exist in the schema
    const permissions = [
      'document_read', 'document_write', 'document_edit', 'document_delete',
      'document_create', 'document_upload', 'document_download', 'document_share',
      'document_archive', 'document_restore', 'document_move', 'document_copy',
      'document_metadata_read', 'document_metadata_write', 'document_metadata_edit',
      'document_routing_read', 'document_routing_create', 'document_routing_edit', 'document_routing_delete', 'document_routing_approve',
      'document_transfer_initiate', 'document_transfer_approve', 'document_transfer_receive', 'document_transfer_reject', 'document_transfer_track',
      'document_custody_view', 'document_custody_transfer', 'document_custody_receive', 'document_custody_witness',
      'document_audit_read', 'document_audit_export', 'document_audit_verify',
      'document_recycle_view', 'document_recycle_restore', 'document_recycle_permanent_delete', 'document_recycle_bulk_restore', 'document_recycle_bulk_delete',
      'document_type_read', 'document_type_create', 'document_type_edit', 'document_type_delete',
      'department_read', 'department_create', 'department_edit', 'department_delete', 'department_users_manage',
      'user_read', 'user_create', 'user_edit', 'user_delete', 'user_activate', 'user_deactivate',
      'role_read', 'role_create', 'role_edit', 'role_delete', 'role_assign',
      'permission_edit', 'permission_create', 'permission_delete', 'permission_read', 'permission_assign', 'permission_revoke',
      'system_settings_read', 'system_settings_write', 'system_logs_read', 'system_backup', 'system_restore', 'system_maintenance',
      'notification_read', 'notification_send', 'notification_manage',
      'report_read', 'report_generate', 'report_export', 'report_schedule',
      'api_read', 'api_write', 'api_delete', 'api_admin',
      'document_action_read', 'document_action_create', 'document_action_edit', 'document_action_delete'
    ];

    // Create permissions that don't exist yet (outside transaction to avoid timeout)
    for (const permission of permissions) {
      const existingPermission = await prisma.permissionDefinition.findUnique({
        where: { permission: permission as any }
      });

      if (!existingPermission) {
        await prisma.permissionDefinition.create({
          data: {
            permission: permission as any,
            resource_type: permission.includes('document') ? 'document' :
                         permission.includes('user') ? 'user' :
                         permission.includes('role') ? 'role' :
                         permission.includes('department') ? 'department' :
                         permission.includes('permission') ? 'permission' :
                         permission.includes('system') ? 'system' :
                         permission.includes('notification') ? 'notification' :
                         permission.includes('report') ? 'report' : 'document',
            description: `Permission to ${permission.replace(/_/g, ' ')}`,
            is_active: true
          }
        });
        console.log(`✅ Created permission: ${permission}`);
      }
    }

    // Step 5: Create Super Admin role
    console.log('👥 Creating Super Admin role...');
    let superAdminRole = await prisma.role.findUnique({
      where: { code: 'SUPER_ADMIN' }
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const role = await tx.role.create({
          data: {
            name: 'Super Administrator',
            code: 'SUPER_ADMIN',
            description: 'Full system access with all permissions',
            is_system_role: true,
            is_active: true,
            created_by: superAdminAccount.account_id  // This account created the role
          }
        });
        console.log('✅ Created Super Admin role');
        return role;
      });
    } else {
      console.log('✅ Using existing Super Admin role');
    }

    // Step 6: Get all permissions and assign them to Super Admin role
    console.log('🔗 Assigning all permissions to Super Admin role...');
    const allPermissions = await prisma.permissionDefinition.findMany({
      where: { is_active: true }
    });

    // Assign all permissions to Super Admin role
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingRolePermissions = await tx.rolePermission.findMany({
        where: { role_id: superAdminRole.role_id }
      });

      // Remove existing role permissions if any
      if (existingRolePermissions.length > 0) {
        await tx.rolePermission.deleteMany({
          where: { role_id: superAdminRole.role_id }
        });
        console.log(`✅ Removed ${existingRolePermissions.length} existing role permissions`);
      }

      // Create new role permissions
      const rolePermissionsData = allPermissions.map(permission => ({
        role_id: superAdminRole!.role_id,
        permission_id: permission.permission_id,
        scope: 'global' as any,
        granted_by: superAdminAccount.account_id,
        is_active: true
      }));

      if (rolePermissionsData.length > 0) {
        await tx.rolePermission.createMany({
          data: rolePermissionsData
        });
        console.log(`✅ Assigned ${rolePermissionsData.length} permissions to Super Admin role`);
      }
    });

    // Step 7: Get Super Admin user and assign role
    const superAdminUser = await prisma.user.findFirst({
      where: { account_id: superAdminAccount.account_id }
    });

    // Assign Super Admin role to the user
    console.log('🔗 Assigning Super Admin role to user...');
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check if user role already exists
      const existingUserRole = await tx.userRole.findFirst({
        where: {
          user_id: superAdminUser!.user_id,
          role_id: superAdminRole.role_id
        }
      });

      if (!existingUserRole) {
        await tx.userRole.create({
          data: {
            user_id: superAdminUser!.user_id,
            role_id: superAdminRole.role_id,
            assigned_by: superAdminAccount.account_id,  // The account that assigned this role
            is_active: true
          }
        });
        console.log('✅ Assigned Super Admin role to user');
      } else {
        console.log('✅ Super Admin role already assigned to user');
      }
    });

    // Verify superadmin was created
    console.log('🔍 Verifying Super Admin account...');
    const createdAccount = await prisma.account.findUnique({
      where: { email: 'superadmin@dms.com' },
      include: {
        user: true
      }
    });

    if (!createdAccount) {
      throw new Error('❌ Super Admin account was not created');
    }

    console.log('✅ Super Admin account verified');

    console.log('🎉 Super Admin seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Super Admin account created: ${createdAccount.email}`);
    console.log(`- User created with ID: ${createdAccount.user?.user_id}`);
    console.log(`- Role assigned: ${superAdminRole.name}`);
    console.log(`- Permissions granted: ${allPermissions.length}`);

    console.log('\n🔑 Super Admin Login Credentials:');
    console.log('Email: superadmin@dms.com');
    console.log('Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change the default password in production!');

    console.log('\n🎯 Super Admin Permissions:');
    console.log('- Full document management (create, read, edit, delete, upload, download, share, etc.)');
    console.log('- Document type management (create, edit, delete)');
    console.log('- User management (create, read, edit, delete, activate, deactivate)');
    console.log('- Role management (create, read, edit, delete, assign)');
    console.log('- Department management (create, read, edit, delete)');
    console.log('- System settings access (read, write, backup, restore, maintenance)');
    console.log('- System logs access (read)');
    console.log('- Report management (read, generate, export, schedule)');
    console.log('- API access (read, write, delete, admin)');
    console.log('- Notification management (read, send, manage)');

    // Step 8: Create additional departments for realistic workflow
    console.log('\n🏢 Creating additional departments for workflow simulation...');
    const additionalDepartments = [
      { name: 'Human Resources', code: 'HR' },
      { name: 'Information Technology', code: 'IT' },
      { name: 'Finance', code: 'FIN' },
      { name: 'Operations', code: 'OPS' },
      { name: 'Legal', code: 'LGL' }
    ];

    const createdDepartments = [tempDepartment]; // Start with the existing department
    for (const dept of additionalDepartments) {
      const existingDept = await prisma.department.findUnique({
        where: { code: dept.code }
      });

      if (!existingDept) {
        const newDept = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const deptCreated = await tx.department.create({
            data: {
              name: dept.name,
              code: dept.code,
              active: true,
              created_by: superAdminAccount.account_id
            }
          });
          console.log(`✅ Created department: ${deptCreated.name}`);
          return deptCreated;
        });
        createdDepartments.push(newDept);
      } else {
        createdDepartments.push(existingDept);
        console.log(`✅ Using existing department: ${existingDept.name}`);
      }
    }

    // Step 9: Create document types
    console.log('\n🏷️ Creating document types...');
    const documentTypes = [
      { name: 'Memorandum', description: 'Internal memorandum' },
      { name: 'Letter', description: 'Official letter' },
      { name: 'Report', description: 'Official report' },
      { name: 'Contract', description: 'Contract document' }
    ];

    const createdTypes = [];
    for (const docType of documentTypes) {
      const existingType = await prisma.documentType.findUnique({
        where: { name: docType.name }
      });

      if (!existingType) {
        const type = await prisma.documentType.create({
          data: docType
        });
        createdTypes.push(type);
        console.log(`✅ Created document type: ${type.name}`);
      } else {
        createdTypes.push(existingType);
      }
    }

    // Step 10: Create sample users for different departments
    console.log('\n👥 Creating sample users for different departments...');
    const sampleUsers = [];
    for (let i = 0; i < 5; i++) {
      const dept = createdDepartments[i % createdDepartments.length];
      // Create a corresponding account for each user
      const userAccount = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const account = await tx.account.create({
          data: {
            email: `user${i + 1}@${dept.code.toLowerCase()}.dms.com`,
            password: await bcrypt.hash('password123', 12), // Using a default password for seed data
            email_verified: true,
            is_active: true,
            last_login: new Date(),
            department_id: dept.department_id
          }
        });

        const user = await tx.user.create({
          data: {
            account_id: account.account_id,
            department_id: dept.department_id,
            first_name: `Sample${i + 1}`,
            last_name: `User${i + 1}`,
            active: true
          }
        });
        return { account, user };
      });
      sampleUsers.push(userAccount.user);
    }

    // Step 11: Create view-only role for testing
    console.log('\n 👁️ Creating View-Only role for testing...');
    let viewOnlyRole = await prisma.role.findUnique({
      where: { code: 'VIEW_ONLY' }
    });

    if (!viewOnlyRole) {
      viewOnlyRole = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const role = await tx.role.create({
          data: {
            name: 'View Only',
            code: 'VIEW_ONLY',
            description: 'Can only view documents, no editing or management permissions',
            is_system_role: true,
            is_active: true,
            created_by: superAdminAccount.account_id
          }
        });
        console.log('✅ Created View-Only role');
        return role;
      });
    } else {
      console.log('✅ Using existing View-Only role');
    }

    // Step 12: Assign document_read and document_type_read permissions to the View-Only role
    console.log('🔗 Assigning document_read and document_type_read permissions to View-Only role...');
    const readPermission = await prisma.permissionDefinition.findUnique({
      where: { permission: 'document_read' as any }
    });

    const typeReadPermission = await prisma.permissionDefinition.findUnique({
      where: { permission: 'document_type_read' as any }
    });

    // Assign document_read permission
    if (readPermission) {
      // Check if this permission is already assigned
      const existingRolePermission = await prisma.rolePermission.findFirst({
        where: {
          role_id: viewOnlyRole.role_id,
          permission_id: readPermission.permission_id
        }
      });

      if (!existingRolePermission) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.rolePermission.create({
            data: {
              role_id: viewOnlyRole.role_id,
              permission_id: readPermission.permission_id,
              scope: 'department' as any,
              granted_by: superAdminAccount.account_id,
              is_active: true
            }
          });
          console.log('✅ Assigned document_read permission to View-Only role');
        });
      } else {
        console.log('✅ document_read permission already assigned to View-Only role');
      }
    }

    // Assign document_type_read permission for basic app functionality
    if (typeReadPermission) {
      // Check if this permission is already assigned
      const existingTypeRolePermission = await prisma.rolePermission.findFirst({
        where: {
          role_id: viewOnlyRole.role_id,
          permission_id: typeReadPermission.permission_id
        }
      });

      if (!existingTypeRolePermission) {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.rolePermission.create({
            data: {
              role_id: viewOnlyRole.role_id,
              permission_id: typeReadPermission.permission_id,
              scope: 'department' as any,
              granted_by: superAdminAccount.account_id,
              is_active: true
            }
          });
          console.log('✅ Assigned document_type_read permission to View-Only role');
        });
      } else {
        console.log('✅ document_type_read permission already assigned to View-Only role');
      }
    }

    // Step 13: Create some document actions for testing
    console.log('\n📝 Creating sample document actions...');
    const documentActions = [
      { action_name: 'For Approval', description: 'Document requires approval', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Signature', description: 'Document requires signature', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Review', description: 'Document requires review', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Information', description: 'Document for information purposes', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Action', description: 'Document requires action', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Comment', description: 'Document requires comments', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Endorsement', description: 'Document requires endorsement', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Filing', description: 'Document requires filing', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Release', description: 'Document for release', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Follow-up', description: 'Document requires follow-up', sender_tag: 'FROM', recipient_tag: 'TO' }
    ];

    for (const action of documentActions) {
      const existingAction = await prisma.documentAction.findFirst({
        where: { action_name: action.action_name }
      });

      if (!existingAction) {
        await prisma.documentAction.create({
          data: {
            ...action,
            status: true // Set as active by default
          }
        });
        console.log(`✅ Created document action: ${action.action_name}`);
      } else {
        console.log(`✅ Document action already exists: ${action.action_name}`);
      }
    }

    // Step 14: Create a view-only user account
    console.log(' 👤 Creating View-Only test user...');
    const viewOnlyUserAccount = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const account = await tx.account.create({
        data: {
          email: 'viewer@dms.com',
          password: await bcrypt.hash('viewer123', 12),
          email_verified: true,
          is_active: true,
          last_login: new Date(),
          department_id: tempDepartment.department_id
        }
      });

      const user = await tx.user.create({
        data: {
          account_id: account.account_id,
          department_id: tempDepartment.department_id,
          first_name: 'Test',
          last_name: 'Viewer',
          active: true
        }
      });

      // Assign View-Only role to the user
      await tx.userRole.create({
        data: {
          user_id: user.user_id,
          role_id: viewOnlyRole.role_id,
          assigned_by: superAdminAccount.account_id,
          is_active: true
        }
      });

      return { account, user };
    });

    console.log('✅ Created View-Only test user with login: viewer@dms.com, password: viewer123');

    console.log('\n🎯 View-Only Test User Permissions:');
    console.log('- Can view documents (document_read)');
    console.log('- Can view document types (document_type_read) for basic functionality');
    console.log('- Cannot edit, sign, delete, archive, or perform any other document operations');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error; // Re-throw to trigger rollback
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });