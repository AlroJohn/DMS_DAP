import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Super Admin...');

  try {
    const superAdminEmails = [
      'superadmin@dms.com',
      'superadmin1@dms.com',
      'superadmin2@dms.com',
      'superadmin3@dms.com',
    ];
    const seededSuperAdminEmails: string[] = [];
    const seededUserAccountEmails: string[] = [];
    const seededDepartmentHeadEmails: string[] = [];
    // Step 1: Clear existing superadmin if exists
    console.log('🧹 Checking for existing superadmin...');
    for (const email of superAdminEmails) {
      const existingSuperAdmin = await prisma.account.findUnique({
        where: { email }
      });

      if (!existingSuperAdmin) {
        continue;
      }

      console.log(`🗑️ Removing existing superadmin: ${email}...`);
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
          email: superAdminEmails[0],
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
    seededSuperAdminEmails.push(superAdminAccount.email);

    // Step 4: Create permission definitions if they don't exist
    console.log('🔐 Creating permission definitions...');

    // Define all permissions with friendly descriptions
    const permissions = [
      { id: 'document_read', description: 'View documents' },
      { id: 'document_write', description: 'Save or update document content' },
      { id: 'document_edit', description: 'Edit document details' },
      { id: 'document_delete', description: 'Remove documents' },
      { id: 'document_create', description: 'Create new documents' },
      { id: 'document_upload', description: 'Upload files to documents' },
      { id: 'document_download', description: 'Download document files' },
      { id: 'document_share', description: 'Share documents with others' },
      { id: 'document_archive', description: 'Move documents to archive' },
      { id: 'document_restore', description: 'Restore documents from archive' },
      { id: 'document_move', description: 'Move documents between folders or locations' },
      { id: 'document_copy', description: 'Create a copy of a document' },
      { id: 'document_metadata_read', description: 'View document metadata (tags, fields)' },
      { id: 'document_metadata_write', description: 'Edit document metadata' },
      { id: 'document_metadata_edit', description: 'Modify document metadata' },
      { id: 'document_routing_read', description: 'View routing status and history' },
      { id: 'document_routing_create', description: 'Start a routing/process for a document' },
      { id: 'document_routing_edit', description: 'Change routing details' },
      { id: 'document_routing_delete', description: 'Cancel or remove a routing' },
      { id: 'document_routing_approve', description: 'Approve routed documents' },
      { id: 'document_transfer_initiate', description: 'Initiate a document transfer' },
      { id: 'document_transfer_approve', description: 'Approve document transfers' },
      { id: 'document_transfer_receive', description: 'Receive transferred documents' },
      { id: 'document_transfer_reject', description: 'Reject a document transfer' },
      { id: 'document_transfer_track', description: 'Track transfer progress' },
      { id: 'document_custody_view', description: 'View custody/ownership history' },
      { id: 'document_custody_transfer', description: 'Transfer custody of a document' },
      { id: 'document_custody_receive', description: 'Acknowledge receipt of custody' },
      { id: 'document_custody_witness', description: 'Act as witness during custody transfer' },
      { id: 'document_audit_read', description: 'View audit logs for documents' },
      { id: 'document_audit_export', description: 'Export document audit logs' },
      { id: 'document_audit_verify', description: 'Verify audit log entries' },
      { id: 'document_recycle_view', description: 'View items in the recycle bin' },
      { id: 'document_recycle_restore', description: 'Restore items from recycle bin' },
      { id: 'document_recycle_permanent_delete', description: 'Permanently delete items from recycle bin' },
      { id: 'document_recycle_bulk_restore', description: 'Restore multiple items at once' },
      { id: 'document_recycle_bulk_delete', description: 'Permanently delete multiple items' },
      { id: 'document_type_read', description: 'View document types' },
      { id: 'document_type_create', description: 'Create new document types' },
      { id: 'document_type_edit', description: 'Edit document types' },
      { id: 'document_type_delete', description: 'Delete document types' },
      { id: 'department_read', description: 'View department information' },
      { id: 'department_create', description: 'Create new departments' },
      { id: 'department_edit', description: 'Edit department details' },
      { id: 'department_delete', description: 'Delete departments' },
      { id: 'department_users_manage', description: 'Manage users within a department' },
      { id: 'user_read', description: 'View user profiles' },
      { id: 'user_create', description: 'Create new users' },
      { id: 'user_edit', description: 'Edit user details' },
      { id: 'user_delete', description: 'Delete users' },
      { id: 'user_activate', description: 'Activate user accounts' },
      { id: 'user_deactivate', description: 'Deactivate user accounts' },
      { id: 'role_read', description: 'View roles and their details' },
      { id: 'role_create', description: 'Create new roles' },
      { id: 'role_edit', description: 'Edit roles' },
      { id: 'role_delete', description: 'Delete roles' },
      { id: 'role_assign', description: 'Assign roles to users' },
      { id: 'permission_edit', description: 'Edit permission definitions' },
      { id: 'permission_create', description: 'Create new permissions' },
      { id: 'permission_delete', description: 'Delete permissions' },
      { id: 'permission_read', description: 'View permissions' },
      { id: 'permission_assign', description: 'Assign permissions to roles' },
      { id: 'permission_revoke', description: 'Remove permissions from roles' },
      { id: 'system_settings_read', description: 'View system settings' },
      { id: 'system_settings_write', description: 'Change system settings' },
      { id: 'system_logs_read', description: 'View system logs' },
      { id: 'system_backup', description: 'Create system backups' },
      { id: 'system_restore', description: 'Restore system from backup' },
      { id: 'system_maintenance', description: 'Perform system maintenance tasks' },
      { id: 'notification_read', description: 'View notifications' },
      { id: 'notification_send', description: 'Send notifications' },
      { id: 'notification_manage', description: 'Manage notification settings' },
      { id: 'report_read', description: 'View reports' },
      { id: 'report_generate', description: 'Generate reports' },
      { id: 'report_export', description: 'Export reports' },
      { id: 'report_schedule', description: 'Schedule report generation' },
      { id: 'api_read', description: 'Read API data' },
      { id: 'api_write', description: 'Modify data via API' },
      { id: 'api_delete', description: 'Delete data via API' },
      { id: 'api_admin', description: 'Full API administration access' },
      { id: 'document_action_read', description: 'View document action types' },
      { id: 'document_action_create', description: 'Create document action types' },
      { id: 'document_action_edit', description: 'Edit document action types' },
      { id: 'document_action_delete', description: 'Delete document action types' }
    ];

    // Create permissions that don't exist yet (outside transaction to avoid timeout)
    for (const permission of permissions) {
      const existingPermission = await prisma.permissionDefinition.findUnique({
        where: { permission: permission.id as any }
      });

      if (!existingPermission) {
        const pid = permission.id;
        await prisma.permissionDefinition.create({
          data: {
            permission: pid as any,
            resource_type: pid.includes('document') ? 'document' :
              pid.includes('user') ? 'user' :
                pid.includes('role') ? 'role' :
                  pid.includes('department') ? 'department' :
                    pid.includes('permission') ? 'permission' :
                      pid.includes('system') ? 'system' :
                        pid.includes('notification') ? 'notification' :
                          pid.includes('report') ? 'report' : 'document',
            description: permission.description || pid.replace(/_/g, ' '),
            is_active: true
          }
        });
        console.log(`✅ Created permission: ${permission.id}`);
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
    // Step 5b: Create core system roles
    console.log('?? Creating core system roles...');
    const coreRoles = [
      {
        name: 'Administrator',
        code: 'ADMINISTRATOR',
        description: 'Global administrator with full system access'
      },
      {
        name: 'Department Head',
        code: 'DEPARTMENT_HEAD',
        description: 'Can access transactions for all users within the department'
      },
      {
        name: 'User',
        code: 'USER',
        description: 'Standard user with access to own transactions'
      }
    ];

    for (const role of coreRoles) {
      const existingRole = await prisma.role.findUnique({
        where: { code: role.code }
      });

      if (!existingRole) {
        await prisma.role.create({
          data: {
            ...role,
            is_system_role: true,
            is_active: true,
            created_by: superAdminAccount.account_id
          }
        });

      } else {

      }
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

    // Step 6b: Assign permissions to core roles
    console.log('📋 Assigning permissions to core roles...');
    const permissionPrefix = {
      document: 'document_',
      document_type: 'document_type_',
      document_action: 'document_action_',
      notification: 'notification_',
      report: 'report_',
      user: 'user_',
      role: 'role_',
      department: 'department_',
      system: 'system_',
      permission: 'permission_',
      api: 'api_',
    };

    const normalizePermission = (permission: any) => String(permission);
    const hasPrefix = (permission: any, prefix: string) =>
      normalizePermission(permission).startsWith(prefix);
    const pickByPrefixes = (prefixes: string[]) =>
      allPermissions.filter(permission =>
        prefixes.some(prefix => hasPrefix(permission.permission, prefix))
      );

    const uniquePermissionIds = (permissions: typeof allPermissions) =>
      Array.from(new Set(permissions.map(permission => permission.permission_id)));

    const assignPermissionsToRole = async (roleCode: string, permissionIds: string[]) => {
      const role = await prisma.role.findUnique({
        where: { code: roleCode }
      });

      if (!role) {
        console.log(`⚠️ Role not found for permission assignment: ${roleCode}`);
        return;
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.rolePermission.deleteMany({
          where: { role_id: role.role_id }
        });

        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map(permissionId => ({
              role_id: role.role_id,
              permission_id: permissionId,
              scope: 'global' as any,
              granted_by: superAdminAccount.account_id,
              is_active: true
            }))
          });
        }
      });

      console.log(`✅ Assigned ${permissionIds.length} permissions to ${roleCode}`);
    };

    // USER Role: Documents, Search, Reports, Notification (exclude management permissions except read-only)
    const userPermissions = uniquePermissionIds(
      allPermissions.filter(permission => {
        const permStr = normalizePermission(permission.permission);
        // Include document permissions but exclude document_type and document_action (except read)
        const isDocumentPerm = hasPrefix(permission.permission, permissionPrefix.document);
        const isTypePerm = hasPrefix(permission.permission, permissionPrefix.document_type);
        const isActionPerm = hasPrefix(permission.permission, permissionPrefix.document_action);
        const isNotificationPerm = hasPrefix(permission.permission, permissionPrefix.notification);
        const isReportPerm = hasPrefix(permission.permission, permissionPrefix.report);
        
        // Allow document_type_read for users to view document types when creating/filtering documents
        const isTypeReadPerm = permStr === 'document_type_read';
        const isActionReadPerm = permStr === 'document_action_read';
        // Allow department_read for users to view departments when releasing documents
        const isDepartmentReadPerm = permStr === 'department_read';
        
        return (isDocumentPerm && !isTypePerm && !isActionPerm) || isTypeReadPerm || isActionReadPerm || isDepartmentReadPerm || isNotificationPerm || isReportPerm;
      })
    );

    // DEPARTMENT_HEAD Role: Documents, Search, Reports, Notification, Management (Types, Actions, Users only)
    const departmentHeadPermissions = uniquePermissionIds(
      allPermissions.filter(permission => {
        const permStr = normalizePermission(permission.permission);
        // Include all document permissions (which includes document_type and document_action)
        const isDocumentPerm = hasPrefix(permission.permission, permissionPrefix.document);
        const isNotificationPerm = hasPrefix(permission.permission, permissionPrefix.notification);
        const isReportPerm = hasPrefix(permission.permission, permissionPrefix.report);
        const isUserPerm = hasPrefix(permission.permission, permissionPrefix.user);
        const isDepartmentReadPerm = permStr === 'department_read';
        
        return isDocumentPerm || isNotificationPerm || isReportPerm || isUserPerm || isDepartmentReadPerm;
      })
    );

    // ADMINISTRATOR Role: Everything except Sidebar Settings (system_settings)
    const administratorPermissions = uniquePermissionIds(
      allPermissions.filter(permission => {
        const permStr = normalizePermission(permission.permission);
        // Exclude only system_settings permissions (sidebar settings)
        return permStr !== 'system_settings_read' && 
               permStr !== 'system_settings_write';
      })
    );

    await assignPermissionsToRole('USER', userPermissions);
    await assignPermissionsToRole('DEPARTMENT_HEAD', departmentHeadPermissions);
    await assignPermissionsToRole('ADMINISTRATOR', administratorPermissions);

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
      where: { email: superAdminEmails[0] },
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
    console.log(`Email: ${superAdminEmails[0]}`);
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

    // Step 7b: Create additional Super Admin accounts
    if (superAdminEmails.length > 1) {
      console.log('\n👑 Creating additional Super Admin accounts...');
    }

    for (const email of superAdminEmails.slice(1)) {
      const extraAccount = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const account = await tx.account.create({
          data: {
            email,
            password: superAdminPassword,
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
            first_name: 'Super',
            last_name: 'Admin',
            active: true,
            title: 'System Administrator'
          }
        });

        return { account, user };
      });

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.userRole.create({
          data: {
            user_id: extraAccount.user.user_id,
            role_id: superAdminRole.role_id,
            assigned_by: superAdminAccount.account_id,
            is_active: true
          }
        });
      });

      console.log(`✅ Created Super Admin account: ${extraAccount.account.email}`);
      seededSuperAdminEmails.push(extraAccount.account.email);
    }

    // Step 8: Create additional departments for realistic workflow
    console.log('\n🏢 Creating additional departments for workflow simulation...');
    const additionalDepartments = [
      { name: 'Office of the President', code: 'OPG' },
      { name: 'Corporate Affairs Group', code: 'CAG' },
      { name: 'Graduate School of Public and Development Management', code: 'GSPDM' },
      { name: 'Program Operations Group', code: 'POG' },
      { name: 'Services Group', code: 'SG' }
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
    console.log('\n👥 Creating user accounts with USER role...');
    const userRole = await prisma.role.findUnique({
      where: { code: 'USER' }
    });

    if (!userRole) {
      throw new Error('USER role not found. Ensure roles are seeded before users.');
    }

    const usersByDepartment: Record<string, string[]> = {
      OPG: [
        'OPCEO',
        'APO DAPSec',
        'BOARDSEC',
        'COF',
        'DRDO',
        'LSO',
        'OAR',
        'OAR-Linang'
      ],
      CAG: [
        'OVP-CAG',
        'IAS',
        'DAPCC',
        'DAPCC-EMS',
        'DAPCC-FBS',
        'DAPCC-FMSO',
        'DAPCC-RFS',
        'DAPCC-SS',
        'IMC',
        'IMSO',
        'PMSO'
      ],
      GSPDM: [
        'DEAN-GSPDM',
        'LIBRARY',
        'HGSPC',
        'SDRLGC',
        'SGDC'
      ],
      POG: [
        'OSVP-P',
        'OVP-CCD',
        'AAO',
        'JEDO',
        'SEDO',
        'CSF',
        'OVP-CFG',
        'AO25SEC',
        'COE-PSP',
        'LGDO',
        'OMO',
        'PRO',
        'DSM',
        'OVP-PDC',
        'AIDO',
        'MGR',
        'PDRO',
        'PQTO',
        'TMO',
        'SHDP',
        'HDU',
        'ESDU'
      ],
      SG: [
        'OSVP-S',
        'ODM-AD',
        'BacSec',
        'CDRD',
        'CS',
        'GSD',
        'ICTD',
        'LD',
        'ODM-FD',
        'AD',
        'BD',
        'TD',
        'ODM-HRMDD',
        'HRD',
        'HRM'
      ]
    };

    const createdUsers = [];
    const departmentsByCode = new Map(
      createdDepartments
        .filter((dept) => dept.code)
        .map((dept) => [dept.code, dept])
    );

    const commonPassword = await bcrypt.hash('password123', 12);

    for (const [departmentCode, codes] of Object.entries(usersByDepartment)) {
      const dept = departmentsByCode.get(departmentCode);
      if (!dept) {
        console.log(`⚠️ Department not found for code ${departmentCode}, skipping users.`);
        continue;
      }

      for (const code of codes) {
        const email = `${code}`.toLowerCase().replace(/\s+/g, '') + '@dms.com';
        const displayName = code.toUpperCase();
        const userName = email.split('@')[0];

        const userAccount = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const account = await tx.account.upsert({
            where: { email },
            create: {
              email,
              password: commonPassword,
              email_verified: true,
              is_active: true,
              last_login: new Date(),
              department_id: dept.department_id
            },
            update: {
              department_id: dept.department_id,
              is_active: true,
              email_verified: true,
              last_login: new Date()
            }
          });

          const user = await tx.user.upsert({
            where: { account_id: account.account_id },
            create: {
              account_id: account.account_id,
              department_id: dept.department_id,
              first_name: displayName,
              last_name: 'User',
              user_name: userName,
              active: true
            },
            update: {
              department_id: dept.department_id,
              active: true,
              user_name: userName
            }
          });

          const existingUserRole = await tx.userRole.findFirst({
            where: {
              user_id: user.user_id,
              role_id: userRole.role_id
            }
          });

          if (!existingUserRole) {
            await tx.userRole.create({
              data: {
                user_id: user.user_id,
                role_id: userRole.role_id,
                assigned_by: superAdminAccount.account_id,
                is_active: true
              }
            });
          }

          return { account, user };
        });

        createdUsers.push(userAccount.user);
        seededUserAccountEmails.push(email);
      }
    }

    console.log('\n👥 Creating department head users...');
    const departmentHeadRole = await prisma.role.findUnique({
      where: { code: 'DEPARTMENT_HEAD' }
    });

    if (!departmentHeadRole) {
      throw new Error('DEPARTMENT_HEAD role not found. Ensure roles are seeded before users.');
    }

    const departmentHeadsByDepartment: Record<string, string[]> = {
      POG: ['CCD', 'CSF', 'CFG', 'DSM', 'PDC', 'SHDP'],
      SG: ['AD', 'FD', 'HRMDD']
    };

    for (const [departmentCode, codes] of Object.entries(departmentHeadsByDepartment)) {
      const dept = departmentsByCode.get(departmentCode);
      if (!dept) {
        console.log(`⚠️ Department not found for code ${departmentCode}, skipping department heads.`);
        continue;
      }

      for (const code of codes) {
        const email = `${code}`.toLowerCase().replace(/\s+/g, '') + '-dh@dms.com';
        const displayName = code.toUpperCase();
        const userName = email.split('@')[0];

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const account = await tx.account.upsert({
            where: { email },
            create: {
            email,
            password: commonPassword,
            email_verified: true,
            is_active: true,
            last_login: new Date(),
            department_id: dept.department_id
          },
          update: {
            department_id: dept.department_id,
            is_active: true,
            email_verified: true,
            last_login: new Date()
          }
        });

        const user = await tx.user.upsert({
          where: { account_id: account.account_id },
          create: {
            account_id: account.account_id,
            department_id: dept.department_id,
            first_name: displayName,
            last_name: 'Department Head',
            user_name: userName,
            active: true
          },
          update: {
            department_id: dept.department_id,
            active: true,
            user_name: userName
          }
        });

        const existingUserRole = await tx.userRole.findFirst({
          where: {
            user_id: user.user_id,
            role_id: departmentHeadRole.role_id
          }
        });

          if (!existingUserRole) {
            await tx.userRole.create({
            data: {
              user_id: user.user_id,
              role_id: departmentHeadRole.role_id,
              assigned_by: superAdminAccount.account_id,
              is_active: true
            }
            });
          }
        });
        seededDepartmentHeadEmails.push(email);
      }
    }

    // Step 11: Create some document actions for testing
    console.log('\n📝 Creating sample document actions...');
    const documentActions = [
      { action_name: 'For Approval', description: 'Document requires approval', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Signature', description: 'Document requires signature', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Review', description: 'Document requires review', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'For Cancellation', description: 'Document is requested to be cancelled', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'Cancelled', description: 'Document has been cancelled', sender_tag: 'FROM', recipient_tag: 'TO' },
      { action_name: 'Approved', description: 'Document has been approved', sender_tag: 'FROM', recipient_tag: 'TO' }
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

    // Step 12: Seed Sidebar Settings
    console.log('🎨 Seeding sidebar settings...');
    const defaultSidebarSettings = [
      { section_key: 'home', section_name: 'Home', is_enabled: true },
      { section_key: 'dashboard', section_name: 'Dashboard', is_enabled: true },
      { section_key: 'documents', section_name: 'Documents', is_enabled: true },
      { section_key: 'management', section_name: 'Management', is_enabled: true },
      { section_key: 'search', section_name: 'Search', is_enabled: true },
      { section_key: 'notifications', section_name: 'Notifications', is_enabled: true },
      { section_key: 'sidebar settings', section_name: 'Sidebar Settings', is_enabled: true },
      { section_key: 'reports', section_name: 'Reports', is_enabled: true },
    ];

    for (const setting of defaultSidebarSettings) {
      const existingSetting = await prisma.sidebarSettings.findUnique({
        where: { section_key: setting.section_key }
      });

      if (!existingSetting) {
        await prisma.sidebarSettings.create({
          data: setting
        });
        console.log(`✅ Created sidebar setting: ${setting.section_name}`);
      } else {
        console.log(`✅ Sidebar setting already exists: ${setting.section_name}`);
      }
    }

    console.log('\n🧾 Seeded account summary:');
    console.log(`- Super Admin accounts: ${seededSuperAdminEmails.join(', ') || 'none'}`);
    console.log(`- User accounts: ${seededUserAccountEmails.length}`);
    console.log(`- Department Head accounts: ${seededDepartmentHeadEmails.length}`);

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
