import { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";

interface User {
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
  created_at: string;
  updated_at: string;
  account: {
    email: string;
    is_active: boolean;
    email_verified: boolean;
    last_login?: string;
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

interface Department {
  department_id: string;
  name: string;
  code: string;
}

interface Role {
  role_id: string;
  name: string;
  code: string;
  description?: string;
}

interface UserManagementState {
  users: User[];
  filteredUsers: User[];
  departments: Department[];
  roles: Role[];
  searchTerm: string;
  filterDepartment: string;
  filterStatus: string;
  loading: boolean;
  isCreateModalOpen: boolean;
  isViewModalOpen: boolean;
  isEditModalOpen: boolean;
  selectedUser: User | null;
  showDeleteAlert: boolean;
  userToDelete: string | null;
  isDeleting: boolean;
}

export const useUserManagement = () => {
  const [state, setState] = useState<UserManagementState>({
    users: [],
    filteredUsers: [],
    departments: [],
    roles: [],
    searchTerm: '',
    filterDepartment: 'all',
    filterStatus: 'all',
    loading: true,
    isCreateModalOpen: false,
    isViewModalOpen: false,
    isEditModalOpen: false,
    selectedUser: null,
    showDeleteAlert: false,
    userToDelete: null,
    isDeleting: false,
  });

  const getToken = () => {
    return localStorage.getItem('accessToken') || document.cookie
      .split(';')
      .find(c => c.trim().startsWith('accessToken='))
      ?.split('=')[1];
  };

  const fetchUsers = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const token = getToken();
      
      const response = await fetch("/api/admin/users", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          users: data.data,
          filteredUsers: data.data,
        }));
      } else {
        toast.error(data.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error fetching users");
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const token = getToken();
      
      const response = await fetch("/api/admin/departments", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setState(prev => ({ ...prev, departments: data.data }));
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const token = getToken();
      
      const response = await fetch("/api/admin/roles", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setState(prev => ({ ...prev, roles: data.data }));
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  }, []);

  const toggleUserStatus = async (id: string) => {
    try {
      const token = getToken();
      const user = state.users.find(u => u.user_id === id);
      if (!user) return;

      const response = await fetch(`/api/admin/users/${id}/toggle-status`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: !user.active,
          is_active: !user.account.is_active,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "User status updated successfully");
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to update user status");
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error("Error updating user status");
    }
  };

  const deleteUser = async () => {
    if (!state.userToDelete) return;

    setState(prev => ({ ...prev, isDeleting: true }));
    try {
      const token = getToken();
        
      const response = await fetch(`/api/admin/users/${state.userToDelete}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        // Prefer explicit message from backend if provided
        const backendMsg = result.data?.message;

        // Determine a sensible fallback based on user state
        const targetUser = state.users.find(u => u.user_id === state.userToDelete);
        const fallbackMsg = targetUser && !targetUser.active
          ? 'User permanently deleted'
          : 'User deactivated successfully';

        toast.success(backendMsg || fallbackMsg);
        fetchUsers();
      } else {
        const err = result.error?.message || 'Failed to delete user';
        toast.error(err);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error deleting user");
    } finally {
      setState(prev => ({
        ...prev,
        isDeleting: false,
        showDeleteAlert: false,
        userToDelete: null,
      }));
    }
  };

  useEffect(() => {
    let filtered = state.users;

    if (state.searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.first_name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
          user.last_name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
          user.account.email.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
          (user.user_name && user.user_name.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
          user.department.name.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
    }

    if (state.filterDepartment !== "all") {
      filtered = filtered.filter((user) => user.department.department_id === state.filterDepartment);
    }

    if (state.filterStatus !== "all") {
      const isActive = state.filterStatus === "active";
      filtered = filtered.filter((user) => user.active === isActive && user.account.is_active === isActive);
    }

    setState(prev => ({ ...prev, filteredUsers: filtered }));
  }, [state.searchTerm, state.filterDepartment, state.filterStatus, state.users]);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchRoles();
  }, [fetchUsers, fetchDepartments, fetchRoles]);

  const setSearchTerm = (term: string) => setState(prev => ({ ...prev, searchTerm: term }));
  const setFilterDepartment = (dept: string) => setState(prev => ({ ...prev, filterDepartment: dept }));
  const setFilterStatus = (status: string) => setState(prev => ({ ...prev, filterStatus: status }));
  
  const openCreateModal = () => setState(prev => ({ ...prev, isCreateModalOpen: true }));
  const closeCreateModal = () => setState(prev => ({ ...prev, isCreateModalOpen: false }));
  
  const openViewModal = (user: User) => setState(prev => ({ ...prev, selectedUser: user, isViewModalOpen: true }));
  const closeViewModal = () => setState(prev => ({ ...prev, selectedUser: null, isViewModalOpen: false }));
  
  const openEditModal = (user: User) => setState(prev => ({ ...prev, selectedUser: user, isEditModalOpen: true }));
  const closeEditModal = () => setState(prev => ({ ...prev, selectedUser: null, isEditModalOpen: false }));
  
  const openDeleteAlert = (id: string) => setState(prev => ({ ...prev, userToDelete: id, showDeleteAlert: true }));
  const closeDeleteAlert = () => setState(prev => ({ ...prev, userToDelete: null, showDeleteAlert: false }));

  return {
    // State
    users: state.users,
    filteredUsers: state.filteredUsers,
    departments: state.departments,
    roles: state.roles,
    searchTerm: state.searchTerm,
    filterDepartment: state.filterDepartment,
    filterStatus: state.filterStatus,
    loading: state.loading,
    isCreateModalOpen: state.isCreateModalOpen,
    isViewModalOpen: state.isViewModalOpen,
    isEditModalOpen: state.isEditModalOpen,
    selectedUser: state.selectedUser,
    showDeleteAlert: state.showDeleteAlert,
    userToDelete: state.userToDelete,
    isDeleting: state.isDeleting,

    // Actions
    setSearchTerm,
    setFilterDepartment,
    setFilterStatus,
    openCreateModal,
    closeCreateModal,
    openViewModal,
    closeViewModal,
    openEditModal,
    closeEditModal,
    openDeleteAlert,
    closeDeleteAlert,
    deleteUser,
    toggleUserStatus,
    fetchUsers,
  };
};
