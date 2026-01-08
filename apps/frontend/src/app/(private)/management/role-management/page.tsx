"use client";

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Shield, Search, Loader2, Key } from 'lucide-react';
import { AlertModal } from '@/components/reuseable/alert-modal';
import { TablePagination } from '@/components/reuseable/table-pagination';
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

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter roles
  const filteredRoles = useMemo(() => {
    const filtered = roles.filter((role) => {
      const matchesSearch =
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType =
        filterType === "all" ||
        (filterType === "system" && role.is_system_role) ||
        (filterType === "custom" && !role.is_system_role);

      return matchesSearch && matchesType;
    });
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
    
    return filtered;
  }, [roles, searchTerm, filterType]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRoles.slice(startIndex, endIndex);
  }, [filteredRoles, currentPage, itemsPerPage]);

  const renderRoleTable = () => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRoles.length > 0 ? (
            paginatedRoles.map((role) => (
              <TableRow key={role.role_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="font-medium">{role.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {role.code}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {role.description || "No description"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-sm font-medium">
                      {role.permissions.length}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      permission{role.permissions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {role.is_system_role ? (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      System
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(role)}
                      title="Edit Role"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteAlert(role.role_id)}
                      title="Delete Role"
                      disabled={role.is_system_role}
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
              <TableCell colSpan={6} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mb-2 text-muted-foreground/40" />
                  <p className="text-lg font-medium">No Roles Found</p>
                  <p className="text-xs">
                    {searchTerm || filterType !== "all"
                      ? "Try adjusting your filters or search terms"
                      : "Get started by creating your first role"}
                  </p>
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
        isOpen={isDeleteAlertOpen}
        onClose={closeDeleteAlert}
        onConfirm={deleteRole}
        loading={loading}
        title="Confirm Role Deletion"
        description="Are you sure you want to delete this role? This action cannot be undone and the role will be unassigned from all users."
      />

      <RoleFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSuccess={fetchRoles}
        initialData={selectedRole}
        availablePermissions={availablePermissions}
      />

      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">
          Manage system roles and their assigned permissions
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreateModal} className="h-9">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col gap-4 mt-4">
        {loading ? (
          <div className="rounded-md border bg-card">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-md border bg-card">
            <div className="flex flex-col items-center justify-center py-8 text-red-500">
              <p className="text-lg font-medium">Error loading roles</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {renderRoleTable()}
            {filteredRoles.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredRoles.length}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RoleManagementPage;
