"use client";

import { DataTable, Column } from "@/components/reuseable/data-table";
import { DateTime } from "@/components/wrapper/DateTime";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface DocumentType {
  type_id: string;

  name: string;

  description: string;

  active: boolean;

  created_at: string;

  updated_at: string;

  created_by?: {
    email: string;

    first_name: string;

    last_name: string;
  };
}

const DocumentTypeManagementPage = () => {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  const [filteredDocumentTypes, setFilteredDocumentTypes] = useState<
    DocumentType[]
  >([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [editingDocumentType, setEditingDocumentType] =
    useState<DocumentType | null>(null);

  const [formData, setFormData] = useState({
    name: "",

    description: "",

    active: true,
  });

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const [documentTypeToDelete, setDocumentTypeToDelete] = useState<
    string | null
  >(null);

  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch document types

  const fetchDocumentTypes = async () => {
    try {
      setLoading(true);

      const token =
        localStorage.getItem("accessToken") ||
        document.cookie

          .split(";")

          .find((c) => c.trim().startsWith("accessToken="))

          ?.split("=")[1];

      const response = await fetch("/api/admin/document-types", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setDocumentTypes(data.data);

        setFilteredDocumentTypes(data.data);
      } else {
        toast.error("Failed to fetch document types");
      }
    } catch (error) {
      console.error("Error fetching document types:", error);

      toast.error("Error fetching document types");
    } finally {
      setLoading(false);
    }
  };

  // Filter document types based on search term

  useEffect(() => {
    const filtered = documentTypes.filter(
      (type) =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (type.description &&
          type.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredDocumentTypes(filtered);
  }, [searchTerm, documentTypes]);

  // Load document types on component mount

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  // Handle form input changes

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;

    const { name, value, type } = target;

    setFormData((prev) => ({
      ...prev,

      [name]: type === "checkbox" ? target.checked : value,
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

      if (editingDocumentType) {
        // Update existing document type

        response = await fetch(
          `/api/admin/document-types/${editingDocumentType.type_id}`,

          {
            method: "PUT",

            headers: {
              "Content-Type": "application/json",

              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify(formData),
          }
        );
      } else {
        // Create new document type

        response = await fetch("/api/admin/document-types", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(formData),
        });
      }

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);

        setIsDialogOpen(false);

        setEditingDocumentType(null);

        setFormData({ name: "", description: "", active: true });

        fetchDocumentTypes(); // Refresh the list
      } else {
        toast.error(result.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting document type:", error);

      toast.error("Error submitting document type");
    }
  };

  // Open dialog for creating new document type

  const openCreateDialog = () => {
    setEditingDocumentType(null);

    setFormData({ name: "", description: "", active: true });

    setIsDialogOpen(true);
  };

  // Open dialog for editing existing document type

  const openEditDialog = (type: DocumentType) => {
    setEditingDocumentType(type);

    setFormData({
      name: type.name,

      description: type.description || "",

      active: type.active,
    });

    setIsDialogOpen(true);
  };

  // Open delete confirmation modal

  const onDeleteClick = (id: string) => {
    setDocumentTypeToDelete(id);

    setShowDeleteAlert(true);
  };

  // Confirm deletion

  const onConfirmDelete = async () => {
    if (!documentTypeToDelete) return;

    setIsDeleting(true);

    try {
      const token =
        localStorage.getItem("accessToken") ||
        document.cookie

          .split(";")

          .find((c) => c.trim().startsWith("accessToken="))

          ?.split("=")[1];

      const response = await fetch(
        `/api/admin/document-types/${documentTypeToDelete}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);

        fetchDocumentTypes(); // Refresh the list
      } else {
        toast.error(
          result.message || "Failed to permanently delete document type"
        );
      }
    } catch (error) {
      console.error("Error deactivating document type:", error);

      toast.error("Error deactivating document type");
    } finally {
      setIsDeleting(false);

      setShowDeleteAlert(false);

      setDocumentTypeToDelete(null);
    }
  };

  // Toggle document type status

  const toggleDocumentTypeStatus = async (id: string) => {
    try {
      const token =
        localStorage.getItem("accessToken") ||
        document.cookie

          .split(";")

          .find((c) => c.trim().startsWith("accessToken="))

          ?.split("=")[1];

      const response = await fetch(
        `/api/admin/document-types/${id}/toggle-status`,
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

        fetchDocumentTypes(); // Refresh the list
      } else {
        toast.error(result.message || "Failed to toggle document type status");
      }
    } catch (error) {
      console.error("Error toggling document type status:", error);

      toast.error("Error toggling document type status");
    }
  };

  const handleFormCancel = () => {
    setIsDialogOpen(false);

    setEditingDocumentType(null);

    setFormData({ name: "", description: "", active: true });
  };

  const documentTypeColumns: Column<DocumentType>[] = [
    {
      header: "Name",

      accessorKey: "name",
    },

    {
      header: "Description",

      accessorKey: "description",

      cell: (row: DocumentType) => row.description || "-",
    },

    {
      header: "Status",

      accessorKey: "active",

      cell: (row: DocumentType) => (
        <Badge variant={row.active ? "default" : "destructive"}>
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },

    {
      header: "Created",

      accessorKey: "created_at",

      cell: (row: DocumentType) => <DateTime value={row.created_at} format="date" />,
    },
  ];

  return (
    <DataTable
      title="Document Type Management"
      description="Manage document types, create new ones, and configure their settings"
      data={filteredDocumentTypes}
      columns={documentTypeColumns}
      searchTerm={searchTerm}
      onSearchChange={(e) => setSearchTerm(e.target.value)}
      onAddClick={openCreateDialog}
      onEdit={openEditDialog}
      onToggleStatus={toggleDocumentTypeStatus}
      onDelete={onDeleteClick}
      isLoading={loading}
      dialogOpen={isDialogOpen}
      onDialogOpenChange={setIsDialogOpen}
      dialogTitle={
        editingDocumentType ? "Edit Document Type" : "Create New Document Type"
      }
      dialogDescription={
        editingDocumentType
          ? "Update the document type details"
          : "Enter the details for the new document type"
      }
      dialogContent={
        <>
          <div className="space-y-2">
            <Label htmlFor="name">Document Type Name</Label>

            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Enter document type name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
              placeholder="Enter document type description"
              rows={4}
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
        editingDocumentType ? "Update Document Type" : "Create Document Type"
      }
      alertModalProps={{
        isOpen: showDeleteAlert,

        onClose: () => setShowDeleteAlert(false),

        onConfirm: onConfirmDelete,

        loading: isDeleting,

        title: "Confirm Deletion",

        description:
          "Are you sure you want to delete this document type? This action cannot be undone.",
      }}
      idFieldName="type_id"
      statusFieldName="active"
      searchPlaceholder="Search document types..."
      addButtonText="Add Document Type"
    />
  );
};

export default DocumentTypeManagementPage;
