"use client";

import React, { useMemo, useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Search, Edit, Trash2, FileType, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { AlertModal } from "@/components/reuseable/alert-modal";
import { TablePagination } from "@/components/reuseable/table-pagination";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDocumentType, setEditingDocumentType] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [documentTypeToDelete, setDocumentTypeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Filter document types
  const filteredDocumentTypes = useMemo(() => {
    const filtered = documentTypes.filter((type) => {
      const matchesSearch =
        type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && type.active) ||
        (filterStatus === "inactive" && !type.active);

      return matchesSearch && matchesStatus;
    });
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
    
    return filtered;
  }, [documentTypes, searchTerm, filterStatus]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDocumentTypes.length / itemsPerPage);
  const paginatedDocumentTypes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDocumentTypes.slice(startIndex, endIndex);
  }, [filteredDocumentTypes, currentPage, itemsPerPage]);

  // Load document types on component mount
  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
        closeModals();
        fetchDocumentTypes();
      } else {
        toast.error(result.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting document type:", error);
      toast.error("Error submitting document type");
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingDocumentType(null);
    setFormData({ name: "", description: "", active: true });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (type: DocumentType) => {
    setEditingDocumentType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      active: type.active,
    });
    setIsEditModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setEditingDocumentType(null);
    setFormData({ name: "", description: "", active: true });
  };

  // Delete handlers
  const openDeleteAlert = (id: string) => {
    setDocumentTypeToDelete(id);
    setShowDeleteAlert(true);
  };

  const closeDeleteAlert = () => {
    setShowDeleteAlert(false);
    setDocumentTypeToDelete(null);
  };

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
        fetchDocumentTypes();
      } else {
        toast.error(result.message || "Failed to delete document type");
      }
    } catch (error) {
      console.error("Error deleting document type:", error);
      toast.error("Error deleting document type");
    } finally {
      setIsDeleting(false);
      closeDeleteAlert();
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
        fetchDocumentTypes();
      } else {
        toast.error(result.message || "Failed to toggle status");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Error toggling status");
    }
  };

  const renderDocumentTypeTable = () => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedDocumentTypes.length > 0 ? (
            paginatedDocumentTypes.map((type) => (
              <TableRow key={type.type_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileType className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="font-medium">{type.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {type.description || "No description"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        type.active ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        type.active ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {type.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(type.created_at).toLocaleDateString("en-US", {
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
                      onClick={() => openEditModal(type)}
                      title="Edit Document Type"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDocumentTypeStatus(type.type_id)}
                      title={type.active ? "Deactivate" : "Activate"}
                      className="h-8 w-8 p-0"
                    >
                      {type.active ? (
                        <XCircle className="h-4 w-4 text-orange-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteAlert(type.type_id)}
                      disabled={type.active}
                      title="Delete Document Type"
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
                  <FileType className="h-12 w-12 mb-2 text-muted-foreground/40" />
                  <p className="text-lg font-medium">No Document Types Found</p>
                  <p className="text-xs">
                    {searchTerm || filterStatus !== "all"
                      ? "Try adjusting your filters or search terms"
                      : "Get started by creating your first document type"}
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
            {editingDocumentType
              ? "Update the document type details"
              : "Enter the details for the new document type"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Document Type Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Contract, Invoice, Report"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the purpose of this document type"
                rows={4}
              />
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
              {editingDocumentType ? "Update Document Type" : "Create Document Type"}
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
        description="Are you sure you want to delete this document type? This action cannot be undone."
      />

      {renderFormModal(isCreateModalOpen, closeModals, "Create New Document Type")}
      {renderFormModal(isEditModalOpen, closeModals, "Edit Document Type")}

      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Document Type Management</h1>
        <p className="text-muted-foreground">
          Manage document types, create new ones, and configure their settings
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search document types..."
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
              Add Document Type
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
            {renderDocumentTypeTable()}
            {filteredDocumentTypes.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredDocumentTypes.length}
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

export default DocumentTypeManagementPage;
