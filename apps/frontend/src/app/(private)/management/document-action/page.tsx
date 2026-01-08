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
import { PlusCircle, Search, Edit, Trash2, Loader2, CheckCircle2, XCircle, Zap, ArrowRight, Tag } from "lucide-react";
import { AlertModal } from "@/components/reuseable/alert-modal";
import { TablePagination } from "@/components/reuseable/table-pagination";
import { toast } from "sonner";

interface DocumentAction {
  document_action_id: string;
  action_name: string;
  description?: string;
  sender_tag?: string;
  recipient_tag?: string;
  action_date: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

const DocumentActionManagementPage = () => {
  const [documentActions, setDocumentActions] = useState<DocumentAction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDocumentAction, setEditingDocumentAction] = useState<DocumentAction | null>(null);
  const [formData, setFormData] = useState({
    action_name: "",
    description: "",
    sender_tag: "",
    recipient_tag: "",
    action_date: new Date().toISOString().split('T')[0],
    status: true,
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [documentActionToDelete, setDocumentActionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch document actions
  const fetchDocumentActions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || document.cookie
        .split(';')
        .find(c => c.trim().startsWith('accessToken='))
        ?.split('=')[1];
      
      const response = await fetch("/api/admin/document-actions", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setDocumentActions(data.data);
      } else {
        toast.error("Failed to fetch document actions");
      }
    } catch (error) {
      console.error("Error fetching document actions:", error);
      toast.error("Error fetching document actions");
    } finally {
      setLoading(false);
    }
  };

  // Filter document actions
  const filteredDocumentActions = useMemo(() => {
    const filtered = documentActions.filter((action) => {
      const matchesSearch =
        action.action_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (action.description && action.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (action.sender_tag && action.sender_tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (action.recipient_tag && action.recipient_tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && action.status) ||
        (filterStatus === "inactive" && !action.status);

      return matchesSearch && matchesStatus;
    });
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
    
    return filtered;
  }, [documentActions, searchTerm, filterStatus]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDocumentActions.length / itemsPerPage);
  const paginatedDocumentActions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDocumentActions.slice(startIndex, endIndex);
  }, [filteredDocumentActions, currentPage, itemsPerPage]);

  // Load document actions on component mount
  useEffect(() => {
    fetchDocumentActions();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const token = localStorage.getItem('accessToken') || document.cookie
        .split(';')
        .find(c => c.trim().startsWith('accessToken='))
        ?.split('=')[1];
        
      let response;
      if (editingDocumentAction) {
        // Update existing document action
        response = await fetch(
          `/api/admin/document-actions/${editingDocumentAction.document_action_id}`,
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
        // Create new document action
        response = await fetch("/api/admin/document-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
      }

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        closeModals();
        fetchDocumentActions();
      } else {
        toast.error(result.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting document action:", error);
      toast.error("Error submitting document action");
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingDocumentAction(null);
    setFormData({
      action_name: "",
      description: "",
      sender_tag: "",
      recipient_tag: "",
      action_date: new Date().toISOString().split('T')[0],
      status: true,
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (action: DocumentAction) => {
    setEditingDocumentAction(action);
    setFormData({
      action_name: action.action_name,
      description: action.description || "",
      sender_tag: action.sender_tag || "",
      recipient_tag: action.recipient_tag || "",
      action_date: new Date(action.action_date).toISOString().split('T')[0],
      status: action.status,
    });
    setIsEditModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setEditingDocumentAction(null);
    setFormData({
      action_name: "",
      description: "",
      sender_tag: "",
      recipient_tag: "",
      action_date: new Date().toISOString().split('T')[0],
      status: true,
    });
  };

  // Delete handlers
  const openDeleteAlert = (id: string) => {
    setDocumentActionToDelete(id);
    setShowDeleteAlert(true);
  };

  const closeDeleteAlert = () => {
    setShowDeleteAlert(false);
    setDocumentActionToDelete(null);
  };

  // Confirm deletion
  const onConfirmDelete = async () => {
    if (!documentActionToDelete) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken') || document.cookie
        .split(';')
        .find(c => c.trim().startsWith('accessToken='))
        ?.split('=')[1];
        
      const response = await fetch(`/api/admin/document-actions/${documentActionToDelete}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        fetchDocumentActions();
      } else {
        toast.error(result.message || "Failed to delete document action");
      }
    } catch (error) {
      console.error("Error deleting document action:", error);
      toast.error("Error deleting document action");
    } finally {
      setIsDeleting(false);
      closeDeleteAlert();
    }
  };

  // Toggle document action status
  const toggleDocumentActionStatus = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken') || document.cookie
        .split(';')
        .find(c => c.trim().startsWith('accessToken='))
        ?.split('=')[1];
        
      const response = await fetch(`/api/admin/document-actions/${id}/toggle-status`, {
        method: "PATCH",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        fetchDocumentActions();
      } else {
        toast.error(result.message || "Failed to toggle status");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Error toggling status");
    }
  };

  const renderDocumentActionTable = () => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Workflow</TableHead>
            <TableHead>Action Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedDocumentActions.length > 0 ? (
            paginatedDocumentActions.map((action) => (
              <TableRow key={action.document_action_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <span className="font-medium">{action.action_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {action.description || "No description"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {action.sender_tag && (
                      <Badge variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {action.sender_tag}
                      </Badge>
                    )}
                    {action.sender_tag && action.recipient_tag && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    {action.recipient_tag && (
                      <Badge variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {action.recipient_tag}
                      </Badge>
                    )}
                    {!action.sender_tag && !action.recipient_tag && (
                      <span className="text-xs text-muted-foreground">No workflow</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(action.action_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        action.status ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        action.status ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {action.status ? "Active" : "Inactive"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(action)}
                      title="Edit Document Action"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDocumentActionStatus(action.document_action_id)}
                      title={action.status ? "Deactivate" : "Activate"}
                      className="h-8 w-8 p-0"
                    >
                      {action.status ? (
                        <XCircle className="h-4 w-4 text-orange-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteAlert(action.document_action_id)}
                      disabled={action.status}
                      title="Delete Document Action"
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
                  <Zap className="h-12 w-12 mb-2 text-muted-foreground/40" />
                  <p className="text-lg font-medium">No Document Actions Found</p>
                  <p className="text-xs">
                    {searchTerm || filterStatus !== "all"
                      ? "Try adjusting your filters or search terms"
                      : "Get started by creating your first document action"}
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
            {editingDocumentAction
              ? "Update the document action details"
              : "Enter the details for the new document action"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action_name">Action Name</Label>
              <Input
                id="action_name"
                name="action_name"
                value={formData.action_name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Submit, Approve, Review"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the purpose of this action"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender_tag">Sender Tag</Label>
                <Input
                  id="sender_tag"
                  name="sender_tag"
                  value={formData.sender_tag}
                  onChange={handleInputChange}
                  placeholder="e.g., submitter"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient_tag">Recipient Tag</Label>
                <Input
                  id="recipient_tag"
                  name="recipient_tag"
                  value={formData.recipient_tag}
                  onChange={handleInputChange}
                  placeholder="e.g., approver"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action_date">Action Date</Label>
              <Input
                id="action_date"
                name="action_date"
                type="date"
                value={formData.action_date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="status"
                checked={formData.status}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, status: checked as boolean }))
                }
              />
              <Label htmlFor="status" className="text-sm font-normal cursor-pointer">
                Set as active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingDocumentAction ? "Update Document Action" : "Create Document Action"}
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
        description="Are you sure you want to delete this document action? This action cannot be undone."
      />

      {renderFormModal(isCreateModalOpen, closeModals, "Create New Document Action")}
      {renderFormModal(isEditModalOpen, closeModals, "Edit Document Action")}

      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Document Action Management</h1>
        <p className="text-muted-foreground">
          Manage document actions, create new ones, and configure their workflow settings
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search document actions..."
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
              Add Document Action
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
            {renderDocumentActionTable()}
            {filteredDocumentActions.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredDocumentActions.length}
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

export default DocumentActionManagementPage;
