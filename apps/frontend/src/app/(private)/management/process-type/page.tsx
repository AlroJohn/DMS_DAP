"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ViewProcessType from "./[id]/viewID";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  Clock,
  Loader2,
  Eye,
  Calendar,
  CheckCircle2,
  XCircle,
  X,
  Recycle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  origin_department_id?: string | null;
  originDepartment?: {
    department_id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface Department {
  department_id: string;
  name: string;
  code?: string;
  group?: {
    group_id: string;
    name: string;
    code: string;
  } | null;
  center?: {
    center_id: string;
    name: string;
    code: string;
  } | null;
}

const NO_CENTER_CODE = "__NO_CENTER__";
const NO_CENTER_LABEL = "No Center";

// Convert duration to minutes based on unit
const convertDurationToMinutes = (days: number, hours: number, minutes: number): number => {
  return (days * 24 * 60) + (hours * 60) + minutes;
};

// Format duration from minutes to readable format
const formatDurationFromMinutes = (minutes: number): string => {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} day${days !== 1 ? "s" : ""}`;
  } else if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    const remainingMinutes = minutes % 60;
    let result = `${days}d`;
    if (remainingHours > 0) result += ` ${remainingHours}h`;
    if (remainingMinutes > 0) result += ` ${remainingMinutes}m`;
    return result;
  } else if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
};

// Convert minutes to days, hours, minutes breakdown
const convertMinutesToBreakdown = (totalMinutes: number): { days: number; hours: number; minutes: number } => {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
};

const ProcessTypeManagementPage = () => {
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const router = useRouter();
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingProcessType, setViewingProcessType] =
    useState<ProcessType | null>(null);
  const [editingProcessType, setEditingProcessType] =
    useState<ProcessType | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    duration_days: "",
    duration_hours: "",
    duration_minutes: "",
    origin_department_id: "",
    is_active: true,
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [processTypeToDelete, setProcessTypeToDelete] = useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [centerFilter, setCenterFilter] = useState("");

  // Build group and center options from departments
  const groupOptions = useMemo(() => {
    const groups = new Map<string, { code: string; name: string }>();
    departments.forEach((dept) => {
      if (dept.group) {
        groups.set(dept.group.code, { code: dept.group.code, name: dept.group.name });
      }
    });
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const centerOptions = useMemo(() => {
    const centers = new Map<string, { code: string; name: string }>();
    departments
      .filter((dept) => !groupFilter || dept.group?.code === groupFilter)
      .forEach((dept) => {
        if (dept.center) {
          centers.set(dept.center.code, { code: dept.center.code, name: dept.center.name });
        }
      });
    // Add "No Center" option if there are departments without center
    const hasNoCenterDepts = departments.some(
      (dept) => (!groupFilter || dept.group?.code === groupFilter) && !dept.center
    );
    const result = Array.from(centers.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (hasNoCenterDepts) {
      result.unshift({ code: NO_CENTER_CODE, name: NO_CENTER_LABEL });
    }
    return result;
  }, [departments, groupFilter]);

  // Filter departments based on search and filters
  const filteredDepartments = useMemo(() => {
    let filtered = departments;

    // Filter by group
    if (groupFilter) {
      filtered = filtered.filter((dept) => dept.group?.code === groupFilter);
    }

    // Filter by center
    if (centerFilter) {
      if (centerFilter === NO_CENTER_CODE) {
        filtered = filtered.filter((dept) => !dept.center);
      } else {
        filtered = filtered.filter((dept) => dept.center?.code === centerFilter);
      }
    }

    // Filter by search
    if (departmentSearch.trim()) {
      const search = departmentSearch.toLowerCase();
      filtered = filtered.filter(
        (dept) =>
          dept.code?.toLowerCase().includes(search) ||
          dept.name.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [departments, departmentSearch, groupFilter, centerFilter]);

  const clearDepartmentFilters = () => {
    setDepartmentSearch("");
    setGroupFilter("");
    setCenterFilter("");
  };

  // Fetch departments (all)
  const fetchDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      const response = await fetch("/api/departments?limit=1000", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch departments");
      }

      const data = await response.json();
      // Handle both array response and { data: [...] } response
      const deptArray = Array.isArray(data) ? data : (data.data || []);
      setDepartments(deptArray);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Error fetching departments");
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

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

      // Handle the response format { success: true, data: [] }
      if (data.success && Array.isArray(data.data)) {
        setProcessTypes(data.data);
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
        (type.description &&
          type.description.toLowerCase().includes(searchTerm.toLowerCase()));

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
    fetchDepartments();
    fetchProcessTypes();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert duration to minutes (days + hours + minutes)
    const days = parseInt(formData.duration_days) || 0;
    const hours = parseInt(formData.duration_hours) || 0;
    const minutes = parseInt(formData.duration_minutes) || 0;
    const durationInMinutes = (days > 0 || hours > 0 || minutes > 0)
      ? convertDurationToMinutes(days, hours, minutes)
      : null;

    try {
      const response = await fetch("/api/process-type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          duration_value: durationInMinutes,
          origin_department_id: formData.origin_department_id || null,
          is_active: formData.is_active,
        }),
      });

      if (response.ok) {
        toast.success("Process type created successfully");
        setIsCreateModalOpen(false);
        setFormData({
          code: "",
          name: "",
          description: "",
          duration_days: "",
          duration_hours: "",
          duration_minutes: "",
          origin_department_id: "",
          is_active: true,
        });
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
    // Convert stored minutes back to days/hours/minutes breakdown
    const breakdown = processType.duration_value 
      ? convertMinutesToBreakdown(processType.duration_value)
      : { days: 0, hours: 0, minutes: 0 };
    setFormData({
      code: processType.code || "",
      name: processType.name || "",
      description: processType.description || "",
      duration_days: breakdown.days > 0 ? breakdown.days.toString() : "",
      duration_hours: breakdown.hours > 0 ? breakdown.hours.toString() : "",
      duration_minutes: breakdown.minutes > 0 ? breakdown.minutes.toString() : "",
      origin_department_id: processType.origin_department_id || "",
      is_active: processType.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleView = (processType: ProcessType) => {
    // Open inline modal (don't navigate away)
    setViewingProcessType(processType);
    setIsViewModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProcessType) return;

    // Convert duration to minutes (days + hours + minutes)
    const days = parseInt(formData.duration_days) || 0;
    const hours = parseInt(formData.duration_hours) || 0;
    const minutes = parseInt(formData.duration_minutes) || 0;
    const durationInMinutes = (days > 0 || hours > 0 || minutes > 0)
      ? convertDurationToMinutes(days, hours, minutes)
      : null;

    try {
      const response = await fetch(
        `/api/process-type/${editingProcessType.process_type_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            code: formData.code,
            name: formData.name,
            description: formData.description,
            duration_value: durationInMinutes,
            origin_department_id: formData.origin_department_id || null,
            is_active: formData.is_active,
          }),
        },
      );

      if (response.ok) {
        toast.success("Process type updated successfully");
        setIsEditModalOpen(false);
        setEditingProcessType(null);
        setFormData({
          code: "",
          name: "",
          description: "",
          duration_days: "",
          duration_hours: "",
          duration_minutes: "",
          origin_department_id: "",
          is_active: true,
        });
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
    <div className="flex flex-col h-full flex-1 overflow-hidden">
      {/* Main Content Area with Scroll */}
      <div className="flex-1 overflow-y-auto ">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Process Type Management
          </h1>
          <p className="text-muted-foreground">
            Manage process types and their durations
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-6">
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
                <SelectTrigger className="h-9 w-35">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="h-9"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Process Type
              </Button>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Origin Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedProcessTypes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No process types found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProcessTypes.map((processType) => (
                    <TableRow key={processType.process_type_id}>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-default">
                                <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                                <Badge variant="outline" className="font-mono text-xs">
                                  {processType.code || "N/A"}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs wrap-break-word">
                              <p>{processType.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {processType.duration_value ? (
                          <span className="text-sm">
                            {formatDurationFromMinutes(processType.duration_value)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Not set
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {processType.originDepartment ? (
                          <Badge variant="secondary" className="text-xs">
                            {processType.originDepartment.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No department
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              processType.is_active
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          />
                          <span
                            className={`text-xs ${
                              processType.is_active
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {processType.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(processType.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
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
                            onClick={() =>
                              handleDeleteClick(processType.process_type_id)
                            }
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
        </div>

        {/* Pagination */}
        {filteredProcessTypes.length > 0 && (
          <div className="mt-4">
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
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-3xl w-full max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Create Process Type
            </DialogTitle>
            <DialogDescription>
              Define a new process type to categorize and track document
              workflows with specific duration requirements.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <h4 className="text-sm font-semibold text-gray-700">
                    Basic Information
                  </h4>
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
                    A unique code identifier (uppercase letters, numbers, and
                    underscores)
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
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
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
                    Optional: Provide additional details about when to use this
                    process type
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="origin_department_id"
                    className="text-sm font-medium"
                  >
                    Origin Department
                  </Label>
                  <Select
                    disabled={departmentsLoading}
                    value={formData.origin_department_id || "none"}
                    onValueChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        origin_department_id: value === "none" ? "" : value,
                      }));
                      clearDepartmentFilters();
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue
                        placeholder={
                          departmentsLoading
                            ? "Loading departments..."
                            : "Select department (optional)"
                        }
                      />
                      {departmentsLoading && (
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      )}
                    </SelectTrigger>
                    <SelectContent className="w-[320px]">
                      <div className="space-y-3 px-3 pt-3 pb-2 border-b border-muted-foreground/20">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              placeholder="Search code or name"
                              value={departmentSearch}
                              onChange={(e) => setDepartmentSearch(e.target.value)}
                              className="text-sm pr-8"
                            />
                            {departmentSearch && (
                              <button
                                type="button"
                                onClick={() => setDepartmentSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                                aria-label="Clear search"
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearDepartmentFilters}
                            className="text-[11px] uppercase tracking-[0.15em]"
                          >
                            <Recycle />
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                            Group
                          </p>
                          <select
                            className="w-full rounded-md border border-input bg-background py-1 px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/70"
                            value={groupFilter}
                            onChange={(e) => {
                              setGroupFilter(e.target.value);
                              setCenterFilter("");
                            }}
                          >
                            <option value="">All groups</option>
                            {groupOptions.map((group) => (
                              <option key={group.code} value={group.code}>
                                {group.name} ({group.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                            Center
                          </p>
                          <select
                            className="w-full rounded-md border border-input bg-background py-1 px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/70"
                            value={centerFilter}
                            onChange={(e) => setCenterFilter(e.target.value)}
                          >
                            <option value="">All centers</option>
                            {centerOptions.map((center) => (
                              <option key={center.code} value={center.code}>
                                {center.name} ({center.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <SelectScrollUpButton className="text-muted-foreground" />
                      <div className="max-h-50 overflow-y-auto px-1 py-1">
                        <SelectItem value="none">No Department</SelectItem>
                        {filteredDepartments.length === 0 ? (
                          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                            No departments match your filters.
                          </div>
                        ) : (
                          filteredDepartments.map((dept) => (
                            <TooltipProvider key={dept.department_id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SelectItem
                                    value={dept.department_id}
                                    className="text-sm py-2"
                                  >
                                    <span className="font-medium">
                                      {dept.code || dept.name}
                                    </span>
                                  </SelectItem>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  align="center"
                                  sideOffset={6}
                                  className="max-w-64 leading-snug wrap-break-word whitespace-normal"
                                >
                                  {dept.name}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))
                        )}
                      </div>
                      <SelectScrollDownButton className="text-muted-foreground" />
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Assign this process type to a specific department. Other
                    departments can still use it.
                  </p>
                </div>
              </div>

              {/* Duration Configuration Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <h4 className="text-sm font-semibold text-gray-700">
                    Duration Settings
                  </h4>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Expected Duration
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="duration_days" className="text-xs text-muted-foreground">
                        Days
                      </Label>
                      <Input
                        id="duration_days"
                        name="duration_days"
                        type="number"
                        min="0"
                        value={formData.duration_days}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="duration_hours" className="text-xs text-muted-foreground">
                        Hours
                      </Label>
                      <Input
                        id="duration_hours"
                        name="duration_hours"
                        type="number"
                        min="0"
                        max="23"
                        value={formData.duration_hours}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="duration_minutes" className="text-xs text-muted-foreground">
                        Minutes
                      </Label>
                      <Input
                        id="duration_minutes"
                        name="duration_minutes"
                        type="number"
                        min="0"
                        max="59"
                        value={formData.duration_minutes}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set the typical time required to complete this process
                    (optional)
                  </p>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <h4 className="text-sm font-semibold text-gray-700">
                    Status
                  </h4>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border p-3 bg-gray-50/50">
                  <Checkbox
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: checked as boolean,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="is_active"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Active Process Type
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Active process types are available for selection when
                      creating documents
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-3xl w-full max-h-[88vh] overflow-y-auto">
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
                  <h4 className="text-sm font-semibold text-gray-700">
                    Basic Information
                  </h4>
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
                    A unique code identifier (uppercase letters, numbers, and
                    underscores)
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
                  <Label
                    htmlFor="edit-description"
                    className="text-sm font-medium"
                  >
                    Description
                  </Label>
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
                    Optional: Provide additional details about when to use this
                    process type
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-origin_department_id"
                    className="text-sm font-medium"
                  >
                    Origin Department
                  </Label>
                  <Select
                    disabled={departmentsLoading}
                    value={formData.origin_department_id || "none"}
                    onValueChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        origin_department_id: value === "none" ? "" : value,
                      }));
                      clearDepartmentFilters();
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue
                        placeholder={
                          departmentsLoading
                            ? "Loading departments..."
                            : "Select department (optional)"
                        }
                      />
                      {departmentsLoading && (
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      )}
                    </SelectTrigger>
                    <SelectContent className="w-[320px]">
                      <div className="space-y-3 px-3 pt-3 pb-2 border-b border-muted-foreground/20">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              placeholder="Search code or name"
                              value={departmentSearch}
                              onChange={(e) => setDepartmentSearch(e.target.value)}
                              className="text-sm pr-8"
                            />
                            {departmentSearch && (
                              <button
                                type="button"
                                onClick={() => setDepartmentSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                                aria-label="Clear search"
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearDepartmentFilters}
                            className="text-[11px] uppercase tracking-[0.15em]"
                          >
                            <Recycle />
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                            Group
                          </p>
                          <select
                            className="w-full rounded-md border border-input bg-background py-1 px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/70"
                            value={groupFilter}
                            onChange={(e) => {
                              setGroupFilter(e.target.value);
                              setCenterFilter("");
                            }}
                          >
                            <option value="">All groups</option>
                            {groupOptions.map((group) => (
                              <option key={group.code} value={group.code}>
                                {group.name} ({group.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                            Center
                          </p>
                          <select
                            className="w-full rounded-md border border-input bg-background py-1 px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/70"
                            value={centerFilter}
                            onChange={(e) => setCenterFilter(e.target.value)}
                          >
                            <option value="">All centers</option>
                            {centerOptions.map((center) => (
                              <option key={center.code} value={center.code}>
                                {center.name} ({center.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <SelectScrollUpButton className="text-muted-foreground" />
                      <div className="max-h-50 overflow-y-auto px-1 py-1">
                        <SelectItem value="none">No Department</SelectItem>
                        {filteredDepartments.length === 0 ? (
                          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                            No departments match your filters.
                          </div>
                        ) : (
                          filteredDepartments.map((dept) => (
                            <TooltipProvider key={dept.department_id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SelectItem
                                    value={dept.department_id}
                                    className="text-sm py-2"
                                  >
                                    <span className="font-medium">
                                      {dept.code || dept.name}
                                    </span>
                                  </SelectItem>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  align="center"
                                  sideOffset={6}
                                  className="max-w-64 leading-snug wrap-break-word whitespace-normal"
                                >
                                  {dept.name}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))
                        )}
                      </div>
                      <SelectScrollDownButton className="text-muted-foreground" />
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Assign this process type to a specific department. Other
                    departments can still use it.
                  </p>
                </div>
              </div>

              {/* Duration Configuration Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <h4 className="text-sm font-semibold text-gray-700">
                    Duration Settings
                  </h4>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Expected Duration
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="edit-duration_days" className="text-xs text-muted-foreground">
                        Days
                      </Label>
                      <Input
                        id="edit-duration_days"
                        name="duration_days"
                        type="number"
                        min="0"
                        value={formData.duration_days}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-duration_hours" className="text-xs text-muted-foreground">
                        Hours
                      </Label>
                      <Input
                        id="edit-duration_hours"
                        name="duration_hours"
                        type="number"
                        min="0"
                        max="23"
                        value={formData.duration_hours}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-duration_minutes" className="text-xs text-muted-foreground">
                        Minutes
                      </Label>
                      <Input
                        id="edit-duration_minutes"
                        name="duration_minutes"
                        type="number"
                        min="0"
                        max="59"
                        value={formData.duration_minutes}
                        onChange={handleInputChange}
                        placeholder="0"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set the typical time required to complete this process
                    (optional)
                  </p>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <h4 className="text-sm font-semibold text-gray-700">
                    Status
                  </h4>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border p-3 bg-gray-50/50">
                  <Checkbox
                    id="edit-is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: checked as boolean,
                      }))
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="edit-is_active"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Active Process Type
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Active process types are available for selection when
                      creating documents
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View handled by dedicated viewID route/modal */}
      {/* Inline View Modal (single-column) */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-3xl w-full max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Process Type Details</DialogTitle>
            <DialogDescription>
              View complete information about this process type
            </DialogDescription>
          </DialogHeader>

          {viewingProcessType && (
            <div className="space-y-6">
              <ViewProcessType id={viewingProcessType.process_type_id} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            <Button onClick={() => { if (viewingProcessType) { setIsViewModalOpen(false); handleEdit(viewingProcessType); } }}>
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
