"use client";

import React, { useMemo, useState, useEffect } from "react";
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
import { getAccessToken } from "@/lib/token-utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Search, Edit, Trash2, Loader2, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { AlertModal } from "@/components/reuseable/alert-modal";
import { TablePagination } from "@/components/reuseable/table-pagination";
import { toast } from "sonner";

interface Department {
  department_id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

const DepartmentManagementPage = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    active: true,
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();

      const response = await fetch("/api/admin/departments", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        let errorMessage = `Failed to fetch departments: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error?.message || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, use status text or generic message
          errorMessage = response.statusText || errorMessage;
        }
        toast.error(errorMessage);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setDepartments(data.data);
      } else {
        toast.error(data.message || data.error?.message || "Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Error fetching departments");
    } finally {
      setLoading(false);
    }
  };

  // Filter departments
  const filteredDepartments = useMemo(() => {
    const filtered = departments.filter((dept) => {
      const matchesSearch =
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && dept.active) ||
        (filterStatus === "inactive" && !dept.active);

      return matchesSearch && matchesStatus;
    });
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
    
    return filtered;
  }, [departments, searchTerm, filterStatus]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const paginatedDepartments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDepartments.slice(startIndex, endIndex);
  }, [filteredDepartments, currentPage, itemsPerPage]);

  // Load departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = getAccessToken();

      let response;
      if (editingDepartment) {
        // Update existing department
        response = await fetch(
          `/api/admin/departments/${editingDepartment.department_id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(formData),
          }
        );
      } else {
        // Create new department
        response = await fetch("/api/admin/departments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
      }

      // Check if response is OK before attempting to parse JSON
      if (!response.ok) {
        // If response is not ok, try to parse JSON, fallback to status text or generic message
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error?.message || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, use status text or generic message
          errorMessage = response.statusText || errorMessage;
        }
        toast.error(errorMessage);
        return;
      }

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        closeModals();
        fetchDepartments();
      } else {
        toast.error(result.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting department:", error);
      toast.error("Error submitting department");
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingDepartment(null);
    setFormData({ name: "", code: "", active: true });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      active: dept.active,
    });
    setIsEditModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setEditingDepartment(null);
    setFormData({ name: "", code: "", active: true });
  };

  // Delete handlers
  const openDeleteAlert = (id: string) => {
    setDepartmentToDelete(id);
    setShowDeleteAlert(true);
  };

  const closeDeleteAlert = () => {
    setShowDeleteAlert(false);
    setDepartmentToDelete(null);
  };

  // Confirm deletion
  const onConfirmDelete = async () => {
    if (!departmentToDelete) return;

    setIsDeleting(true);
    try {
      const token = getAccessToken();

      const response = await fetch(
        `/api/admin/departments/${departmentToDelete}`,
        {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        let errorMessage = `Failed to delete department: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error?.message || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, use status text or generic message
          errorMessage = response.statusText || errorMessage;
        }
        toast.error(errorMessage);
        return;
      }

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        fetchDepartments();
      } else {
        toast.error(result.message || "Failed to delete department");
      }
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("Error deleting department");
    } finally {
      setIsDeleting(false);
      closeDeleteAlert();
    }
  };

  // Toggle department status
  const toggleDepartmentStatus = async (id: string) => {
    try {
      const token = getAccessToken();

      const response = await fetch(
        `/api/admin/departments/${id}/toggle-status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        fetchDepartments();
      } else {
        toast.error(result.message || "Failed to toggle status");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Error toggling status");
    }
  };

  const renderDepartmentTable = () => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedDepartments.length > 0 ? (
            paginatedDepartments.map((dept) => (
              <TableRow key={dept.department_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="font-medium">{dept.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {dept.code}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        dept.active ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        dept.active ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {dept.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(dept.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(dept)}
                      title="Edit Department"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDepartmentStatus(dept.department_id)}
                      title={dept.active ? "Deactivate" : "Activate"}
                      className="h-8 w-8 p-0"
                    >
                      {dept.active ? (
                        <XCircle className="h-4 w-4 text-orange-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteAlert(dept.department_id)}
                      disabled={dept.active}
                      title="Delete Department"
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
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mb-2 text-muted-foreground/40" />
                  <p className="text-lg font-medium">No Departments Found</p>
                  <p className="text-xs">
                    {searchTerm || filterStatus !== "all"
                      ? "Try adjusting your filters or search terms"
                      : "Get started by creating your first department"}
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderFormModal = (isOpen: boolean, onClose: () => void, title: string) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {editingDepartment
              ? "Update the department details"
              : "Enter the details for the new department"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Human Resources, Information Technology"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Department Code</Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                required
                placeholder="e.g., HR, IT, FIN"
                maxLength={10}
                className="font-mono uppercase"
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.value = target.value.toUpperCase();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Maximum 10 characters, will be converted to uppercase
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, active: checked as boolean }))
                }
              />
              <Label htmlFor="active" className="text-sm font-normal cursor-pointer">
                Set as active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingDepartment ? "Update Department" : "Create Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="w-full flex h-full flex-col bg-background">
      {/* Modals */}
      <AlertModal
        isOpen={showDeleteAlert}
        onClose={closeDeleteAlert}
        onConfirm={onConfirmDelete}
        loading={isDeleting}
        title="Confirm Deletion"
        description="Are you sure you want to delete this department? This action cannot be undone."
      />

      {renderFormModal(isCreateModalOpen, closeModals, "Create New Department")}
      {renderFormModal(isEditModalOpen, closeModals, "Edit Department")}

      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Department Management</h1>
        <p className="text-muted-foreground">
          Manage departments, create new ones, and configure their settings
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              Add Department
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
        ) : (
          <>
            {renderDepartmentTable()}
            {filteredDepartments.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredDepartments.length}
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

export default DepartmentManagementPage;
