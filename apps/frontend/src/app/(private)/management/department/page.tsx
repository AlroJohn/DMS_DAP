"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DataTable, Column } from "@/components/reuseable/data-table";
import { DateTime } from "@/components/wrapper/DateTime";

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
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    active: true,
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("accessToken") ||
        document.cookie
          .split(";")
          .find((c) => c.trim().startsWith("accessToken="))
          ?.split("=")[1];

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
        setFilteredDepartments(data.data);
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

  // Filter departments based on search term
  useEffect(() => {
    const filtered = departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDepartments(filtered);
  }, [searchTerm, departments]);

  // Load departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token =
        localStorage.getItem("accessToken") ||
        document.cookie
          .split(";")
          .find((c) => c.trim().startsWith("accessToken="))
          ?.split("=")[1];

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
        setIsDialogOpen(false);
        setEditingDepartment(null);
        setFormData({ name: "", code: "", active: true });
        fetchDepartments(); // Refresh the list
      } else {
        toast.error(result.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting department:", error);
      toast.error("Error submitting department");
    }
  };

  // Open dialog for creating new department
  const openCreateDialog = () => {
    setEditingDepartment(null);
    setFormData({ name: "", code: "", active: true });
    setIsDialogOpen(true);
  };

  // Open dialog for editing existing department
  const openEditDialog = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      active: dept.active,
    });
    setIsDialogOpen(true);
  };

  // Open delete confirmation modal
  const onDeleteClick = (id: string) => {
    setDepartmentToDelete(id);
    setShowDeleteAlert(true);
  };

  // Confirm deletion
  const onConfirmDelete = async () => {
    if (!departmentToDelete) return;

    setIsDeleting(true);
    try {
      const token =
        localStorage.getItem("accessToken") ||
        document.cookie
          .split(";")
          .find((c) => c.trim().startsWith("accessToken="))
          ?.split("=")[1];

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
        fetchDepartments(); // Refresh the list
      } else {
        toast.error(
          result.message || "Failed to permanently delete department"
        );
      }
    } catch (error) {
      console.error("Error deactivating department:", error);
      toast.error("Error deactivating department");
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
      setDepartmentToDelete(null);
    }
  };

  // Toggle department status
  const toggleDepartmentStatus = async (id: string) => {
    try {
      const token =
        localStorage.getItem("accessToken") ||
        document.cookie
          .split(";")
          .find((c) => c.trim().startsWith("accessToken="))
          ?.split("=")[1];

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
        fetchDepartments(); // Refresh the list
      } else {
        toast.error(result.message || "Failed to toggle department status");
      }
    } catch (error) {
      console.error("Error toggling department status:", error);
      toast.error("Error toggling department status");
    }
  };

  const handleFormCancel = () => {
    setIsDialogOpen(false);
    setEditingDepartment(null);
    setFormData({ name: "", code: "", active: true });
  };

  const departmentColumns: Column<Department>[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Code",
      accessorKey: "code",
      cell: (row: Department) => <Badge variant="outline">{row.code}</Badge>,
    },
    {
      header: "Status",
      accessorKey: "active",
      cell: (row: Department) => (
        <Badge variant={row.active ? "default" : "destructive"}>
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Created",
      accessorKey: "created_at",
      cell: (row: Department) => (
        <DateTime value={row.created_at} format="date" />
      ),
    },
  ];

  return (
    <DataTable
      title="Department Management"
      description="Manage departments, create new ones, and configure their settings"
      data={filteredDepartments}
      columns={departmentColumns}
      searchTerm={searchTerm}
      onSearchChange={(e) => setSearchTerm(e.target.value)}
      onAddClick={openCreateDialog}
      onEdit={openEditDialog}
      onToggleStatus={toggleDepartmentStatus}
      onDelete={onDeleteClick}
      isLoading={loading}
      dialogOpen={isDialogOpen}
      onDialogOpenChange={setIsDialogOpen}
      dialogTitle={
        editingDepartment ? "Edit Department" : "Create New Department"
      }
      dialogDescription={
        editingDepartment
          ? "Update the department details"
          : "Enter the details for the new department"
      }
      dialogContent={
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Department Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Enter department name"
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
              placeholder="Enter department code (e.g., HR, IT, FIN)"
              maxLength={10}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleInputChange}
              className="h-4 w-4"
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </>
      }
      formSubmit={handleSubmit}
      formCancel={handleFormCancel}
      addEditButtonText={
        editingDepartment ? "Update Department" : "Create Department"
      }
      alertModalProps={{
        isOpen: showDeleteAlert,
        onClose: () => setShowDeleteAlert(false),
        onConfirm: onConfirmDelete,
        loading: isDeleting,
        title: "Confirm Permanent Deletion",
        description:
          "Are you sure you want to permanently delete this department? This action cannot be undone.",
      }}
      idFieldName="department_id"
      statusFieldName="active"
      searchPlaceholder="Search departments..."
      addButtonText="Add Department"
    />
  );
};

export default DepartmentManagementPage;
