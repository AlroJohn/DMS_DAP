"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDocumentTypes } from "@/hooks/use-document-types";
import { useProcessType, type ProcessType } from "@/hooks/use-process.type";
import {
  useFileIntegrity,
  detectPotentialCorruption,
} from "@/hooks/useFileIntegrity";
import { useSocket } from "@/components/providers/providers";
import {
  Upload,
  FileText,
  X,
  Plus,
  Loader2,
  Shield,
  FileSearch,
  AlertCircle,
  Recycle,
  FolderPlus,
  Folder,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentGroup {
  id: string;
  name: string;
  files: File[];
}

const generateGroupId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

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

const getBaseProcessCode = (code?: string) => {
  if (!code) return "";
  const separator = code.lastIndexOf("_");
  if (separator <= 0) {
    return code;
  }
  return code.slice(0, separator);
};

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

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentModal({
  open,
  onOpenChange,
}: UploadDocumentModalProps) {
  const ocrDefaultEnabled = false;
  const buildApiUrl = (path: string) => `/api${path}`;
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedProcessType, setSelectedProcessType] = useState("");
  const [selectedClassification, setSelectedClassification] =
    useState("simple");
  const [selectedOrigin, setSelectedOrigin] = useState("external");
  const [enableOcr, setEnableOcr] = useState(ocrDefaultEnabled);
  const [enableEncryption, setEnableEncryption] = useState(true);
  const maxInlineChecksumMB = 15;
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

  // Get socket instance for real-time updates
  const { socket } = useSocket();

  // Fetch data from database
  const { documentTypes, isLoading: typesLoading } = useDocumentTypes();
  const { processTypes, loading: processTypesLoading } = useProcessType();

  const activeProcessTypes = useMemo(
    () => processTypes.filter((type) => type.is_active),
    [processTypes],
  );

  const hierarchy = useMemo(() => {
    const map = new Map<string, GroupLookup>();
    activeProcessTypes.forEach((type) => {
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
  }, [activeProcessTypes]);

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
    return activeProcessTypes.filter((type) => {
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
    activeProcessTypes,
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
      const durationKey = `${type.duration_value ?? ""}-${
        type.duration_unit ?? ""
      }`;
      const dedupeKey = `${getBaseProcessCode(type.code ?? type.name)}-${durationKey}`;
      if (seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    });
  }, [filteredProcessTypes, isFilterActive]);

  useEffect(() => {
    if (
      selectedProcessType &&
      !visibleProcessTypes.find(
        (type) => type.process_type_id === selectedProcessType,
      )
    ) {
      setSelectedProcessType("");
    }
  }, [selectedProcessType, visibleProcessTypes]);

  useEffect(() => {
    setCenterFilter("");
    setDepartmentFilter("");
  }, [groupFilter]);

  useEffect(() => {
    setDepartmentFilter("");
  }, [centerFilter]);

  // Document group management
  const addDocumentGroup = () => {
    const newGroup: DocumentGroup = {
      id: generateGroupId(),
      name: `Group ${documentGroups.length + 1}`,
      files: [],
    };
    setDocumentGroups((prev) => [...prev, newGroup]);
  };

  const removeDocumentGroup = (groupId: string) => {
    setDocumentGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const updateGroupName = (groupId: string, name: string) => {
    setDocumentGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name } : g)),
    );
  };

  const removeFileFromGroup = (groupId: string, fileIndex: number) => {
    setDocumentGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, files: g.files.filter((_, i) => i !== fileIndex) }
          : g,
      ),
    );
  };

  const getTotalFileCount = () =>
    documentGroups.reduce((sum, g) => sum + g.files.length, 0);

  // File integrity checking
  const { verifyFile } = useFileIntegrity({ maxInlineChecksumMB });

  const validateAndAddFiles = async (
    incomingFiles: File[],
    groupId: string,
  ) => {
    if (incomingFiles.length === 0) return;

    const validations = await Promise.all(
      incomingFiles.map(async (file) => {
        if (
          !file.type.includes("pdf") &&
          !file.name.toLowerCase().endsWith(".pdf")
        ) {
          toast.error(`File "${file.name}" is not a PDF file`);
          return null;
        }

        const corruption = detectPotentialCorruption(file);
        if (corruption.isCorrupted) {
          toast.error(`File "${file.name}" rejected`, {
            description: corruption.reason,
          });
          return null;
        }

        try {
          const integrity = await verifyFile(file);
          if (integrity.status === "corrupted") {
            toast.error(`File "${file.name}" appears corrupted`, {
              description: "File integrity check failed",
            });
            return null;
          }

          if (
            integrity.status === "unknown" &&
            integrity.error?.includes("Checksum skipped")
          ) {
            toast.info(`Skipped checksum for "${file.name}"`, {
              description: `Large files over ${maxInlineChecksumMB}MB skip client-side checks.`,
            });
          } else {
            toast.success(`File "${file.name}" validated`, {
              description: "File passed integrity checks",
            });
          }

          return file;
        } catch (error) {
          console.error("Error validating file:", error);
          toast.warning(`Could not validate "${file.name}"`, {
            description: "File will be uploaded without validation",
          });
          return file;
        }
      }),
    );

    const validFiles = validations.filter(
      (file): file is File => file !== null,
    );

    if (validFiles.length > 0) {
      setDocumentGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, files: [...g.files, ...validFiles] } : g,
        ),
      );
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    groupId: string,
  ) => {
    const selectedFiles = Array.from(event.target.files || []);
    await validateAndAddFiles(selectedFiles, groupId);
    event.target.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getCenterCodeFromType = (
    originDepartment?: ProcessType["originDepartment"],
  ) => originDepartment?.center?.code ?? NO_CENTER_CODE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalFiles = getTotalFileCount();
    if (totalFiles === 0 || !title || !selectedType || !selectedProcessType) {
      toast.error(
        "Please complete all required fields and add at least one file to a group.",
      );
      return;
    }

    // Filter out empty groups
    const groupsWithFiles = documentGroups.filter((g) => g.files.length > 0);
    if (groupsWithFiles.length === 0) {
      toast.error("Please add at least one file to a group.");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Get the first file from the first group to create the document
      const firstGroup = groupsWithFiles[0];
      const firstFile = firstGroup.files[0];

      // Create the initial document with the first file
      const formData = new FormData();
      formData.append("document_name", title);
      formData.append("description", description || "");
      formData.append("classification", selectedClassification);
      formData.append("type_id", selectedType);
      formData.append("process_type_id", selectedProcessType);
      formData.append("origin", selectedOrigin);
      formData.append("enableOcr", String(enableOcr));
      formData.append("file", firstFile);
      formData.append("documentGroupId", firstGroup.id);
      formData.append("documentGroupName", firstGroup.name);

      setUploadProgress(20);

      const response = await fetch(buildApiUrl("/documents/upload"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: { message: "Failed to create document" } }));
        throw new Error(
          errorData.error?.message || "Failed to create document",
        );
      }

      const result = await response.json();
      const createdDocument = result.data ?? result;
      const documentId = createdDocument.document_id;

      // Prepare all additional files from all groups
      const additionalUploads: {
        file: File;
        groupId: string;
        groupName: string;
      }[] = [];

      // Add remaining files from first group
      firstGroup.files.slice(1).forEach((file) => {
        additionalUploads.push({
          file,
          groupId: firstGroup.id,
          groupName: firstGroup.name,
        });
      });

      // Add all files from remaining groups
      groupsWithFiles.slice(1).forEach((group) => {
        group.files.forEach((file) => {
          additionalUploads.push({
            file,
            groupId: group.id,
            groupName: group.name,
          });
        });
      });

      if (additionalUploads.length > 0) {
        let completed = 0;
        const total = additionalUploads.length;
        setUploadProgress(30);

        const uploads = additionalUploads.map(
          ({ file, groupId, groupName }) => {
            const additionalFileForm = new FormData();
            additionalFileForm.append("files", file);
            additionalFileForm.append("enableOcr", String(enableOcr));
            additionalFileForm.append("documentGroupId", groupId);
            additionalFileForm.append("documentGroupName", groupName);

            const versionGroupId =
              "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
                /[xy]/g,
                function (c) {
                  const r = (Math.random() * 16) | 0;
                  const v = c === "x" ? r : (r & 0x3) | 0x8;
                  return v.toString(16);
                },
              );
            additionalFileForm.append("versionGroupId", versionGroupId);

            return fetch(buildApiUrl(`/documents/${documentId}/files`), {
              method: "POST",
              credentials: "include",
              body: additionalFileForm,
            })
              .then(async (additionalResponse) => {
                if (!additionalResponse.ok) {
                  const errorData = await additionalResponse
                    .json()
                    .catch(() => ({
                      error: { message: "Failed to upload additional file" },
                    }));
                  throw new Error(
                    errorData.error?.message ||
                      `Failed to upload additional file: ${file.name}`,
                  );
                }
              })
              .finally(() => {
                completed += 1;
                const progress = 30 + Math.floor((completed / total) * 60);
                setUploadProgress(progress);
              });
          },
        );
        await Promise.all(uploads);
      }

      setUploadProgress(100);
      toast.success(
        `Document "${title}" created with ${totalFiles} file${
          totalFiles > 1 ? "s" : ""
        } in ${groupsWithFiles.length} group${groupsWithFiles.length > 1 ? "s" : ""}!`,
      );
      if (enableOcr) {
        toast.info("OCR processing started", {
          description: "OCR runs in the background after upload.",
        });
      }

      // Emit document upload completed event via Socket.IO
      if (socket) {
        socket.emit("documentUploadCompleted", {
          documentId: createdDocument.document_id,
          documentTitle: createdDocument.title,
        });
      }

      // Reset form and close modal
      setDocumentGroups([]);
      setTitle("");
      setDescription("");
      setSelectedType("");
      setSelectedProcessType("");
      setSelectedClassification("simple");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed", {
        description:
          error?.message || "An error occurred while uploading the document.",
      });
    } finally {
      setTimeout(() => setUploadProgress(0), 300);
      setUploading(false);
    }
  };

  // Listen for real-time progress updates if available
  useEffect(() => {
    if (socket && uploading) {
      socket.on("documentUploadProgress", (data) => {
        if (data.documentId) {
          setUploadProgress(data.progress);
          toast.info(`Upload progress: ${data.progress}%`);
        }
      });

      return () => {
        socket.off("documentUploadProgress");
      };
    }
  }, [socket, uploading]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 max-h-[70vh] overflow-y-auto"
        >
          <div className="w-full grid grid-cols-1 gap-6">
            <div className="space-y-6 lg:col-span-2">
              {/* Add Group Button */}
              <Card className="border shadow-sm rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FolderPlus className="h-4 w-4 text-primary" />
                      Document Groups
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getTotalFileCount() > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-sm py-1 px-3"
                        >
                          {getTotalFileCount()} file
                          {getTotalFileCount() !== 1 ? "s" : ""} in{" "}
                          {
                            documentGroups.filter((g) => g.files.length > 0)
                              .length
                          }{" "}
                          group
                          {documentGroups.filter((g) => g.files.length > 0)
                            .length !== 1
                            ? "s"
                            : ""}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDocumentGroup}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Group
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {documentGroups.length === 0 ? (
                    <div className="border-2 border-dashed border-muted-foreground/40 rounded-xl p-8 text-center">
                      <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">No groups yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click &quot;Add Group&quot; to create a document group,
                        then add files to it.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addDocumentGroup}
                        className="gap-2"
                      >
                        <FolderPlus className="h-4 w-4" />
                        Create First Group
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documentGroups.map((group, groupIndex) => (
                        <div
                          key={group.id}
                          className="border rounded-xl p-4 bg-card/50"
                        >
                          {/* Group Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Folder className="h-5 w-5 text-primary" />
                              </div>
                              <Input
                                value={group.name}
                                onChange={(e) =>
                                  updateGroupName(group.id, e.target.value)
                                }
                                className="max-w-[200px] h-8 text-sm font-medium"
                                placeholder="Group name"
                              />
                              <Badge variant="outline" className="text-xs">
                                {group.files.length} file
                                {group.files.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDocumentGroup(group.id)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Drop Zone for Group */}
                          <div
                            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center transition-all hover:border-primary/50 hover:bg-primary/5 mb-3"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add(
                                "border-primary",
                                "bg-primary/10",
                              );
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove(
                                "border-primary",
                                "bg-primary/10",
                              );
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove(
                                "border-primary",
                                "bg-primary/10",
                              );
                              const dt = e.dataTransfer;
                              const newFiles = Array.from(dt.files || []);
                              await validateAndAddFiles(newFiles, group.id);
                            }}
                          >
                            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">
                              Drop PDF files here or click to browse
                            </p>
                            <input
                              type="file"
                              multiple
                              accept=".pdf"
                              onChange={(e) => handleFileSelect(e, group.id)}
                              className="hidden"
                              id={`file-upload-group-${group.id}`}
                            />
                            <Button
                              type="button"
                              asChild
                              variant="secondary"
                              size="sm"
                            >
                              <label
                                htmlFor={`file-upload-group-${group.id}`}
                                className="cursor-pointer"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Files
                              </label>
                            </Button>
                          </div>

                          {/* Files in Group */}
                          {group.files.length > 0 && (
                            <div className="space-y-2">
                              {group.files.map((file, fileIndex) => (
                                <div
                                  key={fileIndex}
                                  className="flex items-center gap-3 p-2 border rounded-lg bg-background hover:bg-accent/20 transition-all group/file"
                                >
                                  <div className="p-1.5 rounded bg-blue-500/10">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatFileSize(file.size)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                    <Badge
                                      variant="outline"
                                      className="text-xs py-0.5 px-1.5 border-green-500 text-green-700 bg-green-50"
                                    >
                                      Valid
                                    </Badge>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        removeFileFromGroup(group.id, fileIndex)
                                      }
                                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {uploading && (
                <Card className="border shadow-sm rounded-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      Upload Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-base mb-2">
                        <span className="font-medium">Uploading files...</span>
                        <span className="font-medium text-primary">
                          {uploadProgress}%
                        </span>
                      </div>
                      <Progress value={uploadProgress} className="h-3" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Preparing upload</span>
                        <span>Finalizing</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm text-green-600">
                          Secure transfer active
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6 lg:col-span-2">
              <Card className="border shadow-sm rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Document Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Document Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="Enter document title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className={`${
                        title ? "border-primary/50 ring-1 ring-primary/20" : ""
                      } text-base transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                    />
                    {!title && (
                      <p className="text-xs text-muted-foreground">
                        Document title is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Enter description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="text-base transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-sm font-medium">
                        Document Type *
                      </Label>
                      <Select
                        disabled={typesLoading}
                        value={selectedType}
                        onValueChange={setSelectedType}
                      >
                        <SelectTrigger
                          className={`${
                            selectedType
                              ? "border-primary/50 ring-1 ring-primary/20"
                              : ""
                          } text-base w-full transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                        >
                          <SelectValue
                            placeholder={
                              typesLoading ? "Loading..." : "Select type"
                            }
                          />
                          {typesLoading && (
                            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem
                              key={type.type_id}
                              value={type.type_id}
                              className="text-base py-2 px-3"
                            >
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="processType"
                        className="text-sm font-medium"
                      >
                        Process Type *
                      </Label>
                      <Select
                        disabled={processTypesLoading}
                        value={selectedProcessType}
                        onValueChange={setSelectedProcessType}
                      >
                        <SelectTrigger
                          className={`${
                            selectedProcessType
                              ? "border-primary/50 ring-1 ring-primary/20"
                              : ""
                          } text-base w-full transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                        >
                          <SelectValue
                            placeholder={
                              processTypesLoading
                                ? "Loading..."
                                : "Select process type"
                            }
                          />
                          {processTypesLoading && (
                            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          )}
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
                                className="text-[11px] uppercase tracking-[0.15em] shrink-0"
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
                                      <span className="flex items-center gap-2 truncate max-w-full">
                                        <span className="font-medium truncate max-w-[200px]">
                                          {type.code || type.name}
                                        </span>
                                        {type.duration_value && (
                                          <span className="text-xs text-muted-foreground shrink-0">
                                            ·{" "}
                                            {formatProcessDuration(
                                              type.duration_value,
                                              type.duration_unit,
                                            )}
                                          </span>
                                        )}
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
                      {!selectedProcessType && (
                        <p className="text-xs text-muted-foreground">
                          Process type is required
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="classification"
                        className="text-sm font-medium"
                      >
                        Classification
                      </Label>
                      <Select
                        value={selectedClassification}
                        onValueChange={setSelectedClassification}
                      >
                        <SelectTrigger
                          className={`${
                            selectedClassification
                              ? "border-primary/50 ring-1 ring-primary/20"
                              : ""
                          } text-base w-full transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                        >
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="simple"
                            className="text-base py-2 px-3"
                          >
                            Simple
                          </SelectItem>
                          <SelectItem
                            value="complex"
                            className="text-base py-2 px-3"
                          >
                            Complex
                          </SelectItem>
                          <SelectItem
                            value="highly_technical"
                            className="text-base py-2 px-3"
                          >
                            Highly Technical
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="origin" className="text-sm font-medium">
                        Origin
                      </Label>
                      <Select
                        value={selectedOrigin}
                        onValueChange={setSelectedOrigin}
                      >
                        <SelectTrigger
                          className={`${
                            selectedOrigin
                              ? "border-primary/50 ring-1 ring-primary/20"
                              : ""
                          } text-base w-full transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary`}
                        >
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="internal"
                            className="text-base py-2 px-3"
                          >
                            Internal
                          </SelectItem>
                          <SelectItem
                            value="external"
                            className="text-base py-2 px-3"
                          >
                            External
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileSearch className="h-4 w-4 text-primary" />
                    Additional Options
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-ocr"
                      checked={enableOcr}
                      onCheckedChange={(checked) =>
                        setEnableOcr(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="enable-ocr"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Run OCR after upload (background)
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Extracts text from the PDF after upload. OCR runs in the
                    background and will not block document creation.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                getTotalFileCount() === 0 ||
                uploading ||
                !title ||
                !selectedType ||
                !selectedProcessType
              }
            >
              {uploading ? "Uploading..." : "Upload Documents"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
