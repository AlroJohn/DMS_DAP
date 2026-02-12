"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Save, Loader2, X, Recycle } from "lucide-react";
import { useSocket } from "@/components/providers/providers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Document {
  document_id: string;
  title: string;
  description?: string;
  document_code: string;
  document_type: string;
  process_type_id?: string | null;
  classification: string;
  origin: string;
  status: string;
  detail?: {
    document_name?: string;
    classification?: string;
    origin?: string;
    document_code?: string;
  };
}

interface DocumentType {
  type_id: string;
  name: string;
}

interface ProcessTypeOriginDepartment {
  code: string;
  name: string;
  group: {
    code: string;
    name: string;
  };
  center?: {
    code: string;
    name: string;
  };
}

interface ProcessType {
  process_type_id: string;
  code: string;
  name: string;
  duration_value?: number | null;
  duration_unit?: string | null;
  originDepartment?: ProcessTypeOriginDepartment;
}

type CenterLookup = {
  code: string;
  name: string;
  departments: Map<string, string>;
};

type GroupLookup = {
  code: string;
  name: string;
  centers: Map<string, CenterLookup>;
  departments: Map<string, string>;
};

const NO_CENTER_CODE = "__NO_CENTER__";
const NO_CENTER_LABEL = "No center assignment";

const mapToSortedArray = (entries: Map<string, string>) =>
  Array.from(entries.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

const UNIT_TO_MINUTES = {
  weeks: 7 * 24 * 60,
  days: 24 * 60,
  hours: 60,
  minutes: 1,
} as const;

const formatProcessDuration = (value?: number | null, unit?: string | null) => {
  if (!value) return "";
  const normalizedUnit = (
    unit || "minutes"
  ).toLowerCase() as keyof typeof UNIT_TO_MINUTES;
  const totalMinutes = value * (UNIT_TO_MINUTES[normalizedUnit] ?? 1);

  const parts = [];
  let remaining = totalMinutes;

  const weeks = Math.floor(remaining / UNIT_TO_MINUTES.weeks);
  if (weeks) {
    parts.push(`${weeks}w`);
    remaining -= weeks * UNIT_TO_MINUTES.weeks;
  }

  const days = Math.floor(remaining / UNIT_TO_MINUTES.days);
  if (days) {
    parts.push(`${days}d`);
    remaining -= days * UNIT_TO_MINUTES.days;
  }

  const hours = Math.floor(remaining / UNIT_TO_MINUTES.hours);
  if (hours) {
    parts.push(`${hours}h`);
    remaining -= hours * UNIT_TO_MINUTES.hours;
  }

  const minutes = remaining;
  if (minutes || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ");
};

interface EditDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  onSuccess: () => void;
}

export function EditDocumentModal({
  open,
  onOpenChange,
  documentId,
  onSuccess,
}: EditDocumentModalProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classification: "",
    origin: "",
    document_type: "",
    process_type_id: "",
  });

  // Filter states for process type selection
  const [groupFilter, setGroupFilter] = useState("");
  const [centerFilter, setCenterFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [processSearch, setProcessSearch] = useState("");

  const clearFilters = () => {
    setGroupFilter("");
    setCenterFilter("");
    setDepartmentFilter("");
    setProcessSearch("");
  };

  const { socket } = useSocket();

  // Create hierarchy from process types
  const hierarchy = useMemo(() => {
    const map = new Map<string, GroupLookup>();
    processTypes.forEach((type) => {
      const dept = type.originDepartment;
      if (!dept || !dept.group) return;

      const groupCode = dept.group.code;
      const groupName = dept.group.name;

      let groupEntry = map.get(groupCode);
      if (!groupEntry) {
        groupEntry = {
          code: groupCode,
          name: groupName,
          centers: new Map(),
          departments: new Map(),
        };
        map.set(groupCode, groupEntry);
      }

      if (dept.code && dept.name) {
        groupEntry.departments.set(dept.code, dept.name);
      }

      const centerCode = dept.center?.code ?? NO_CENTER_CODE;
      const centerName = dept.center?.name ?? NO_CENTER_LABEL;
      let centerEntry = groupEntry.centers.get(centerCode);
      if (!centerEntry) {
        centerEntry = {
          code: centerCode,
          name: centerName,
          departments: new Map(),
        };
        groupEntry.centers.set(centerCode, centerEntry);
      }

      if (dept.code && dept.name) {
        centerEntry.departments.set(dept.code, dept.name);
      }
    });

    return new Map(
      [...map.entries()].sort(([, a], [, b]) => a.name.localeCompare(b.name)),
    );
  }, [processTypes]);

  const groupOptions = useMemo(
    () =>
      Array.from(hierarchy.values()).map((group) => ({
        code: group.code,
        name: group.name,
      })),
    [hierarchy],
  );

  const buildCenterArray = (centers: Map<string, CenterLookup>) =>
    Array.from(centers.values())
      .map((center) => ({
        code: center.code,
        name: center.name,
        departments: center.departments,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

  const availableCenters = useMemo(() => {
    let centersToUse = new Map<string, CenterLookup>();

    if (groupFilter) {
      const group = hierarchy.get(groupFilter);
      if (!group) return [];
      centersToUse = group.centers;
    } else {
      const aggregated = new Map<string, CenterLookup>();
      hierarchy.forEach((group) => {
        group.centers.forEach((center, centerCode) => {
          if (!aggregated.has(centerCode)) {
            aggregated.set(centerCode, {
              code: center.code,
              name: center.name,
              departments: center.departments,
            });
          }
        });
      });
      centersToUse = aggregated;
    }

    // Convert to array and filter out the NO_CENTER option since we're adding it separately in the UI
    const centersArray = buildCenterArray(centersToUse);
    const filteredCenters = centersArray.filter(
      (center) => center.code !== NO_CENTER_CODE,
    );

    // Check if the current context (either specific group or all groups) has departments with no center
    const hasNoCenterInContext = centersArray.some(
      (center) => center.code === NO_CENTER_CODE,
    );

    if (hasNoCenterInContext) {
      // Add the no center option back if it exists in the current context
      filteredCenters.unshift({
        code: NO_CENTER_CODE,
        name: NO_CENTER_LABEL,
        departments: new Map(), // Will be populated in availableDepartments when selected
      });
    }

    return filteredCenters;
  }, [hierarchy, groupFilter, NO_CENTER_CODE]);

  const availableDepartments = useMemo(() => {
    if (centerFilter) {
      if (centerFilter === NO_CENTER_CODE) {
        // Find departments that belong to the NO_CENTER in the current context
        if (groupFilter) {
          // If a group is selected, only get departments with no center from that group
          const selectedGroup = hierarchy.get(groupFilter);
          if (selectedGroup) {
            const noCenterInGroup = selectedGroup.centers.get(NO_CENTER_CODE);
            if (noCenterInGroup) {
              return mapToSortedArray(noCenterInGroup.departments);
            }
          }
        } else {
          // If no group is selected, get all departments with no center
          const allDepartments = new Map<string, string>();
          hierarchy.forEach((group) => {
            group.centers.forEach((center) => {
              if (center.code === NO_CENTER_CODE) {
                center.departments.forEach((name, code) => {
                  if (!allDepartments.has(code)) {
                    allDepartments.set(code, name);
                  }
                });
              }
            });
          });
          return mapToSortedArray(allDepartments);
        }
        return []; // Return empty if no departments with no center exist in the current context
      } else {
        const selectedCenter = availableCenters.find(
          (center) => center.code === centerFilter,
        );
        if (!selectedCenter) return [];
        return mapToSortedArray(selectedCenter.departments);
      }
    }
    if (groupFilter) {
      const selectedGroup = hierarchy.get(groupFilter);
      if (!selectedGroup) return [];
      return mapToSortedArray(selectedGroup.departments);
    }
    const allDepartments = new Map<string, string>();
    hierarchy.forEach((group) => {
      group.departments.forEach((name, code) => {
        if (!allDepartments.has(code)) {
          allDepartments.set(code, name);
        }
      });
    });
    return mapToSortedArray(allDepartments);
  }, [hierarchy, groupFilter, centerFilter, availableCenters, NO_CENTER_CODE]);

  const searchTerm = processSearch.trim().toLowerCase();

  const filteredProcessTypes = useMemo(() => {
    return processTypes.filter((type) => {
      const origin = type.originDepartment;
      if (groupFilter && origin?.group?.code !== groupFilter) {
        return false;
      }
      if (centerFilter) {
        if (centerFilter === NO_CENTER_CODE) {
          // Only show departments with no center assignment
          if (origin?.center?.code) {
            return false;
          }
        } else {
          // Show departments with the selected center
          const centerCode = origin?.center?.code ?? NO_CENTER_CODE;
          if (centerCode !== centerFilter) {
            return false;
          }
        }
      }
      if (departmentFilter && origin?.code !== departmentFilter) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      const haystack = `${type.code ?? ""} ${type.name} ${origin?.name ?? ""} ${
        origin?.code ?? ""
      }`.toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [
    processTypes,
    groupFilter,
    centerFilter,
    departmentFilter,
    searchTerm,
    NO_CENTER_CODE,
  ]);

  const isFilterActive = Boolean(
    groupFilter || centerFilter || departmentFilter || searchTerm,
  );

  const visibleProcessTypes = useMemo(() => {
    if (isFilterActive) {
      return filteredProcessTypes;
    }
    const seen = new Set<string>();
    return filteredProcessTypes.filter((type) => {
      // For simplicity in edit modal, we don't deduplicate like in upload modal
      return true;
    });
  }, [filteredProcessTypes, isFilterActive]);

  useEffect(() => {
    if (open && documentId) {
      fetchDocument();
      fetchDocumentTypes();
      fetchProcessTypes();
    }
  }, [open, documentId]);

  useEffect(() => {
    setCenterFilter("");
    setDepartmentFilter("");
  }, [groupFilter]);

  useEffect(() => {
    setDepartmentFilter("");
  }, [centerFilter]);

  const fetchDocumentTypes = async () => {
    try {
      const response = await fetch(`/api/documents/types`, {
        credentials: "include",
      });
      if (response.ok) {
        const result = await response.json();
        // Handle both {success, data} and direct array response
        const data = result.success
          ? result.data
          : Array.isArray(result)
            ? result
            : [];
        setDocumentTypes(data || []);
      }
    } catch (error) {
      console.error("Error fetching document types:", error);
    }
  };

  const fetchProcessTypes = async () => {
    try {
      const response = await fetch(
        `/api/process-type?includeOriginDepartment=true`,
        {
          credentials: "include",
        },
      );
      if (response.ok) {
        const result = await response.json();
        // Handle both {success, data} and direct array response
        const data = result.success
          ? result.data
          : Array.isArray(result)
            ? result
            : [];
        setProcessTypes(data || []);
      }
    } catch (error) {
      console.error("Error fetching process types:", error);
    }
  };

  const fetchDocument = async () => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const doc = result.data;
          setDocument(doc);
          setFormData({
            title: doc.title || doc.detail?.document_name || "",
            description: doc.description || "",
            classification:
              doc.classification || doc.detail?.classification || "",
            origin: doc.origin || doc.detail?.origin || "",
            document_type: doc.document_type || "",
            process_type_id: doc.process_type_id || "",
          });
        }
      } else {
        toast.error("Failed to load document");
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Error loading document");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!documentId) return;

    try {
      setIsSaving(true);

      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.title,
          content: formData.description,
          classification: formData.classification,
          origin: formData.origin,
          document_type: formData.document_type || undefined,
          process_type_id: formData.process_type_id || null,
        }),
      });

      if (response.ok) {
        toast.success("Document updated successfully");
        onSuccess();
        onOpenChange(false);
        if (socket && documentId) {
          socket.emit("documentUpdated", { documentId });
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error?.message || "Failed to update document");
      }
    } catch (error) {
      toast.error("Error updating document");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Make changes to your document here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grow overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Document Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="code">Document Code</Label>
                      <Input
                        id="code"
                        value={
                          document?.document_code ||
                          document?.detail?.document_code ||
                          ""
                        }
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Input
                        id="status"
                        value={document?.status || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pb-4">
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Enter document title"
                    />
                  </div>

                  <div className="space-y-2 pb-4">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter document description"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="classification">Classification</Label>
                      <Select
                        value={formData.classification}
                        onValueChange={(value) =>
                          setFormData({ ...formData, classification: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="complex">Complex</SelectItem>
                          <SelectItem value="highly_technical">
                            Highly Technical
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="origin">Origin</Label>
                      <Select
                        value={formData.origin}
                        onValueChange={(value) =>
                          setFormData({ ...formData, origin: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="document_type">Document Type</Label>
                      <Select
                        value={formData.document_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, document_type: value })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem key={type.type_id} value={type.name}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="process_type">Process Type</Label>
                      <Select
                        value={formData.process_type_id}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            process_type_id: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select process type" />
                        </SelectTrigger>
                        <SelectContent className="w-full max-w-[400px] h-auto max-h-[450px]">
                          <div className="space-y-3 px-3 pt-3 pb-2 border-b border-muted-foreground/20 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <Input
                                  placeholder="Search code or name"
                                  value={processSearch}
                                  onChange={(event) =>
                                    setProcessSearch(event.target.value)
                                  }
                                  className="text-sm truncate max-w-full"
                                />
                                {processSearch && (
                                  <button
                                    type="button"
                                    onClick={() => setProcessSearch("")}
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
                                onClick={clearFilters}
                                className="text-[11px] uppercase tracking-[0.15em] flex-shrink-0"
                              >
                                <Recycle />
                              </Button>
                            </div>

                            {/* Group Filter */}
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                                Group
                              </p>
                              <select
                                className="w-full rounded-md border border-input bg-background py-1 px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/70 max-w-full truncate"
                                value={groupFilter}
                                onChange={(event) =>
                                  setGroupFilter(event.target.value)
                                }
                              >
                                <option value="">All groups</option>
                                {groupOptions.map((group) => (
                                  <option
                                    key={group.code}
                                    value={group.code}
                                    title={`${group.name} (${group.code})`}
                                  >
                                    {group.name} ({group.code})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Center Filter */}
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                                Center
                              </p>
                              <select
                                className="w-full rounded-md border border-input bg-background py-1 px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/70 max-w-full truncate"
                                value={centerFilter}
                                onChange={(event) =>
                                  setCenterFilter(event.target.value)
                                }
                              >
                                <option value="">All centers</option>
                                {availableCenters.some(
                                  (center) => center.code === NO_CENTER_CODE,
                                ) && (
                                  <option
                                    value={NO_CENTER_CODE}
                                    title="No center assignment"
                                  >
                                    No center assignment
                                  </option>
                                )}
                                {availableCenters.map(
                                  (center) =>
                                    center.code !== NO_CENTER_CODE && (
                                      <option
                                        key={center.code}
                                        value={center.code}
                                        title={`${center.name} (${center.code})`}
                                      >
                                        {center.name} ({center.code})
                                      </option>
                                    ),
                                )}
                              </select>
                            </div>

                            {/* Department Filter */}
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                                Department
                              </p>
                              <select
                                className="w-full rounded-md border border-input bg-background py-1 px-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/70 max-w-full truncate"
                                value={departmentFilter}
                                onChange={(event) =>
                                  setDepartmentFilter(event.target.value)
                                }
                              >
                                <option value="">All departments</option>
                                {availableDepartments.map((dept) => (
                                  <option
                                    key={dept.code}
                                    value={dept.code}
                                    title={`${dept.name} (${dept.code})`}
                                  >
                                    {dept.name} ({dept.code})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <SelectScrollUpButton className="text-muted-foreground" />
                          <div className="max-h-[280px] space-y-1 px-1 py-1 overflow-y-auto overflow-x-hidden">
                            {visibleProcessTypes.length === 0 ? (
                              <div className="px-3 py-4 text-xs text-muted-foreground">
                                No process types match your filters.
                              </div>
                            ) : (
                              visibleProcessTypes.map((type) => (
                                <SelectItem
                                  key={type.process_type_id}
                                  value={type.process_type_id}
                                  className="text-base py-2 px-3 max-w-full"
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="truncate max-w-full">
                                        {type.code}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      align="center"
                                      sideOffset={6}
                                      className="max-w-64 leading-snug break-words whitespace-normal"
                                    >
                                      <span className="font-medium">
                                        {type.name}
                                      </span>
                                      {type.duration_value && (
                                        <span className="ml-1 text-secondary">
                                          ·{" "}
                                          {formatProcessDuration(
                                            type.duration_value,
                                            type.duration_unit,
                                          )}
                                        </span>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </SelectItem>
                              ))
                            )}
                          </div>
                          <SelectScrollDownButton className="text-muted-foreground" />
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
