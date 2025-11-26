"use client";

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Shield } from 'lucide-react';
import { AlertModal } from '@/components/reuseable/alert-modal';
import RoleFormModal from '@/components/modals/role-form-modal';
import { useRoleManagement } from '@/hooks/use-role-management';
import { Badge } from '@/components/ui/badge';

const RoleManagementPage = () => {
  const {
    roles,
    availablePermissions,
    loading,
    error,
    isFormModalOpen,
    isDeleteAlertOpen,
    selectedRole,
    roleToDelete,
    fetchRoles,
    openCreateModal,
    openEditModal,
    closeFormModal,
    openDeleteAlert,
    closeDeleteAlert,
    deleteRole,
  } = useRoleManagement();

  return (
    <div className="container mx-auto py-10">
      <AlertModal
        isOpen={isDeleteAlertOpen}
        onClose={closeDeleteAlert}
        onConfirm={deleteRole}
        loading={loading} // Use a separate loading state for deletion if needed
        title="Confirm Role Deletion"
        description="Are you sure you want to delete this role? This action cannot be undone and the role will be unassigned from all users. System roles cannot be deleted."
      />

      <RoleFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSuccess={fetchRoles}
        initialData={selectedRole}
        availablePermissions={availablePermissions}
      />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>
              Manage system roles and their assigned permissions.
            </CardDescription>
          </div>
          <Button onClick={openCreateModal} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Role
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64 text-red-500">
              Error: {error}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions Count</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <TableRow key={role.role_id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.code}</TableCell>
                        <TableCell>{role.description || '-'}</TableCell>
                        <TableCell>{role.permissions.length}</TableCell>
                        <TableCell>
                          {role.is_system_role ? (
                            <Badge variant="secondary">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(role)}
                              title="Edit Role"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteAlert(role.role_id)}
                              title="Delete Role"
                              disabled={role.is_system_role} // Disable delete for system roles
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No roles found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManagementPage;
