"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentListItem as Document } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "../ui/scroll-area";
import { getAccessToken } from "@/lib/token-utils";
import { cn } from "@/lib/utils";

interface Department {
  department_id: string;
  group_id: string;
  center_id?: string | null;
  name: string;
  code: string;
  active: boolean;
}

interface Center {
  center_id: string;
  group_id: string;
  name: string;
  code: string;
  active: boolean;
  departments: Department[];
}

interface Group {
  group_id: string;
  name: string;
  code: string;
  active: boolean;
  centers: Center[];
  departments: Department[];
}

interface DocumentAction {
  document_action_id: string;
  action_name: string;
  description?: string;
  sender_tag?: string;
  recipient_tag?: string;
  status: boolean;
  action_date: string; // ISO string format
  created_at: string; // ISO string format
  updated_at: string; // ISO string format
  permission_id?: string;
}

interface User {
  user_id?: string | null;
  account_id: string;
  email: string;
  name: string;
  department_id: string;
  roles?: Array<{
    role_id: string;
    name: string;
    code: string;
  }>;
}

const releaseDocumentSchema = z.object({
  departmentIds: z
    .array(z.string())
    .min(1, "Please select at least one department."),
  requestActions: z
    .array(z.string())
    .min(1, "Please select at least one action."),
  userIds: z.array(z.string()).optional(),
  remarks: z.string().optional(),
});

type ReleaseDocumentForm = z.infer<typeof releaseDocumentSchema>;

interface ReleaseDocumentModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReleaseDocumentModal({
  document,
  isOpen,
  onClose,
  onSuccess,
}: ReleaseDocumentModalProps) {
  const { user: currentUser } = useAuth();
  const currentDepartmentId = currentUser?.department_id;
  const [groups, setGroups] = useState<Group[]>([]);
  const [documentActions, setDocumentActions] = useState<DocumentAction[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");
  const [draggingActionName, setDraggingActionName] = useState<string | null>(
    null,
  );
  const [departmentActionMap, setDepartmentActionMap] = useState<
    Record<string, string[]>
  >({});
  const [departmentUsers, setDepartmentUsers] = useState<
    Record<string, User[]>
  >({});
  const [loadingUsers, setLoadingUsers] = useState<Record<string, boolean>>({});
  const [userSearchQuery, setUserSearchQuery] = useState<
    Record<string, string>
  >({});
  const [expandedDepartments, setExpandedDepartments] = useState<
    Record<string, boolean>
  >({});
  const [departmentUserMap, setDepartmentUserMap] = useState<
    Record<string, string[]>
  >({});

  const form = useForm<ReleaseDocumentForm>({
    resolver: zodResolver(releaseDocumentSchema),
    defaultValues: {
      departmentIds: [],
      requestActions: [],
      userIds: [],
      remarks: "",
    },
  });

  const selectedDepartmentIds = form.watch("departmentIds");
  const activeGroup = useMemo(() => {
    if (selectedGroupId === "all") return null;
    return groups.find((group) => group.group_id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const availableCenters = useMemo(() => {
    return activeGroup?.centers || [];
  }, [activeGroup]);

  useEffect(() => {
    setSelectedCenterId("all");
  }, [selectedGroupId]);

  const availableDepartments = useMemo(() => {
    const departmentMap = new Map<string, Department>();
    const addDepartment = (dept: Department) => {
      departmentMap.set(dept.department_id, dept);
    };

    if (selectedGroupId === "all") {
      groups.forEach((group) => {
        group.departments.forEach(addDepartment);
        group.centers.forEach((center) => {
          center.departments.forEach(addDepartment);
        });
      });
    } else if (activeGroup) {
      if (selectedCenterId === "all") {
        activeGroup.departments.forEach(addDepartment);
        activeGroup.centers.forEach((center) => {
          center.departments.forEach(addDepartment);
        });
      } else if (selectedCenterId === "no-center") {
        activeGroup.departments.forEach(addDepartment);
      } else {
        const center = activeGroup.centers.find(
          (item) => item.center_id === selectedCenterId,
        );
        center?.departments.forEach(addDepartment);
      }
    }

    return Array.from(departmentMap.values());
  }, [groups, selectedGroupId, selectedCenterId, activeGroup]);

  const handleDepartmentToggle = (departmentId: string, checked: boolean) => {
    if (departmentId === currentDepartmentId) return;
    const current = new Set(form.getValues("departmentIds"));
    if (checked) {
      current.add(departmentId);
      fetchUsersForDepartment(departmentId);
    } else {
      current.delete(departmentId);
    }
    const nextIds = Array.from(current);
    form.setValue("departmentIds", nextIds, { shouldValidate: true });
    setDepartmentActionMap((prev) => {
      if (checked) {
        if (prev[departmentId]) return prev;
        return { ...prev, [departmentId]: [] };
      }
      const next = { ...prev };
      delete next[departmentId];
      return next;
    });
    setDepartmentUserMap((prev) => {
      if (checked) {
        if (prev[departmentId]) return prev;
        return { ...prev, [departmentId]: [] };
      }
      const next = { ...prev };
      delete next[departmentId];
      return next;
    });
  };

  const handleAssignAction = (departmentId: string, actionName: string) => {
    setDepartmentActionMap((prev) => {
      const current = prev[departmentId] || [];
      if (current.includes(actionName)) {
        return prev;
      }
      return {
        ...prev,
        [departmentId]: [...current, actionName],
      };
    });
  };

  const handleRemoveAssignedAction = (
    departmentId: string,
    actionName: string,
  ) => {
    setDepartmentActionMap((prev) => {
      const current = prev[departmentId] || [];
      const nextActions = current.filter((action) => action !== actionName);
      return { ...prev, [departmentId]: nextActions };
    });
  };

  const handleUserToggle = (
    departmentId: string,
    userId: string,
    checked: boolean,
  ) => {
    setDepartmentUserMap((prev) => {
      const current = new Set(prev[departmentId] || []);
      if (checked) {
        current.add(userId);
      } else {
        current.delete(userId);
      }
      return { ...prev, [departmentId]: Array.from(current) };
    });
  };

  const handleToggleDepartmentExpansion = (departmentId: string) => {
    setExpandedDepartments((prev) => ({
      ...prev,
      [departmentId]: !prev[departmentId],
    }));
  };

  const fetchUsersForDepartment = async (departmentId: string) => {
    if (departmentUsers[departmentId]) return;

    try {
      setLoadingUsers((prev) => ({ ...prev, [departmentId]: true }));
      const token = getAccessToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/admin/departments/${departmentId}/users`, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
            setDepartmentUsers((prev) => ({
              ...prev,
              [departmentId]: data.users || [],
            }));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users for department");
    } finally {
      setLoadingUsers((prev) => ({ ...prev, [departmentId]: false }));
    }
  };

  // Fetch departments and document actions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchDocumentActions();
    }
    if (!isOpen) {
      form.reset();
      setDraggingActionName(null);
      setSelectedGroupId("all");
      setSelectedCenterId("all");
      setDepartmentActionMap({});
      setDepartmentUsers({});
      setLoadingUsers({});
      setUserSearchQuery({});
      setExpandedDepartments({});
      setDepartmentUserMap({});
    }
  }, [isOpen]);

  useEffect(() => {
    setDepartmentActionMap((prev) => {
      const selectedSet = new Set(selectedDepartmentIds);
      const next: Record<string, string[]> = {};
      Object.entries(prev).forEach(([deptId, actions]) => {
        if (selectedSet.has(deptId)) {
          next[deptId] = actions;
        }
      });
      return next;
    });
    setDepartmentUserMap((prev) => {
      const selectedSet = new Set(selectedDepartmentIds);
      const next: Record<string, string[]> = {};
      Object.entries(prev).forEach(([deptId, users]) => {
        if (selectedSet.has(deptId)) {
          next[deptId] = users;
        }
      });
      return next;
    });
  }, [selectedDepartmentIds]);

  useEffect(() => {
    const nextActions = Array.from(
      new Set(Object.values(departmentActionMap).flat()),
    );
    form.setValue("requestActions", nextActions, { shouldValidate: true });
  }, [departmentActionMap, form]);

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);

      // Get token from localStorage or cookies
      const token = getAccessToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add Authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/admin/departments?hierarchy=true", {
        credentials: "include",
        headers,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const groupData: Group[] = result.data?.groups || [];
          setGroups(groupData);
        }
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchDocumentActions = async () => {
    try {
      setLoadingActions(true);

      // Get token from localStorage or cookies
      const token = getAccessToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add Authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        "/api/admin/document-actions?activeOnly=true",
        {
          credentials: "include",
          headers,
        },
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDocumentActions(result.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching document actions:", error);
    } finally {
      setLoadingActions(false);
    }
  };

  const { mutate: releaseDocument, isPending } = useMutation({
    mutationFn: async (data: ReleaseDocumentForm) => {
      console.log("🚀 Releasing document:", document!.id, "with data:", data);

      // Prepare the payload to send the array of action names
      const payload = {
        departmentIds: data.departmentIds,
        release_action: data.requestActions,
        requestActions: data.requestActions,
        departmentActions: departmentActionMap,
        departmentUserMap,
        userIds:
          data.userIds && data.userIds.length > 0 ? data.userIds : undefined,
        // Map the action names to action IDs if needed
        // For now, keeping the action names as selected by the user
        remarks: data.remarks,
      };

      // Get token from localStorage or cookies
      const token = getAccessToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add Authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/documents/${document!.id}/release`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });

      console.log("📝 Release response status:", response.status);

      if (!response.ok) {
        const fallbackMessage = "Failed to release document.";
        const errorText = await response.text();
        if (errorText) {
          try {
            const errorData = JSON.parse(errorText);
            console.error("❌ Release error:", errorData);
            throw new Error(
              errorData.error?.message ||
                errorData.error ||
                errorData.message ||
                fallbackMessage,
            );
          } catch {
            throw new Error(errorText);
          }
        }
        throw new Error(fallbackMessage);
      }

      const responseText = await response.text();
      console.log("✅ Release success (text):", responseText);

      if (!responseText) {
        return null;
      }

      try {
        const parsedResult = JSON.parse(responseText);
        console.log("✅ Release success (parsed):", parsedResult);
        return parsedResult;
      } catch (parseError) {
        console.warn(
          "Release response was not valid JSON, falling back to text output.",
          {
            parseError,
            responseText,
          },
        );
        return null;
      }
    },
    onSuccess: () => {
      toast.success("Document released successfully!");
      form.reset();
      onClose();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to release document.");
    },
  });

  const onSubmit = (data: ReleaseDocumentForm) => {
    // Validate that all selected actions are in the available document actions
    const allValidActions = data.requestActions.every((actionName) =>
      documentActions.some((action) => action.action_name === actionName),
    );

    if (!allValidActions && documentActions.length > 0) {
      toast.error("Please select valid actions only.");
      return;
    }

    const hasEmptyAssignments = data.departmentIds.some(
      (departmentId) =>
        !departmentActionMap[departmentId] ||
        departmentActionMap[departmentId].length === 0,
    );

    if (hasEmptyAssignments) {
      toast.error("Assign at least one action for each selected department.");
      return;
    }

    releaseDocument({
      ...data,
    });
  };

  const selectedCount = selectedDepartmentIds.length;
  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((group) => {
      group.departments.forEach((dept) => {
        map.set(dept.department_id, dept.name);
      });
      group.centers.forEach((center) => {
        center.departments.forEach((dept) => {
          map.set(dept.department_id, dept.name);
        });
      });
    });
    return map;
  }, [groups]);

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Release Document</DialogTitle>
          <DialogDescription>
            Release the document to another department for action.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="release-document-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Document Info Section - Fixed at top */}
            <div className="px-6 py-4 border-b bg-muted/20 shrink-0">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="doc-code" className="text-xs font-medium text-muted-foreground">
                    Code
                  </Label>
                  <Input
                    id="doc-code"
                    value={document.documentId}
                    readOnly
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-name" className="text-xs font-medium text-muted-foreground">
                    Name
                  </Label>
                  <Input
                    id="doc-name"
                    value={document.document}
                    readOnly
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-classification" className="text-xs font-medium text-muted-foreground">
                    Classification
                  </Label>
                  <Input
                    id="doc-classification"
                    value={document.classification}
                    readOnly
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-owner" className="text-xs font-medium text-muted-foreground">
                    Owner
                  </Label>
                  <Input
                    id="doc-owner"
                    value={document.contactPerson}
                    readOnly
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* 3 Column Layout - Scrollable */}
            <div className="flex-1 grid grid-cols-3 gap-4 px-6 py-4 min-h-0">
              
              {/* Column 1: Department Selection */}
              <div className="flex flex-col border rounded-lg min-h-0">
                <div className="p-4 border-b bg-muted/20 shrink-0">
                  <h3 className="font-semibold text-sm">Select Departments</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCount > 0
                      ? `${selectedCount} department${selectedCount === 1 ? "" : "s"} selected`
                      : "Choose departments to release"}
                  </p>
                </div>
                
                <div className="flex-1 overflow-auto">
                  <div className="p-4 space-y-4">
                    {/* Remarks */}
                    <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Remarks</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any remarks here..."
                              className="resize-none text-sm"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Department Filters */}
                    <FormField
                      control={form.control}
                      name="departmentIds"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">Filter & Select</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              {/* Group Filter */}
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Group</Label>
                                <Select
                                  value={selectedGroupId}
                                  onValueChange={setSelectedGroupId}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select group" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Groups</SelectItem>
                                    {groups.map((group) => (
                                      <SelectItem
                                        key={group.group_id}
                                        value={group.group_id}
                                      >
                                        {group.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Center Filter */}
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Center</Label>
                                <Select
                                  value={selectedCenterId}
                                  onValueChange={setSelectedCenterId}
                                  disabled={selectedGroupId === "all" || availableCenters.length === 0}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select center" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Centers</SelectItem>
                                    {activeGroup?.departments?.length ? (
                                      <SelectItem value="no-center">No Center</SelectItem>
                                    ) : null}
                                    {availableCenters.map((center) => (
                                      <SelectItem
                                        key={center.center_id}
                                        value={center.center_id}
                                      >
                                        {center.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Department List */}
                              <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-muted-foreground">Departments</Label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => {
                                      const eligibleDepts = availableDepartments.filter(
                                        (dept) => dept.department_id !== currentDepartmentId
                                      );
                                      const allSelected = eligibleDepts.every((dept) =>
                                        selectedDepartmentIds.includes(dept.department_id)
                                      );
                                      if (allSelected) {
                                        form.setValue("departmentIds", [], { shouldValidate: true });
                                        setDepartmentActionMap({});
                                      } else {
                                        const allIds = eligibleDepts.map((dept) => dept.department_id);
                                        form.setValue("departmentIds", allIds, { shouldValidate: true });
                                        const newMap: Record<string, string[]> = {};
                                        allIds.forEach((id) => {
                                          newMap[id] = departmentActionMap[id] || [];
                                        });
                                        setDepartmentActionMap(newMap);
                                        allIds.forEach((id) => fetchUsersForDepartment(id));
                                      }
                                    }}
                                    disabled={loadingDepartments || availableDepartments.length === 0}
                                  >
                                    {availableDepartments
                                      .filter((dept) => dept.department_id !== currentDepartmentId)
                                      .every((dept) => selectedDepartmentIds.includes(dept.department_id))
                                      ? "Uncheck All"
                                      : "Check All"}
                                  </Button>
                                </div>
                                
                                <div className="rounded-md border bg-background">
                                  <div className="max-h-75 overflow-y-auto p-3 space-y-2">
                                    {loadingDepartments ? (
                                      <div className="text-sm text-muted-foreground py-4 text-center">
                                        Loading...
                                      </div>
                                    ) : availableDepartments.length > 0 ? (
                                      availableDepartments.map((dept) => (
                                        <label
                                          key={dept.department_id}
                                          className={cn(
                                            "flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors",
                                            dept.department_id === currentDepartmentId && "opacity-50 cursor-not-allowed"
                                          )}
                                        >
                                          <Checkbox
                                            checked={selectedDepartmentIds.includes(dept.department_id)}
                                            disabled={dept.department_id === currentDepartmentId}
                                            onCheckedChange={(checked) =>
                                              handleDepartmentToggle(dept.department_id, checked === true)
                                            }
                                          />
                                          <span className="flex-1">{dept.name}</span>
                                        </label>
                                      ))
                                    ) : (
                                      <div className="text-sm text-muted-foreground py-4 text-center">
                                        No departments available
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Assigned Departments with Actions & Users */}
              <div className="flex flex-col border rounded-lg min-h-0">
                <div className="p-4 border-b bg-muted/20 shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Assigned Actions</h3>
                    <Badge variant="outline">{selectedCount}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag actions from the right panel
                  </p>
                </div>
                
                <div className="flex-1 overflow-auto">
                  <div className="p-4">{selectedCount === 0 ? (
                                <div className="text-sm text-muted-foreground py-8 text-center">
                                  Select departments to assign actions
                                </div>
                              ) : (
                                <div className="space-y-3">{selectedDepartmentIds.map((deptId) => {
                                    const assignedActions = departmentActionMap[deptId] || [];
                                    return (
                                      <div
                                        key={deptId}
                                        onDragOver={(event) => {
                                          if (draggingActionName) {
                                            event.preventDefault();
                                          }
                                        }}
                                        onDrop={(event) => {
                                          event.preventDefault();
                                          const actionName = draggingActionName || event.dataTransfer.getData("text/plain");
                                          if (actionName) {
                                            handleAssignAction(deptId, actionName);
                                            setDraggingActionName(null);
                                          }
                                        }}
                                        className="rounded-lg border bg-card p-3 space-y-2.5 transition-colors hover:border-primary/50"
                                      >
                                        {/* Department Header */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm truncate">
                                              {departmentNameById.get(deptId) || "Unknown"}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                              {assignedActions.length > 0
                                                ? `${assignedActions.length} action${assignedActions.length === 1 ? "" : "s"}`
                                                : "Drop actions here"}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Assigned Actions */}
                                        {assignedActions.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5">
                                            {assignedActions.map((action) => (
                                              <Badge
                                                key={`${deptId}-${action}`}
                                                variant="secondary"
                                                className="flex items-center gap-1 pl-2 pr-1"
                                              >
                                                <span className="text-xs">{action}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveAssignedAction(deptId, action)}
                                                  className="rounded-full hover:bg-background/80 p-0.5 transition-colors"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </Badge>
                                            ))}
                                          </div>
                                        )}

                                        {/* User Assignment Section */}
                                        <div className="border-t pt-2.5">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleDepartmentExpansion(deptId)}
                                            className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            <span>Assign to specific users (optional)</span>
                                            {expandedDepartments[deptId] ? (
                                              <ChevronUp className="h-3 w-3" />
                                            ) : (
                                              <ChevronDown className="h-3 w-3" />
                                            )}
                                          </button>

                                          {expandedDepartments[deptId] && (
                                            <div className="mt-2.5 space-y-2">
                                              <p className="text-[11px] text-muted-foreground">
                                                If no users are selected, this document will be released to all users in
                                                the department.
                                              </p>
                                              {/* User Search */}
                                              <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input
                                                  type="text"
                                                  placeholder="Search by name or role..."
                                                  className="pl-8 h-8 text-xs"
                                                  value={userSearchQuery[deptId] || ""}
                                                  onChange={(e) =>
                                                    setUserSearchQuery((prev) => ({
                                                      ...prev,
                                                      [deptId]: e.target.value,
                                                    }))
                                                  }
                                                />
                                              </div>

                                              {/* User List */}
                                              <div className="max-h-40 overflow-y-auto rounded-md border bg-background">
                                                <div className="p-2 space-y-1">
                                                  {loadingUsers[deptId] ? (
                                                    <div className="text-xs text-muted-foreground py-3 text-center">
                                                      Loading users...
                                                    </div>
                                                  ) : (
                                                    (() => {
                                                      const users = departmentUsers[deptId] || [];
                                                      const searchQuery = (userSearchQuery[deptId] || "").toLowerCase();
                                                      const filteredUsers = users.filter((user) => {
                                                        if (!searchQuery) return true;
                                                        const nameMatch = user.name.toLowerCase().includes(searchQuery);
                                                        const roleMatch = user.roles?.some((role) =>
                                                          role.name.toLowerCase().includes(searchQuery)
                                                        );
                                                        return nameMatch || roleMatch;
                                                      });
                                                      const displayUsers = searchQuery
                                                        ? filteredUsers
                                                        : filteredUsers.slice(0, 3);

                                                      return displayUsers.length > 0 ? (
                                                        <>
                                            {displayUsers.map((user) => {
                                              const targetUserId =
                                                user.user_id || user.account_id;
                                              return (
                                              <label
                                                              key={targetUserId}
                                                              className="flex items-start gap-2 text-xs p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                                                            >
                                                              <Checkbox
                                                                checked={
                                                                  departmentUserMap[deptId]?.includes(targetUserId) ||
                                                                  false
                                                                }
                                                                onCheckedChange={(checked) =>
                                                                  handleUserToggle(
                                                                    deptId,
                                                                    targetUserId,
                                                                    checked === true,
                                                                  )
                                                                }
                                                                className="mt-0.5"
                                                              />
                                                              <div className="flex-1 min-w-0">
                                                                <div className="font-medium truncate">{user.name}</div>
                                                                <div className="text-[10px] text-muted-foreground truncate">
                                                                  {user.email}
                                                                </div>
                                                                {user.roles && user.roles.length > 0 && (
                                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                                    {user.roles.map((role) => (
                                                                      <Badge
                                                                        key={role.role_id}
                                                                        variant="outline"
                                                                        className="text-[9px] h-4 px-1.5"
                                                                      >
                                                                        {role.name}
                                                                      </Badge>
                                                                    ))}
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </label>
                                                          );
                                            })}
                                                          {!searchQuery && filteredUsers.length > 3 && (
                                                            <div className="text-[10px] text-muted-foreground text-center py-1.5 border-t">
                                                              {filteredUsers.length - 3} more users. Use search to find them.
                                                            </div>
                                                          )}
                                                        </>
                                                      ) : (
                                                        <div className="text-xs text-muted-foreground py-3 text-center">
                                                          {searchQuery ? "No users found" : "No users available"}
                                                        </div>
                                                      );
                                                    })()
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}</div>
                              )}
                  </div>
                </div>
              </div>

              {/* Column 3: Available Actions */}
              <FormField
                control={form.control}
                name="requestActions"
                render={() => (
                  <FormItem className="flex flex-col min-h-0">
                    <FormControl>
                      <div className="flex flex-col border rounded-lg min-h-0">
                        <div className="p-4 border-b bg-muted/20 shrink-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Available Actions</h3>
                            <Badge variant="outline">{documentActions.length}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Drag to assign departments
                          </p>
                        </div>
                        
                        <div className="flex-1 overflow-auto">
                          <div className="p-4">
                            {loadingActions ? (
                              <div className="py-8 text-sm text-muted-foreground text-center">
                                Loading actions...
                              </div>
                            ) : documentActions.length > 0 ? (
                              <div className="space-y-2">
                                {documentActions.map((action) => (
                                  <div
                                    key={action.document_action_id}
                                    draggable
                                    onDragStart={(event) => {
                                      setDraggingActionName(action.action_name);
                                      event.dataTransfer.setData("text/plain", action.action_name);
                                      event.dataTransfer.effectAllowed = "copy";
                                    }}
                                    onDragEnd={() => setDraggingActionName(null)}
                                    className={cn(
                                      "flex items-start justify-between rounded-lg border p-3 text-sm cursor-grab active:cursor-grabbing transition-all",
                                      draggingActionName === action.action_name
                                        ? "border-primary bg-primary/5 shadow-md scale-105"
                                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                                    )}
                                  >
                                    <div className="flex-1 min-w-0 pr-2">
                                      <div className="font-medium">{action.action_name}</div>
                                      {action.description && (
                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                          {action.description}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      Drag
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-8 text-sm text-muted-foreground text-center">
                                No actions available
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={isPending}
            form="release-document-form"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Releasing...
              </>
            ) : (
              "Release"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
