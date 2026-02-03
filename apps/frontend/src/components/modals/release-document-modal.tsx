"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

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

const releaseDocumentSchema = z.object({
  departmentIds: z
    .array(z.string())
    .min(1, "Please select at least one department."),
  requestActions: z
    .array(z.string())
    .min(1, "Please select at least one action."),
  remarks: z.string().optional(),
});

type ReleaseDocumentForm = z.infer<typeof releaseDocumentSchema>;

interface ReleaseDocumentModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onSignatureSetup?: (payload: {
    documentId: string;
    departmentIds: string[];
    requestActions: string[];
    remarks?: string;
  }) => void;
}

export function ReleaseDocumentModal({
  document,
  isOpen,
  onClose,
  onSignatureSetup,
}: ReleaseDocumentModalProps) {
  const { user: currentUser } = useAuth();
  const currentDepartmentId = currentUser?.department_id;
  const [groups, setGroups] = useState<Group[]>([]);
  const [documentActions, setDocumentActions] = useState<DocumentAction[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [sequenceEnabled, setSequenceEnabled] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");
  const [orderedDepartmentIds, setOrderedDepartmentIds] = useState<string[]>(
    [],
  );
  const [draggingDepartmentId, setDraggingDepartmentId] = useState<
    string | null
  >(null);
  const [draggingActionName, setDraggingActionName] = useState<string | null>(
    null,
  );
  const [departmentActionMap, setDepartmentActionMap] = useState<
    Record<string, string[]>
  >({});

  const form = useForm<ReleaseDocumentForm>({
    resolver: zodResolver(releaseDocumentSchema),
    defaultValues: {
      departmentIds: [],
      requestActions: [],
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

  const updateOrderedDepartments = (nextIds: string[]) => {
    setOrderedDepartmentIds((prev) => {
      const next = prev.filter((id) => nextIds.includes(id));
      nextIds.forEach((id) => {
        if (!next.includes(id)) {
          next.push(id);
        }
      });
      return next;
    });
  };

  const handleDepartmentToggle = (departmentId: string, checked: boolean) => {
    if (departmentId === currentDepartmentId) return;
    const current = new Set(form.getValues("departmentIds"));
    if (checked) {
      current.add(departmentId);
    } else {
      current.delete(departmentId);
    }
    const nextIds = Array.from(current);
    form.setValue("departmentIds", nextIds, { shouldValidate: true });
    updateOrderedDepartments(nextIds);
    setDepartmentActionMap((prev) => {
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

  // Fetch departments and document actions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchDocumentActions();
    }
    if (!isOpen) {
      form.reset();
      setSequenceEnabled(false);
      setOrderedDepartmentIds([]);
      setDraggingDepartmentId(null);
      setDraggingActionName(null);
      setSelectedGroupId("all");
      setSelectedCenterId("all");
      setDepartmentActionMap({});
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
        // Map the action names to action IDs if needed
        // For now, keeping the action names as selected by the user
        remarks: data.remarks,
        workflowSequenceEnabled: sequenceEnabled,
        orderedDepartmentIds: sequenceEnabled ? data.departmentIds : undefined,
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

    const hasSignatureAction = data.requestActions.some((actionName) => {
      const normalized = actionName.toLowerCase();
      return (
        normalized.includes("signature") ||
        normalized.includes("for signature")
      );
    });

    if (hasSignatureAction && onSignatureSetup && document) {
      const signatureDepartmentIds = data.departmentIds.filter(
        (departmentId) =>
          (departmentActionMap[departmentId] || []).some((actionName) => {
            const normalized = actionName.toLowerCase();
            return (
              normalized.includes("signature") ||
              normalized.includes("for signature")
            );
          }),
      );

      if (signatureDepartmentIds.length > 0) {
        onSignatureSetup({
          documentId: document.id,
          departmentIds: signatureDepartmentIds,
          requestActions: data.requestActions,
          remarks: data.remarks,
        });
        form.reset();
        onClose();
        return;
      }
    }

    const orderedIds =
      sequenceEnabled && orderedDepartmentIds.length > 0
        ? orderedDepartmentIds
        : data.departmentIds;

    releaseDocument({
      ...data,
      departmentIds: orderedIds,
    });
  };

  if (!document) return null;

  const selectedCount = selectedDepartmentIds.length;
  const orderedSelection = useMemo(() => {
    if (!sequenceEnabled) return selectedDepartmentIds;
    const selectedSet = new Set(selectedDepartmentIds);
    const ordered = orderedDepartmentIds.filter((id) => selectedSet.has(id));
    selectedDepartmentIds.forEach((id) => {
      if (!ordered.includes(id)) {
        ordered.push(id);
      }
    });
    return ordered;
  }, [orderedDepartmentIds, selectedDepartmentIds, sequenceEnabled]);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="sticky top-0 z-10 p-6 pb-4">
          <DialogTitle>Release Document</DialogTitle>
          <DialogDescription>
            Release the document to another department for action.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto px-6">
          <div className="grid gap-4 h-full ">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-code" className="text-right">
                Code
              </Label>
              <Input
                id="doc-code"
                value={document.documentId}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-name" className="text-right">
                Name
              </Label>
              <Input
                id="doc-name"
                value={document.document}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-classification" className="text-right">
                Classification
              </Label>
              <Input
                id="doc-classification"
                value={document.classification}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-owner" className="text-right">
                Owner
              </Label>
              <Input
                id="doc-owner"
                value={document.contactPerson}
                readOnly
                className="col-span-3"
              />
            </div>
          </div>

          <Form {...form}>
            <form
              id="release-document-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 pt-4"
            >
              <div className="w-full grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="departmentIds"
                  render={() => (
                    <FormItem className="w-full">
                      <FormLabel>Release To</FormLabel>
                      <FormControl>
                        <div className="rounded-md border border-input p-4 space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                Group
                              </Label>
                              <Select
                                value={selectedGroupId}
                                onValueChange={setSelectedGroupId}
                              >
                                <SelectTrigger>
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
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                Center
                              </Label>
                              <Select
                                value={selectedCenterId}
                                onValueChange={setSelectedCenterId}
                                disabled={
                                  selectedGroupId === "all" ||
                                  availableCenters.length === 0
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select center" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Centers</SelectItem>
                                  {activeGroup?.departments?.length ? (
                                    <SelectItem value="no-center">
                                      No Center
                                    </SelectItem>
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
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs uppercase text-muted-foreground">
                              Departments
                            </div>
                            <div className="rounded-md border bg-muted/20 p-3 max-h-48 overflow-auto space-y-2">
                              {loadingDepartments ? (
                                <div className="text-sm text-muted-foreground">
                                  Loading options...
                                </div>
                              ) : availableDepartments.length > 0 ? (
                                availableDepartments.map((dept) => (
                                  <label
                                    key={dept.department_id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <Checkbox
                                      checked={selectedDepartmentIds.includes(
                                        dept.department_id,
                                      )}
                                      disabled={
                                        dept.department_id ===
                                        currentDepartmentId
                                      }
                                      onCheckedChange={(checked) =>
                                        handleDepartmentToggle(
                                          dept.department_id,
                                          checked === true,
                                        )
                                      }
                                    />
                                    {dept.name}
                                  </label>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  No departments available for the selected
                                  filters.
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

                <div className="text-xs text-muted-foreground">
                  {selectedCount > 0
                    ? `This will notify ${selectedCount} department${
                        selectedCount === 1 ? "" : "s"
                      }.`
                    : "Select targets to preview recipients."}
                </div>

                {selectedCount > 1 && (
                  <div className="rounded-md border border-input p-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={sequenceEnabled}
                        onCheckedChange={(checked) =>
                          setSequenceEnabled(checked === true)
                        }
                      />
                      Enable workflow sequence
                    </label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, drag departments to set the routing order.
                    </p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="requestActions"
                  render={() => (
                    <FormItem>
                      <FormLabel>Action Assignment</FormLabel>
                      <FormControl>
                        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                          <div className="rounded-md border border-input p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Departments
                              </span>
                              <Badge variant="outline">
                                {selectedCount}
                              </Badge>
                            </div>
                            {selectedCount === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Select departments to assign actions.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {orderedSelection.map((deptId, index) => {
                                  const assignedActions =
                                    departmentActionMap[deptId] || [];
                                  return (
                                    <div
                                      key={deptId}
                                      draggable={sequenceEnabled}
                                      onDragStart={(event) => {
                                        if (!sequenceEnabled) return;
                                        setDraggingDepartmentId(deptId);
                                        event.dataTransfer.setData(
                                          "application/x-department",
                                          deptId,
                                        );
                                        event.dataTransfer.effectAllowed =
                                          "move";
                                      }}
                                      onDragEnd={() =>
                                        setDraggingDepartmentId(null)
                                      }
                                      onDragOver={(event) => {
                                        if (
                                          draggingActionName ||
                                          (sequenceEnabled &&
                                            draggingDepartmentId)
                                        ) {
                                          event.preventDefault();
                                        }
                                      }}
                                      onDrop={(event) => {
                                        event.preventDefault();
                                        const actionName =
                                          draggingActionName ||
                                          event.dataTransfer.getData(
                                            "text/plain",
                                          );
                                        if (actionName) {
                                          handleAssignAction(
                                            deptId,
                                            actionName,
                                          );
                                          setDraggingActionName(null);
                                          return;
                                        }
                                        if (
                                          sequenceEnabled &&
                                          draggingDepartmentId &&
                                          draggingDepartmentId !== deptId
                                        ) {
                                          setOrderedDepartmentIds((prev) => {
                                            const next = [...prev];
                                            const fromIndex =
                                              next.indexOf(
                                                draggingDepartmentId,
                                              );
                                            const toIndex =
                                              next.indexOf(deptId);
                                            if (
                                              fromIndex < 0 ||
                                              toIndex < 0
                                            ) {
                                              return prev;
                                            }
                                            next.splice(fromIndex, 1);
                                            next.splice(
                                              toIndex,
                                              0,
                                              draggingDepartmentId,
                                            );
                                            return next;
                                          });
                                          setDraggingDepartmentId(null);
                                        }
                                      }}
                                      className={cn(
                                        "rounded border px-3 py-2 space-y-2",
                                        draggingDepartmentId === deptId
                                          ? "border-primary bg-primary/5"
                                          : "border-muted",
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium">
                                            {departmentNameById.get(deptId) ||
                                              "Unknown department"}
                                          </span>
                                          {sequenceEnabled && (
                                            <Badge
                                              variant="secondary"
                                              className="text-[11px]"
                                            >
                                              {index + 1}
                                            </Badge>
                                          )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          Drop actions
                                        </span>
                                      </div>
                                      {assignedActions.length ? (
                                        <div className="flex flex-wrap gap-2">
                                          {assignedActions.map((action) => (
                                            <Badge
                                              key={`${deptId}-${action}`}
                                              variant="outline"
                                              className="flex items-center gap-1"
                                            >
                                              <span>{action}</span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleRemoveAssignedAction(
                                                    deptId,
                                                    action,
                                                  )
                                                }
                                                className="rounded-full p-0.5 hover:bg-muted"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">
                                          No actions assigned yet.
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="rounded-md border border-input p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Actions
                              </span>
                              <Badge variant="outline">
                                {documentActions.length}
                              </Badge>
                            </div>
                            {loadingActions ? (
                              <div className="py-2 text-sm text-muted-foreground">
                                Loading actions...
                              </div>
                            ) : documentActions.length > 0 ? (
                              <div className="space-y-2">
                                {documentActions.map((action) => (
                                  <div
                                    key={action.document_action_id}
                                    draggable
                                    onDragStart={(event) => {
                                      setDraggingActionName(
                                        action.action_name,
                                      );
                                      event.dataTransfer.setData(
                                        "text/plain",
                                        action.action_name,
                                      );
                                      event.dataTransfer.effectAllowed = "copy";
                                    }}
                                    onDragEnd={() =>
                                      setDraggingActionName(null)
                                    }
                                    className={cn(
                                      "flex items-center justify-between rounded border px-3 py-2 text-sm",
                                      draggingActionName === action.action_name
                                        ? "border-primary bg-primary/5"
                                        : "border-muted",
                                    )}
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {action.action_name}
                                      </div>
                                      {action.description && (
                                        <div className="text-xs text-muted-foreground">
                                          {action.description}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      Drag
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-2 text-sm text-muted-foreground">
                                No actions available
                              </div>
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any remarks here..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <DialogFooter className="flex sm:justify-end p-6 pt-4">
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
            {isPending ? "Releasing..." : "Release"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
