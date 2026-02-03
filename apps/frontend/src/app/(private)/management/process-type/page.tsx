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
  code?: string;
  name: string;
  description?: string;
  duration_value?: number;
  duration_unit?: string;
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
    code: "",
    name: "",
    description: "",
    duration_value: "",
    duration_unit: "days",
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
      const response = await fetch("/api/process-type", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch process types");
      }
      
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setProcessTypes(data);
      } else {
        console.error("Invalid response format:", data);
        setProcessTypes([]);
        toast.error("Invalid data format received");
      }
    } catch (error) {
      console.error("Error fetching process types:", error);
      toast.error("Error fetching process types");
      setProcessTypes([]); // Set empty array on error
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
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          duration_value: formData.duration_value ? parseInt(formData.duration_value) : null,
        }),
      });

      if (response.ok) {
        toast.success("Process type created successfully");
        setIsCreateModalOpen(false);
        setFormData({ code: "", name: "", description: "", duration_value: "", duration_unit: "days", is_active: true });
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
      code: processType.code || "",
      name: processType.name || "",
      description: processType.description || "",
      duration_value: processType.duration_value?.toString() || "",
      duration_unit: processType.duration_unit || "days",
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
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          duration_value: formData.duration_value ? parseInt(formData.duration_value) : null,
        }),
      });

      if (response.ok) {
        toast.success("Process type updated successfully");
        setIsEditModalOpen(false);
        setEditingProcessType(null);
        setFormData({ code: "", name: "", description: "", duration_value: "", duration_unit: "days", is_active: true });
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
        credentials: "include",
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
    <div className="w-full flex h-full flex-col bg-background">
      {/* Modals */}
      <AlertModal
        isOpen={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Delete Process Type"
        description="Are you sure you want to delete this process type? This action cannot be undone."
      />

      {/* Header */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Process Type Management</h1>
        <p className="text-muted-foreground">
          Manage process types and their durations
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search process types..."
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
            <Button onClick={() => setIsCreateModalOpen(true)} className="h-9">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Process Type
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
            <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process Type</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProcessTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No process types found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProcessTypes.map((processType) => (
                    <TableRow key={processType.process_type_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <span className="font-medium">{processType.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {processType.code || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {processType.description || "No description"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {processType.duration_value ? (
                          <span className="text-sm">{processType.duration_value} {processType.duration_unit || 'days'}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              processType.is_active ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span
                            className={`text-xs ${
                              processType.is_active ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {processType.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(processType.created_at).toLocaleDateString("en-US", {
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
                            onClick={() => handleView(processType)}
                            title="View Details"
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
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredProcessTypes.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredProcessTypes.length}
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

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Create Process Type
            </DialogTitle>
            <DialogDescription>
              Define a new process type to categorize and track document workflows with specific duration requirements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <h4 className="text-sm font-semibold text-gray-700">Basic Information</h4>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-medium">
                    Process Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., DOC_REV, APPROVAL, SIGNING"
                    required
                    className="text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    A unique code identifier (uppercase letters, numbers, and underscores)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Process Type Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Document Review, Approval Process"
                    required
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Give this process type a clear, descriptive name
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the purpose and use case for this process type..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Provide additional details about when to use this process type
                  </p>
                </div>
              </div>

              {/* Duration Configuration Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <h4 className="text-sm font-semibold text-gray-700">Duration Settings</h4>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Expected Duration</Label>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-3">
                      <Input
                        id="duration_value"
                        name="duration_value"
                        type="number"
                        min="0"
                        value={formData.duration_value}
                        onChange={handleInputChange}
                        placeholder="Enter number"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={formData.duration_unit}
                        onValueChange={(value) => setFormData({ ...formData, duration_unit: value })}
                      >
                        <SelectTrigger id="duration_unit" className="text-sm">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set the typical time required to complete this process (optional)
                  </p>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <h4 className="text-sm font-semibold text-gray-700">Status</h4>
                </div>
                
                <div className="flex items-start space-x-3 rounded-lg border p-3 bg-gray-50/50">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                      Active Process Type
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Active process types are available for selection when creating documents
                    </p>
                  </div>
                </div>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Edit Process Type
            </DialogTitle>
            <DialogDescription>
              Update the details and configuration for this process type.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <h4 className="text-sm font-semibold text-gray-700">Basic Information</h4>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-code" className="text-sm font-medium">
                    Process Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., DOC_REV, APPROVAL, SIGNING"
                    required
                    className="text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    A unique code identifier (uppercase letters, numbers, and underscores)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-medium">
                    Process Type Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Document Review, Approval Process"
                    required
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Give this process type a clear, descriptive name
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the purpose and use case for this process type..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Provide additional details about when to use this process type
                  </p>
                </div>
              </div>

              {/* Duration Configuration Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <h4 className="text-sm font-semibold text-gray-700">Duration Settings</h4>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Expected Duration</Label>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-3">
                      <Input
                        id="edit-duration_value"
                        name="duration_value"
                        type="number"
                        min="0"
                        value={formData.duration_value}
                        onChange={handleInputChange}
                        placeholder="Enter number"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={formData.duration_unit}
                        onValueChange={(value) => setFormData({ ...formData, duration_unit: value })}
                      >
                        <SelectTrigger id="edit-duration_unit" className="text-sm">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set the typical time required to complete this process (optional)
                  </p>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <h4 className="text-sm font-semibold text-gray-700">Status</h4>
                </div>
                
                <div className="flex items-start space-x-3 rounded-lg border p-3 bg-gray-50/50">
                  <Checkbox
                    id="edit-is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked as boolean }))
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="edit-is_active" className="text-sm font-medium cursor-pointer">
                      Active Process Type
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Active process types are available for selection when creating documents
                    </p>
                  </div>
                </div>
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                    <label className="text-sm font-medium text-gray-500">Process Code</label>
                    <div className="mt-1">
                      <Badge variant="outline" className="font-mono text-sm">
                        {viewingProcessType.code || "N/A"}
                      </Badge>
                    </div>
                  </div>

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
                        {viewingProcessType.duration_value ? `${viewingProcessType.duration_value} ${viewingProcessType.duration_unit || 'days'}` : "Not specified"}
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
