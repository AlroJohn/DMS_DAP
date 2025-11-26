"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash2, Eye, UserCheck, UserX } from "lucide-react";
import { AlertModal } from "@/components/reuseable/alert-modal";
import CreateUserModal from "./create";
import ViewUserModal from "./[id]/viewID";
import EditUserModal from "./[id]/editID";
import { useUserManagement } from "@/hooks/use-user-management";

const UserManagementPage = () => {
  const {
    users,
    filteredUsers,
    departments,
    roles,
    searchTerm,
    filterDepartment,
    filterStatus,
    loading,
    isCreateModalOpen,
    isViewModalOpen,
    isEditModalOpen,
    selectedUser,
    showDeleteAlert,
    userToDelete,
    isDeleting,
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
  } = useUserManagement();

  // Determine modal title/description depending on whether the user to delete is active
  const deletingUser = userToDelete ? users.find(u => u.user_id === userToDelete) : null;
  const deleteModalTitle = deletingUser
    ? deletingUser.active ? 'Confirm Deactivation' : 'Confirm Permanent Deletion'
    : 'Confirm Deletion';

  const deleteModalDescription = deletingUser
    ? deletingUser.active
      ? 'Are you sure you want to deactivate this user? The user will no longer be able to access the system.'
      : 'Are you sure you want to permanently delete this user? This action cannot be undone.'
    : 'Are you sure you want to delete this user?';

  return (
    <div className="container mx-auto py-10">
      <AlertModal
        isOpen={showDeleteAlert}
        onClose={closeDeleteAlert}
        onConfirm={deleteUser}
        loading={isDeleting}
        title={deleteModalTitle}
        description={deleteModalDescription}
      />
      
      {/* Create Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSuccess={fetchUsers}
        departments={departments}
        roles={roles}
      />
      
      {/* View Modal */}
      {selectedUser && (
        <ViewUserModal
          isOpen={isViewModalOpen}
          onClose={closeViewModal}
          user={selectedUser}
        />
      )}
      
      {/* Edit Modal */}
      {selectedUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onSuccess={fetchUsers}
          user={selectedUser}
          departments={departments}
          roles={roles}
        />
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage system users, assign roles, and configure user settings
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-64"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.department_id} value={dept.department_id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreateModal} className="w-full sm:w-auto">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role(s)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{`${user.first_name} ${user.last_name}`}</span>
                            {user.user_name && (
                              <span className="text-xs text-gray-500">@{user.user_name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{user.account.email}</span>
                            {!user.account.email_verified && (
                              <span className="text-xs text-amber-600">Not verified</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.department.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.user_roles && user.user_roles.length > 0 ? (
                              user.user_roles.map((ur) => (
                                <Badge key={ur.role.role_id} variant="secondary" className="text-xs">
                                  {ur.role.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">No roles</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              className={user.active && user.account.is_active ? "bg-green-500 hover:bg-green-500 text-white" : "bg-red-500 hover:bg-red-500 text-white"}
                            >
                              {user.active && user.account.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.account.last_login
                            ? new Date(user.account.last_login).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openViewModal(user)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(user)}
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleUserStatus(user.user_id)}
                              title={user.active ? "Deactivate" : "Activate"}
                            >
                              {user.active ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteAlert(user.user_id)}
                              disabled={user.active}
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        No users found
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

export default UserManagementPage;

