"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DataTable, Column } from "@/components/reuseable/data-table";
import { DateTime } from "@/components/wrapper/DateTime";

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
  const [filteredDocumentActions, setFilteredDocumentActions] = useState<DocumentAction[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocumentAction, setEditingDocumentAction] = useState<DocumentAction | null>(
    null
  );
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
        setFilteredDocumentActions(data.data);
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

  // Filter document actions based on search term
  useEffect(() => {
    const filtered = documentActions.filter(
      (action) =>
        action.action_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (action.description && action.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (action.sender_tag && action.sender_tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (action.recipient_tag && action.recipient_tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredDocumentActions(filtered);
  }, [searchTerm, documentActions]);

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
        setIsDialogOpen(false);
        setEditingDocumentAction(null);
        setFormData({
          action_name: "",
          description: "",
          sender_tag: "",
          recipient_tag: "",
          action_date: new Date().toISOString().split('T')[0],
          status: true,
        });
        fetchDocumentActions(); // Refresh the list
      } else {
        toast.error(result.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting document action:", error);
      toast.error("Error submitting document action");
    }
  };

  // Open dialog for creating new document action
  const openCreateDialog = () => {
    setEditingDocumentAction(null);
    setFormData({
      action_name: "",
      description: "",
      sender_tag: "",
      recipient_tag: "",
      action_date: new Date().toISOString().split('T')[0],
      status: true,
    });
    setIsDialogOpen(true);
  };

  // Open dialog for editing existing document action
  const openEditDialog = (action: DocumentAction) => {
    setEditingDocumentAction(action);
    setFormData({
      action_name: action.action_name,
      description: action.description || "",
      sender_tag: action.sender_tag || "",
      recipient_tag: action.recipient_tag || "",
      action_date: new Date(action.action_date).toISOString().split('T')[0],
      status: action.status,
    });
    setIsDialogOpen(true);
  };

  // Open delete confirmation modal
  const onDeleteClick = (id: string) => {
    setDocumentActionToDelete(id);
    setShowDeleteAlert(true);
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
        fetchDocumentActions(); // Refresh the list
      } else {
        toast.error(result.message || "Failed to delete document action");
      }
    } catch (error) {
      console.error("Error deleting document action:", error);
      toast.error("Error deleting document action");
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
      setDocumentActionToDelete(null);
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
        fetchDocumentActions(); // Refresh the list
      } else {
        toast.error(result.message || "Failed to toggle document action status");
      }
    } catch (error) {
      console.error("Error toggling document action status:", error);
      toast.error("Error toggling document action status");
    }
  };

  const handleFormCancel = () => {
    setIsDialogOpen(false);
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

  const documentActionColumns: Column<DocumentAction>[] = [
    {
      header: "Action Name",
      accessorKey: "action_name",
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (row: DocumentAction) => row.description || "-",
    },
    {
      header: "Sender",
      accessorKey: "sender_tag",
      cell: (row: DocumentAction) => row.sender_tag || "-",
    },
    {
      header: "Recipient",
      accessorKey: "recipient_tag",
      cell: (row: DocumentAction) => row.recipient_tag || "-",
    },
    {
      header: "Action Date",
      accessorKey: "action_date",
      cell: (row: DocumentAction) => new Date(row.action_date).toLocaleDateString(),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: DocumentAction) => (
        <Badge variant={row.status ? "default" : "destructive"}>
          {row.status ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Created At",
      accessorKey: "created_at",
      cell: (row: DocumentAction) => <DateTime value={row.created_at} format="date" />,
    },
  ];

  return (
    <DataTable
      title="Document Action Management"
      description="Manage document actions, create new ones, and configure their settings"
      data={filteredDocumentActions}
      columns={documentActionColumns}
      searchTerm={searchTerm}
      onSearchChange={(e) => setSearchTerm(e.target.value)}
      onAddClick={openCreateDialog}
      onEdit={openEditDialog}
      onToggleStatus={toggleDocumentActionStatus}
      onDelete={onDeleteClick}
      isLoading={loading}
      dialogOpen={isDialogOpen}
      onDialogOpenChange={setIsDialogOpen}
      dialogTitle={editingDocumentAction ? "Edit Document Action" : "Create New Document Action"}
      dialogDescription={editingDocumentAction ? "Update the document action details" : "Enter the details for the new document action"}
      dialogContent={
        <>
          <div className="space-y-2">
            <Label htmlFor="action_name">Action Name</Label>
            <Input
              id="action_name"
              name="action_name"
              value={formData.action_name}
              onChange={handleInputChange}
              required
              placeholder="Enter action name"
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
              placeholder="Enter description"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sender_tag">Sender Tag</Label>
            <Input
              id="sender_tag"
              name="sender_tag"
              value={formData.sender_tag}
              onChange={handleInputChange}
              placeholder="Enter sender tag"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient_tag">Recipient Tag</Label>
            <Input
              id="recipient_tag"
              name="recipient_tag"
              value={formData.recipient_tag}
              onChange={handleInputChange}
              placeholder="Enter recipient tag"
            />
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
            <input
              type="checkbox"
              id="status"
              name="status"
              checked={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <Label htmlFor="status">Active</Label>
          </div>
        </>
      }
      formSubmit={handleSubmit}
      formCancel={handleFormCancel}
      addEditButtonText={editingDocumentAction ? "Update Document Action" : "Create Document Action"}
      alertModalProps={{
        isOpen: showDeleteAlert,
        onClose: () => setShowDeleteAlert(false),
        onConfirm: onConfirmDelete,
        loading: isDeleting,
        title: "Confirm Deletion",
        description: "Are you sure you want to delete this document action? This action cannot be undone.",
      }}
      idFieldName="document_action_id"
      statusFieldName="status"
      searchPlaceholder="Search document actions..."
      addButtonText="Add Document Action"
    />
  );
};

export default DocumentActionManagementPage;
