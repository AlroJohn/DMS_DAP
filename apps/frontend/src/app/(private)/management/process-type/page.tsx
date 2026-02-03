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
import { PlusCircle, Search, Edit, Trash2, Clock, Loader2, Eye, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { AlertModal } from "@/components/reuseable/alert-modal";
import { TablePagination } from "@/components/reuseable/table-pagination";
import { toast } from "sonner";

interface ProcessType {
  process_type_id: string;
  name: string;
  description?: string;
  duration_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ProcessTypeManagementPage = () => {
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingProcessType, setViewingProcessType] = useState<ProcessType | null>(null);
  const [editingProcessType, setEditingProcessType] = useState<ProcessType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_days: "",
    is_active: true,
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [processTypeToDelete, setProcessTypeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch process types
  const fetchProcessTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/process-type");
      const data = await response.json();
      setProcessTypes(data);
    } catch (error) {
      console.error("Error fetching process types:", error);
      toast.error("Error fetching process types");
    } finally {
      setLoading(false);
    }
  };

  // Filter process types
  const filteredProcessTypes = useMemo(() => {
    const filtered = processTypes.filter((type) => {
      const matchesSearch =
        type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && type.is_active) ||
        (filterStatus === "inactive" && !type.is_active);

      return matchesSearch && matchesStatus;
    });
    
    setCurrentPage(1);
    return filtered;
  }, [processTypes, searchTerm, filterStatus]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProcessTypes.length / itemsPerPage);
  const paginatedProcessTypes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProcessTypes.slice(startIndex, endIndex);
  }, [filteredProcessTypes, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchProcessTypes();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/process-type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
        }),
      });

      if (response.ok) {
        toast.success("Process type created successfully");
        setIsCreateModalOpen(false);
        setFormData({ name: "", description: "", duration_days: "", is_active: true });
        fetchProcessTypes();
      } else {
        toast.error("Failed to create process type");
      }
    } catch (error) {
      console.error("Error creating process type:", error);
      toast.error("Error creating process type");
    }
  };

  const handleEdit = (processType: ProcessType) => {
    setEditingProcessType(processType);
    setFormData({
      name: processType.name,
      description: processType.description || "",
      duration_days: processType.duration_days?.toString() || "",
      is_active: processType.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleView = (processType: ProcessType) => {
    setViewingProcessType(processType);
    setIsViewModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProcessType) return;

    try {
      const response = await fetch(`/api/process-type/${editingProcessType.process_type_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
        }),
      });

      if (response.ok) {
        toast.success("Process type updated successfully");
        setIsEditModalOpen(false);
        setEditingProcessType(null);
        setFormData({ name: "", description: "", duration_days: "", is_active: true });
        fetchProcessTypes();
      } else {
        toast.error("Failed to update process type");
      }
    } catch (error) {
      console.error("Error updating process type:", error);
      toast.error("Error updating process type");
    }
  };

  const handleDeleteClick = (id: string) => {
    setProcessTypeToDelete(id);
    setShowDeleteAlert(true);
  };

  const handleDeleteConfirm = async () => {
    if (!processTypeToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/process-type/${processTypeToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Process type deleted successfully");
        fetchProcessTypes();
      } else {
        toast.error("Failed to delete process type");
      }
    } catch (error) {
      console.error("Error deleting process type:", error);
      toast.error("Error deleting process type");
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
      setProcessTypeToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Process Type Management</h1>
          <p className="text-gray-500">Manage process types and their durations</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Process Type
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search process types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Duration (Days)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProcessTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No process types found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProcessTypes.map((processType) => (
                  <TableRow key={processType.process_type_id}>
                    <TableCell className="font-medium">{processType.name}</TableCell>
                    <TableCell>{processType.description || "-"}</TableCell>
                    <TableCell>
                      {processType.duration_days ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {processType.duration_days} days
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={processType.is_active ? "default" : "secondary"}>
                        {processType.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(processType.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(processType)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(processType)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(processType.process_type_id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredProcessTypes.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Process Type</DialogTitle>
            <DialogDescription>
              Add a new process type with duration configuration
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="duration_days">Duration (Days)</Label>
                <Input
                  id="duration_days"
                  name="duration_days"
                  type="number"
                  min="0"
                  value={formData.duration_days}
                  onChange={handleInputChange}
                  placeholder="e.g., 7, 14, 30"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked as boolean }))
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Process Type</DialogTitle>
            <DialogDescription>
              Update process type information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="edit-duration_days">Duration (Days)</Label>
                <Input
                  id="edit-duration_days"
                  name="duration_days"
                  type="number"
                  min="0"
                  value={formData.duration_days}
                  onChange={handleInputChange}
                  placeholder="e.g., 7, 14, 30"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked as boolean }))
                  }
                />
                <Label htmlFor="edit-is_active">Active</Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Process Type Details</DialogTitle>
            <DialogDescription>
              View complete information about this process type
            </DialogDescription>
          </DialogHeader>
          
          {viewingProcessType && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-base font-semibold mt-1">{viewingProcessType.name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-base mt-1">
                      {viewingProcessType.description || "No description provided"}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {viewingProcessType.is_active ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <Badge variant="default">Active</Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-gray-400" />
                          <Badge variant="secondary">Inactive</Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duration & Timeline */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Duration & Timeline</h3>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Duration</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <p className="text-base font-semibold">
                        {viewingProcessType.duration_days ? `${viewingProcessType.duration_days} days` : "Not specified"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Created At</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <p className="text-sm">
                        {new Date(viewingProcessType.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <p className="text-sm">
                        {new Date(viewingProcessType.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Type ID */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-500">Process Type ID</label>
                <code className="text-xs bg-gray-100 px-3 py-2 rounded block mt-2 break-all">
                  {viewingProcessType.process_type_id}
                </code>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsViewModalOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewingProcessType) {
                  setIsViewModalOpen(false);
                  handleEdit(viewingProcessType);
                }
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertModal
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Delete Process Type"
        description="Are you sure you want to delete this process type? This action cannot be undone."
      />
    </div>
  );
};

export default ProcessTypeManagementPage;
