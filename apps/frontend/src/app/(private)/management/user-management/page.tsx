"use client";

import React, { useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, Edit, Trash2, Eye, UserCheck, UserX, Users, UserPlus, Mail, Building2, Loader2 } from "lucide-react";
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

  // Separate users into verified and invited based on email verification
  const { verifiedUsers, invitedUsers } = useMemo(() => {
    const verified = filteredUsers.filter(user => user.account.email_verified);
    const invited = filteredUsers.filter(user => !user.account.email_verified);
    return { verifiedUsers: verified, invitedUsers: invited };
  }, [filteredUsers]);

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

  // Render user table - extracted to avoid duplication
  const renderUserTable = (usersList: typeof filteredUsers, emptyMessage: string) => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role(s)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usersList.length > 0 ? (
            usersList.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell>
                  <div className="flex flex-col gap-1.5 py-1 min-w-[180px]">
                    <div className="font-medium">{`${user.first_name} ${user.last_name}`}</div>
                    {user.user_name && (
                      <div className="text-xs text-muted-foreground">@{user.user_name}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5 py-1 min-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-xs">{user.account.email}</span>
                    </div>
                    {!user.account.email_verified && (
                      <Badge variant="outline" className="w-fit text-xs border-amber-500 text-amber-600 px-1.5 py-0">
                        Pending Verification
                      </Badge>
                    )}
                    {user.account.last_login && (
                      <span className="text-xs text-muted-foreground">
                        Last login: {new Date(user.account.last_login).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{user.department.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {user.user_roles && user.user_roles.length > 0 ? (
                      user.user_roles.map((ur) => (
                        <Badge key={ur.role.role_id} variant="secondary" className="text-xs font-medium px-1.5 py-0.5">
                          {ur.role.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No roles assigned</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${user.active && user.account.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-xs ${user.active && user.account.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {user.active && user.account.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openViewModal(user)}
                      title="View Details"
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(user)}
                      title="Edit User"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleUserStatus(user.user_id)}
                      title={user.active ? "Deactivate" : "Activate"}
                      className="h-8 w-8 p-0"
                    >
                      {user.active ? (
                        <UserX className="h-4 w-4 text-orange-500" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteAlert(user.user_id)}
                      disabled={user.active}
                      title="Delete User"
                      className="h-8 w-8 p-0 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center"
              >
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <p className="text-lg font-medium">No Results Found</p>
                  <p className="text-xs">{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="w-full flex h-full flex-col bg-background">
      {/* Modals */}
      <AlertModal
        isOpen={showDeleteAlert}
        onClose={closeDeleteAlert}
        onConfirm={deleteUser}
        loading={isDeleting}
        title={deleteModalTitle}
        description={deleteModalDescription}
      />
      
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSuccess={fetchUsers}
        departments={departments}
        roles={roles}
      />
      
      {selectedUser && (
        <>
          <ViewUserModal
            isOpen={isViewModalOpen}
            onClose={closeViewModal}
            user={selectedUser}
          />
          <EditUserModal
            isOpen={isEditModalOpen}
            onClose={closeEditModal}
            onSuccess={fetchUsers}
            user={selectedUser}
            departments={departments}
            roles={roles}
          />
        </>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-dashed"
            >
              Filters
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="All Departments" />
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
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreateModal} className="h-9">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs with User Tables */}
      <div className="flex flex-col gap-4 mt-4">
        {loading ? (
          <div className="rounded-md border bg-card">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        ) : (
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Active Users
                <Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal">
                  {verifiedUsers.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="invited" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invited Users
                <Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal">
                  {invitedUsers.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-0">
              {renderUserTable(verifiedUsers, "Try adjusting your filters or search terms")}
            </TabsContent>

            <TabsContent value="invited" className="mt-0">
              {renderUserTable(invitedUsers, "There are no invited users at the moment")}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default UserManagementPage;

