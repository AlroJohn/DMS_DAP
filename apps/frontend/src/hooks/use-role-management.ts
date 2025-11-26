import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { RoleWithPermissions, PermissionDefinition } from '@/types';

export const useRoleManagement = () => {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | undefined>(undefined);
  const [roleToDelete, setRoleToDelete] = useState<string | undefined>(undefined);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/roles');
      const result = await response.json();
      if (result.success) {
        setRoles(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch roles');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/permissions');
      const result = await response.json();
      if (result.success) {
        setAvailablePermissions(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch permissions');
      }
    } catch (err: any) {
      console.error('Error fetching available permissions:', err);
      toast.error(err.message || 'Failed to load available permissions.');
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const openCreateModal = () => {
    setSelectedRole(undefined);
    setIsFormModalOpen(true);
  };

  const openEditModal = (role: RoleWithPermissions) => {
    setSelectedRole(role);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedRole(undefined);
  };

  const openDeleteAlert = (roleId: string) => {
    setRoleToDelete(roleId);
    setIsDeleteAlertOpen(true);
  };

  const closeDeleteAlert = () => {
    setIsDeleteAlertOpen(false);
    setRoleToDelete(undefined);
  };

  const deleteRole = useCallback(async () => {
    if (!roleToDelete) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/roles/${roleToDelete}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Role deleted successfully.');
        fetchRoles();
        closeDeleteAlert();
      } else {
        throw new Error(result.message || 'Failed to delete role.');
      }
    } catch (err: any) {
      console.error('Error deleting role:', err);
      toast.error(err.message || 'Failed to delete role.');
    } finally {
      setLoading(false);
    }
  }, [roleToDelete, fetchRoles]);

  return {
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
  };
};
