"use client";

import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentFileMetadata } from "@/hooks/use-document-files";
import { cn } from "@/lib/utils";
import {
  ChevronsUpDown,
  Loader2,
  Move,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getAccessToken } from "@/lib/token-utils";

const PDFJS_WORKER_CDN =
  process.env.NEXT_PUBLIC_PDFJS_WORKER_URL ||
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.394/legacy/build/pdf.worker.min.mjs";

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
}

interface PdfPageRender {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
  pdfWidth: number;
  pdfHeight: number;
}

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

export interface SignatureBox {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  isExisting?: boolean;
  assignedUserId?: string | null;
  assignedDepartmentIds?: string[];
}

export interface TextBox {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  text?: string;
  rotation?: number;
  isExisting?: boolean;
  assignedUserId?: string | null;
  assignedDepartmentIds?: string[];
}

interface SignaturePdfViewerProps {
  documentId: string;
  files: DocumentFileMetadata[];
  initialFileId?: string | null;
  targetFileIds?: string[];
  isLoadingFiles: boolean;
  isConfirming?: boolean;
  onExit: () => void;
  onConfirm: (payload: {
    fileId: string;
    boxes: SignatureBox[];
    textBoxes: TextBox[];
    targetFileIds?: string[];
    pageScales?: Record<number, { scaleX: number; scaleY: number }>;
  }) => void;
}

const isPdfLikeFile = (file?: DocumentFileMetadata | null) => {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  if (type.includes("pdf")) return true;
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".pdf");
};

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const normalizeRotation = (value: number) => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

// Calculate the effective bounding box dimensions after rotation
const getRotatedBounds = (width: number, height: number, rotation: number) => {
  const rad = ((rotation || 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rotatedWidth = width * cos + height * sin;
  const rotatedHeight = width * sin + height * cos;
  return { width: rotatedWidth, height: rotatedHeight };
};

export function SignaturePdfViewer({
  documentId,
  files,
  initialFileId,
  targetFileIds,
  isLoadingFiles,
  isConfirming = false,
  onExit,
  onConfirm,
}: SignaturePdfViewerProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const currentDepartmentId =
    (user as { department_id?: string })?.department_id ||
    (user as { department?: { department_id?: string } })?.department
      ?.department_id ||
    null;
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>(
    [],
  );

  const allowedDepartmentIds = useMemo(() => {
    const ids = new Set<string>();
    const single = searchParams?.get("releaseDepartmentId");
    const list =
      searchParams?.get("releaseDepartmentIds") ||
      searchParams?.get("releaseDepartments");
    if (single) ids.add(single);
    if (list) {
      list
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => ids.add(value));
    }
    return Array.from(ids);
  }, [searchParams]);

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const token = getAccessToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
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
          setGroups(result.data?.groups || []);
        }
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredGroups = useMemo(() => {
    if (!allowedDepartmentIds.length) return groups;
    const allowed = new Set(allowedDepartmentIds);

    return groups
      .map((group) => {
        const filteredCenters = (group.centers || [])
          .map((center) => {
            const centerDepartments = (center.departments || []).filter(
              (dept) => allowed.has(dept.department_id),
            );
            if (!centerDepartments.length) return null;
            return { ...center, departments: centerDepartments };
          })
          .filter(Boolean) as Center[];

        const filteredDepartments = (group.departments || []).filter((dept) =>
          allowed.has(dept.department_id),
        );

        if (!filteredCenters.length && !filteredDepartments.length) {
          return null;
        }

        return {
          ...group,
          centers: filteredCenters,
          departments: filteredDepartments,
        };
      })
      .filter(Boolean) as Group[];
  }, [allowedDepartmentIds, groups]);

  const allDepartmentIds = useMemo(() => {
    const ids: string[] = [];
    filteredGroups.forEach((group) => {
      group.departments.forEach((dept) => ids.push(dept.department_id));
      group.centers.forEach((center) => {
        center.departments.forEach((dept) => ids.push(dept.department_id));
      });
    });
    return ids;
  }, [filteredGroups]);

  useEffect(() => {
    if (!filteredGroups.length) return;
    setSelectedDepartmentIds((prev) => {
      if (allowedDepartmentIds.length) {
        const allowedSet = new Set(allowedDepartmentIds);
        const next = allDepartmentIds.filter((id) => allowedSet.has(id));
        return next.length ? next : prev;
      }
      if (prev.length) {
        return prev.filter((id) => allDepartmentIds.includes(id));
      }
      if (
        currentDepartmentId &&
        allDepartmentIds.includes(currentDepartmentId)
      ) {
        return [currentDepartmentId];
      }
      return [];
    });
  }, [
    allDepartmentIds,
    allowedDepartmentIds,
    currentDepartmentId,
    filteredGroups,
  ]);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    filteredGroups.forEach((group) => {
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
  }, [filteredGroups]);

  const getGroupDepartmentIds = (group: Group) => {
    const groupDepartments = [
      ...(group.departments || []),
      ...group.centers.flatMap((center) => center.departments || []),
    ];
    return groupDepartments.map((dept) => dept.department_id);
  };

  const getCenterDepartmentIds = (center: Center) =>
    (center.departments || []).map((dept) => dept.department_id);

  const toggleSelection = (ids: string[], checked: boolean) => {
    setSelectedDepartmentIds((prev) => {
      const current = new Set(prev);
      if (checked) {
        ids.forEach((id) => current.add(id));
      } else {
        ids.forEach((id) => current.delete(id));
      }
      return Array.from(current);
    });
  };
  const pdfFiles = useMemo(
    () => files.filter((file) => isPdfLikeFile(file)),
    [files],
  );

  // For now, assume all users have department permission
  // In a real implementation, you would fetch document details to check department
  const hasDepartmentPermission = true; // Simplified for now to avoid infinite loop

  const normalizedTargetFileIds = useMemo(() => {
    if (!targetFileIds?.length) return [];
    const allowedIds = new Set(pdfFiles.map((file) => file.id));
    return targetFileIds.filter((id) => allowedIds.has(id));
  }, [pdfFiles, targetFileIds]);

  const selectableFiles = useMemo(() => {
    if (!normalizedTargetFileIds.length) return pdfFiles;
    const selectedSet = new Set(normalizedTargetFileIds);
    return pdfFiles.filter((file) => selectedSet.has(file.id));
  }, [normalizedTargetFileIds, pdfFiles]);

  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    initialFileId ?? selectableFiles[0]?.id ?? null,
  );

  const selectedFile = useMemo(() => {
    if (!selectableFiles || selectableFiles.length === 0) return null;
    const targetId = selectedFileId ?? selectableFiles[0]?.id ?? null;
    return targetId
      ? selectableFiles.find((file) => file.id === targetId)
      : null;
  }, [selectableFiles, selectedFileId]);

  useEffect(() => {
    if (!selectableFiles.length) {
      setSelectedFileId(null);
      return;
    }
    if (!selectedFileId) {
      setSelectedFileId(selectableFiles[0]?.id ?? null);
      return;
    }
    const isAvailable = selectableFiles.some(
      (file) => file.id === selectedFileId,
    );
    if (!isAvailable) {
      setSelectedFileId(selectableFiles[0]?.id ?? null);
    }
  }, [selectableFiles, selectedFileId]);

  const [pages, setPages] = useState<PdfPageRender[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [isRendering, setIsRendering] = useState(false);
  const [boxes, setBoxes] = useState<SignatureBox[]>([]);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [placementMode, setPlacementMode] = useState<
    "signature" | "text" | null
  >(null);

  // State for rotation tracking
  const [activeRotationElement, setActiveRotationElement] = useState<
    string | null
  >(null);

  const RENDER_SCALE = useMemo(() => 1.2, []);
  const TEXT_FONT_OPTIONS = useMemo(
    () => ["Arial", "Times New Roman", "Courier New", "Georgia"],
    [],
  );
  const DEFAULT_TEXT_FONT = "Arial";
  const DEFAULT_TEXT_SIZE = 14;
  const DEFAULT_TEXT_COLOR = "#111827";

  const { data: placeholders = [] } = useQuery({
    queryKey: ["signature-placeholders", documentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/document-signatures/documents/${documentId}/signature-placeholders`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch signature placeholders");
      }
      return response.json() as Promise<
        Array<{
          placeholder_id: string;
          document_file_id: string;
          page_number: number;
          x_position: number;
          y_position: number;
          width: number;
          height: number;
          rotation?: number;
          assigned_user_id?: string | null;
          department_id?: string | null;
        }>
      >;
    },
    enabled: Boolean(documentId),
  });

  const { data: textPlaceholders = [] } = useQuery({
    queryKey: ["text-placeholders", documentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/document-texts/documents/${documentId}/text-placeholders`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch text placeholders");
      }
      return response.json() as Promise<
        Array<{
          placeholder_id: string;
          document_file_id: string;
          page_number: number;
          x_position: number;
          y_position: number;
          width: number;
          height: number;
          font_family: string;
          font_size: number;
          font_color: string;
          text_value?: string | null;
          rotation?: number;
          assigned_user_id?: string | null;
          department_id?: string | null;
        }>
      >;
    },
    enabled: Boolean(documentId),
  });

  // Memoize boxes with their indices for efficient rendering
  const boxesWithIndices = useMemo(() => {
    const existingBoxesList = boxes.filter((b) => b.isExisting);
    const newBoxesList = boxes.filter((b) => !b.isExisting);

    return boxes.map((box) => {
      const index = box.isExisting
        ? existingBoxesList.findIndex((b) => b.id === box.id) + 1
        : newBoxesList.findIndex((b) => b.id === box.id) + 1;

      return { box, index };
    });
  }, [boxes]);

  const textBoxesWithIndices = useMemo(() => {
    const existingBoxesList = textBoxes.filter((b) => b.isExisting);
    const newBoxesList = textBoxes.filter((b) => !b.isExisting);

    return textBoxes.map((box) => {
      const index = box.isExisting
        ? existingBoxesList.findIndex((b) => b.id === box.id) + 1
        : newBoxesList.findIndex((b) => b.id === box.id) + 1;

      return { box, index };
    });
  }, [textBoxes]);

  useEffect(() => {
    if (!selectedFileId) {
      setBoxes((prevBoxes) => (prevBoxes.length ? [] : prevBoxes));
      return;
    }

    // Create a stable reference to existing boxes to prevent infinite loops
    const newExistingBoxes = placeholders
      .filter((placeholder) => placeholder.document_file_id === selectedFileId)
      .map((placeholder) => {
        const page = pages.find(
          (candidate) => candidate.pageNumber === placeholder.page_number,
        );
        const scaleX = page?.pdfWidth
          ? page.width / page.pdfWidth
          : RENDER_SCALE;
        const scaleY = page?.pdfHeight
          ? page.height / page.pdfHeight
          : RENDER_SCALE;

        return {
          id: placeholder.placeholder_id,
          pageNumber: placeholder.page_number,
          x: placeholder.x_position * scaleX,
          y: placeholder.y_position * scaleY,
          width: placeholder.width * scaleX,
          height: placeholder.height * scaleY,
          rotation: placeholder.rotation ?? 0,
          isExisting: true,
          assignedUserId: placeholder.assigned_user_id || null,
          assignedDepartmentIds: placeholder.department_id
            ? [placeholder.department_id]
            : undefined,
        };
      });

    setBoxes((prevBoxes) => {
      // Separate existing and new boxes
      const prevExistingBoxes = prevBoxes.filter((b) => b.isExisting);
      const prevNewBoxes = prevBoxes.filter((b) => !b.isExisting);

      // Check if existing boxes have changed by comparing IDs and positions
      const hasExistingBoxesChanged =
        newExistingBoxes.length !== prevExistingBoxes.length ||
        !newExistingBoxes.every((newBox) =>
          prevExistingBoxes.some(
            (prevBox) =>
              prevBox.id === newBox.id &&
              prevBox.x === newBox.x &&
              prevBox.y === newBox.y &&
              prevBox.width === newBox.width &&
              prevBox.height === newBox.height,
          ),
        );

      if (!hasExistingBoxesChanged) {
        return prevBoxes;
      }

      return [...newExistingBoxes, ...prevNewBoxes];
    });
  }, [selectedFileId, placeholders, pages, RENDER_SCALE]);

  useEffect(() => {
    if (!selectedFileId) {
      setTextBoxes((prevBoxes) => (prevBoxes.length ? [] : prevBoxes));
      return;
    }

    const newExistingTextBoxes = textPlaceholders
      .filter((placeholder) => placeholder.document_file_id === selectedFileId)
      .map((placeholder) => {
        const page = pages.find(
          (candidate) => candidate.pageNumber === placeholder.page_number,
        );
        const scaleX = page?.pdfWidth
          ? page.width / page.pdfWidth
          : RENDER_SCALE;
        const scaleY = page?.pdfHeight
          ? page.height / page.pdfHeight
          : RENDER_SCALE;

        return {
          id: placeholder.placeholder_id,
          pageNumber: placeholder.page_number,
          x: placeholder.x_position * scaleX,
          y: placeholder.y_position * scaleY,
          width: placeholder.width * scaleX,
          height: placeholder.height * scaleY,
          fontFamily: placeholder.font_family || DEFAULT_TEXT_FONT,
          fontSize: placeholder.font_size || DEFAULT_TEXT_SIZE,
          fontColor: placeholder.font_color || DEFAULT_TEXT_COLOR,
          text: placeholder.text_value || "",
          rotation: placeholder.rotation ?? 0,
          isExisting: true,
          assignedUserId: placeholder.assigned_user_id || null,
          assignedDepartmentIds: placeholder.department_id
            ? [placeholder.department_id]
            : undefined,
        };
      });

    setTextBoxes((prevBoxes) => {
      const prevExistingBoxes = prevBoxes.filter((b) => b.isExisting);
      const prevNewBoxes = prevBoxes.filter((b) => !b.isExisting);

      const hasExistingBoxesChanged =
        newExistingTextBoxes.length !== prevExistingBoxes.length ||
        !newExistingTextBoxes.every((newBox) =>
          prevExistingBoxes.some(
            (prevBox) =>
              prevBox.id === newBox.id &&
              prevBox.x === newBox.x &&
              prevBox.y === newBox.y &&
              prevBox.width === newBox.width &&
              prevBox.height === newBox.height &&
              prevBox.fontFamily === newBox.fontFamily &&
              prevBox.fontSize === newBox.fontSize &&
              prevBox.fontColor === newBox.fontColor &&
              prevBox.text === newBox.text,
          ),
        );

      if (!hasExistingBoxesChanged) {
        return prevBoxes;
      }

      return [...newExistingTextBoxes, ...prevNewBoxes];
    });
  }, [
    selectedFileId,
    textPlaceholders,
    pages,
    RENDER_SCALE,
    DEFAULT_TEXT_FONT,
    DEFAULT_TEXT_SIZE,
    DEFAULT_TEXT_COLOR,
  ]);

  useEffect(() => {
    if (!selectedFile) {
      setPages([]);
      setActivePage(1);
      return;
    }

    let isMounted = true;
    let loadingTask: { destroy?: () => Promise<void> } | null = null;
    const renderTasks: Array<{ cancel?: () => void }> = [];

    const renderPdfPages = async () => {
      setIsRendering(true);
      try {
        const url = `/api/documents/${documentId}/files/${selectedFile.id}/stream?download=1`;
        const task = getDocument({
          url,
          withCredentials: true,
          useWorkerFetch: true,
          isEvalSupported: false,
        });
        loadingTask = task;

        const pdf = await task.promise;
        const rendered: PdfPageRender[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const renderViewport = page.getViewport({ scale: RENDER_SCALE });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Unable to get canvas context for PDF rendering.");
          }
          canvas.width = renderViewport.width;
          canvas.height = renderViewport.height;

          const renderTask = page.render({
            canvasContext: context,
            viewport: renderViewport,
          });
          renderTasks.push(renderTask);
          await renderTask.promise;

          if (!isMounted) return;

          const imageUrl = canvas.toDataURL("image/png");

          rendered.push({
            pageNumber,
            imageUrl,
            width: renderViewport.width,
            height: renderViewport.height,
            pdfWidth: baseViewport.width,
            pdfHeight: baseViewport.height,
          });
        }

        if (isMounted) {
          setPages(rendered);
          setActivePage((prev) => Math.min(prev, rendered.length) || 1);
        }
      } catch (error: any) {
        if (
          error?.name === "RenderingCancelledException" ||
          error?.message?.includes("Worker was destroyed")
        ) {
          console.warn(
            "PDF render was cancelled or worker was destroyed during cleanup.",
          );
        } else {
          console.error("Failed to render PDF for signature placement", error);
          if (isMounted) {
            setPages([]);
          }
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
        for (const task of renderTasks) {
          try {
            task.cancel?.();
          } catch {
            // ignore
          }
        }
        try {
          await loadingTask?.destroy?.();
        } catch {
          // ignore
        }
      }
    };

    void renderPdfPages();

    return () => {
      isMounted = false;
      try {
        loadingTask?.destroy?.();
      } catch {
        // ignore
      }
    };
     
  }, [documentId, selectedFile?.id]);

  useEffect(() => {
    if (pages.length === 0) {
      setActivePage(1);
    } else if (activePage > pages.length) {
      setActivePage(1);
    }
  }, [pages, activePage]);

  const handleAddBox = () => {
    if (!pages.length) return;
    setPlacementMode((prev) => (prev === "signature" ? null : "signature"));
  };

  const handleAddTextBox = () => {
    if (!pages.length) return;
    setPlacementMode((prev) => (prev === "text" ? null : "text"));
  };

  const handlePlaceBox = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!placementMode || !pages.length) return;
    const targetPage = pages.find((p) => p.pageNumber === activePage);
    if (!targetPage) return;
    if (!selectedDepartmentIds.length) {
      toast.error("Select at least one department to assign this placeholder.");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const defaultWidth = Math.min(180, targetPage.width * 0.4);
    const defaultHeight = Math.min(60, targetPage.height * 0.08);

    const maxX = Math.max(0, targetPage.width - defaultWidth);
    const maxY = Math.max(0, targetPage.height - defaultHeight);

    const x = Math.min(Math.max(clickX - defaultWidth / 2, 0), maxX);
    const y = Math.min(Math.max(clickY - defaultHeight / 2, 0), maxY);

    if (placementMode === "signature") {
      const newBox: SignatureBox = {
        id: createId(),
        pageNumber: targetPage.pageNumber,
        x,
        y,
        width: defaultWidth,
        height: defaultHeight,
        rotation: 0,
        isExisting: false,
        assignedUserId: null,
        assignedDepartmentIds: [...selectedDepartmentIds],
      };

      setBoxes((prev) => [...prev, newBox]);
    } else {
      const newTextBox: TextBox = {
        id: createId(),
        pageNumber: targetPage.pageNumber,
        x,
        y,
        width: defaultWidth,
        height: defaultHeight,
        fontFamily: DEFAULT_TEXT_FONT,
        fontSize: DEFAULT_TEXT_SIZE,
        fontColor: DEFAULT_TEXT_COLOR,
        text: "",
        rotation: 0,
        isExisting: false,
        assignedUserId: null,
        assignedDepartmentIds: [...selectedDepartmentIds],
      };

      setTextBoxes((prev) => [...prev, newTextBox]);
    }

    setPlacementMode(null);
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    setBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== id) return box;

        const page = pages.find((p) => p.pageNumber === box.pageNumber);
        if (!page) return { ...box, x, y };

        // Calculate rotated bounding box
        const rotation = (box.rotation ?? 0) % 360;
        const radians = (rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const rotatedWidth = box.width * cos + box.height * sin;
        const rotatedHeight = box.width * sin + box.height * cos;

        // Calculate center point
        const centerX = x + box.width / 2;
        const centerY = y + box.height / 2;

        // Clamp center to keep rotated box within bounds
        const minCenterX = rotatedWidth / 2;
        const maxCenterX = page.width - rotatedWidth / 2;
        const minCenterY = rotatedHeight / 2;
        const maxCenterY = page.height - rotatedHeight / 2;

        const clampedCenterX = Math.min(
          Math.max(centerX, minCenterX),
          maxCenterX,
        );
        const clampedCenterY = Math.min(
          Math.max(centerY, minCenterY),
          maxCenterY,
        );

        // Convert back to top-left position
        const clampedX = clampedCenterX - box.width / 2;
        const clampedY = clampedCenterY - box.height / 2;

        return { ...box, x: clampedX, y: clampedY };
      }),
    );
  };

  const handleUpdateRotation = (id: string, rotation: number) => {
    setBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== id) return box;

        const normalizedRotation = normalizeRotation(rotation);
        const page = pages.find((p) => p.pageNumber === box.pageNumber);
        if (!page) return { ...box, rotation: normalizedRotation };

        // Calculate new rotated bounding box
        const radians = (normalizedRotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const rotatedWidth = box.width * cos + box.height * sin;
        const rotatedHeight = box.width * sin + box.height * cos;

        // Calculate current center
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Clamp center to keep rotated box within bounds
        const minCenterX = rotatedWidth / 2;
        const maxCenterX = page.width - rotatedWidth / 2;
        const minCenterY = rotatedHeight / 2;
        const maxCenterY = page.height - rotatedHeight / 2;

        const clampedCenterX = Math.min(
          Math.max(centerX, minCenterX),
          maxCenterX,
        );
        const clampedCenterY = Math.min(
          Math.max(centerY, minCenterY),
          maxCenterY,
        );

        // Convert back to top-left position
        const clampedX = clampedCenterX - box.width / 2;
        const clampedY = clampedCenterY - box.height / 2;

        return {
          ...box,
          rotation: normalizedRotation,
          x: clampedX,
          y: clampedY,
        };
      }),
    );
  };

  const handleUpdateTextRotation = (id: string, rotation: number) => {
    setTextBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== id) return box;

        const normalizedRotation = normalizeRotation(rotation);
        const page = pages.find((p) => p.pageNumber === box.pageNumber);
        if (!page) return { ...box, rotation: normalizedRotation };

        // Calculate new rotated bounding box
        const radians = (normalizedRotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const rotatedWidth = box.width * cos + box.height * sin;
        const rotatedHeight = box.width * sin + box.height * cos;

        // Calculate current center
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Clamp center to keep rotated box within bounds
        const minCenterX = rotatedWidth / 2;
        const maxCenterX = page.width - rotatedWidth / 2;
        const minCenterY = rotatedHeight / 2;
        const maxCenterY = page.height - rotatedHeight / 2;

        const clampedCenterX = Math.min(
          Math.max(centerX, minCenterX),
          maxCenterX,
        );
        const clampedCenterY = Math.min(
          Math.max(centerY, minCenterY),
          maxCenterY,
        );

        // Convert back to top-left position
        const clampedX = clampedCenterX - box.width / 2;
        const clampedY = clampedCenterY - box.height / 2;

        return {
          ...box,
          rotation: normalizedRotation,
          x: clampedX,
          y: clampedY,
        };
      }),
    );
  };

  // Function to start rotation based on mouse movement
  const startMouseRotation = (
    id: string,
    isText: boolean,
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // Store the initial mouse position in a closure variable
    let lastX = event.clientX;
    let lastY = event.clientY;

    setActiveRotationElement(id);

    // Add mouse move and up listeners to the document
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();

      // Calculate the difference in mouse position
      const deltaX = moveEvent.clientX - lastX;

      // Determine rotation direction based on mouse movement
      // Horizontal movement (deltaX) controls rotation
      const rotationIncrement = deltaX * 0.5; // Sensitivity factor

      // Update the rotation
      if (isText) {
        setTextBoxes((prev) =>
          prev.map((box) =>
            box.id === id
              ? {
                  ...box,
                  rotation: normalizeRotation(
                    (box.rotation ?? 0) + rotationIncrement,
                  ),
                }
              : box,
          ),
        );
      } else {
        setBoxes((prev) =>
          prev.map((box) =>
            box.id === id
              ? {
                  ...box,
                  rotation: normalizeRotation(
                    (box.rotation ?? 0) + rotationIncrement,
                  ),
                }
              : box,
          ),
        );
      }

      // Update the last mouse position for the next calculation
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
    };

    const handleMouseUp = () => {
      // Remove the event listeners
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Reset the active rotation element
      setActiveRotationElement(null);
    };

    // Add event listeners to the document
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleUpdateTextPosition = (id: string, x: number, y: number) => {
    setTextBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== id) return box;

        const page = pages.find((p) => p.pageNumber === box.pageNumber);
        if (!page) return { ...box, x, y };

        // Calculate rotated bounding box
        const rotation = (box.rotation ?? 0) % 360;
        const radians = (rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const rotatedWidth = box.width * cos + box.height * sin;
        const rotatedHeight = box.width * sin + box.height * cos;

        // Calculate center point
        const centerX = x + box.width / 2;
        const centerY = y + box.height / 2;

        // Clamp center to keep rotated box within bounds
        const minCenterX = rotatedWidth / 2;
        const maxCenterX = page.width - rotatedWidth / 2;
        const minCenterY = rotatedHeight / 2;
        const maxCenterY = page.height - rotatedHeight / 2;

        const clampedCenterX = Math.min(
          Math.max(centerX, minCenterX),
          maxCenterX,
        );
        const clampedCenterY = Math.min(
          Math.max(centerY, minCenterY),
          maxCenterY,
        );

        // Convert back to top-left position
        const clampedX = clampedCenterX - box.width / 2;
        const clampedY = clampedCenterY - box.height / 2;

        return { ...box, x: clampedX, y: clampedY };
      }),
    );
  };

  const handleResize = (
    id: string,
    width: number,
    height: number,
    x: number,
    y: number,
  ) => {
    setBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== id) return box;

        const page = pages.find((p) => p.pageNumber === box.pageNumber);
        if (!page) return { ...box, width, height, x, y };

        // Ensure minimum size
        const minWidth = 50;
        const minHeight = 30;
        const clampedWidth = Math.max(minWidth, width);
        const clampedHeight = Math.max(minHeight, height);

        // Calculate rotated bounding box with new dimensions
        const rotation = (box.rotation ?? 0) % 360;
        const radians = (rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const rotatedWidth = clampedWidth * cos + clampedHeight * sin;
        const rotatedHeight = clampedWidth * sin + clampedHeight * cos;

        // Calculate center point
        const centerX = x + clampedWidth / 2;
        const centerY = y + clampedHeight / 2;

        // Clamp center to keep rotated box within bounds
        const minCenterX = rotatedWidth / 2;
        const maxCenterX = page.width - rotatedWidth / 2;
        const minCenterY = rotatedHeight / 2;
        const maxCenterY = page.height - rotatedHeight / 2;

        const clampedCenterX = Math.min(
          Math.max(centerX, minCenterX),
          maxCenterX,
        );
        const clampedCenterY = Math.min(
          Math.max(centerY, minCenterY),
          maxCenterY,
        );

        // Convert back to top-left position
        const clampedX = clampedCenterX - clampedWidth / 2;
        const clampedY = clampedCenterY - clampedHeight / 2;

        return {
          ...box,
          width: clampedWidth,
          height: clampedHeight,
          x: clampedX,
          y: clampedY,
        };
      }),
    );
  };

  const handleResizeText = (
    id: string,
    width: number,
    height: number,
    x: number,
    y: number,
  ) => {
    setTextBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== id) return box;

        const page = pages.find((p) => p.pageNumber === box.pageNumber);
        if (!page) return { ...box, width, height, x, y };

        // Ensure minimum size
        const minWidth = 50;
        const minHeight = 30;
        const clampedWidth = Math.max(minWidth, width);
        const clampedHeight = Math.max(minHeight, height);

        // Calculate rotated bounding box with new dimensions
        const rotation = (box.rotation ?? 0) % 360;
        const radians = (rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const rotatedWidth = clampedWidth * cos + clampedHeight * sin;
        const rotatedHeight = clampedWidth * sin + clampedHeight * cos;

        // Calculate center point
        const centerX = x + clampedWidth / 2;
        const centerY = y + clampedHeight / 2;

        // Clamp center to keep rotated box within bounds
        const minCenterX = rotatedWidth / 2;
        const maxCenterX = page.width - rotatedWidth / 2;
        const minCenterY = rotatedHeight / 2;
        const maxCenterY = page.height - rotatedHeight / 2;

        const clampedCenterX = Math.min(
          Math.max(centerX, minCenterX),
          maxCenterX,
        );
        const clampedCenterY = Math.min(
          Math.max(centerY, minCenterY),
          maxCenterY,
        );

        // Convert back to top-left position
        const clampedX = clampedCenterX - clampedWidth / 2;
        const clampedY = clampedCenterY - clampedHeight / 2;

        return {
          ...box,
          width: clampedWidth,
          height: clampedHeight,
          x: clampedX,
          y: clampedY,
        };
      }),
    );
  };

  const handleUpdateTextStyle = (
    id: string,
    updates: Partial<Pick<TextBox, "fontFamily" | "fontSize" | "fontColor">>,
  ) => {
    setTextBoxes((prev) =>
      prev.map((box) => (box.id === id ? { ...box, ...updates } : box)),
    );
  };

  const handleRemove = (id: string) => {
    const boxToRemove = boxes.find((b) => b.id === id);

    if (!boxToRemove) return;

    // Check if it's an existing placeholder and if user has permission to delete
    if (boxToRemove.isExisting && !hasDepartmentPermission) {
      toast.error(
        "Only members of the document's department can delete existing placeholders.",
      );
      return;
    }

    // Remove from UI
    setBoxes((prev) => prev.filter((box) => box.id !== id));
  };

  const handleRemoveText = (id: string) => {
    const textboxToRemove = textBoxes.find((b) => b.id === id);

    if (!textboxToRemove) return;

    // Check if it's an existing placeholder and if user has permission to delete
    if (textboxToRemove.isExisting && !hasDepartmentPermission) {
      toast.error(
        "Only members of the document's department can delete existing placeholders.",
      );
      return;
    }

    // Remove from UI
    setTextBoxes((prev) => prev.filter((box) => box.id !== id));
  };

  const handleConfirm = () => {
    if (!selectedFileId) {
      toast.error(
        "No PDF file selected. Please select a PDF file before confirming signature positions.",
      );
      console.error("No file selected for signature.");
      return;
    }

    const newBoxes = boxes.filter((box) => !box.isExisting);
    const newTextBoxes = textBoxes.filter((box) => !box.isExisting);
    const hasUnassignedDepartments = [...newBoxes, ...newTextBoxes].some(
      (box) => !box.assignedDepartmentIds?.length,
    );
    if (hasUnassignedDepartments) {
      toast.error(
        "Assign at least one department to each new placeholder before confirming.",
      );
      return;
    }
    if (newBoxes.length === 0 && newTextBoxes.length === 0) {
      toast.error(
        "No new placeholders added. Please add at least one signature or text placeholder before confirming.",
      );
      return;
    }

    const targets = normalizedTargetFileIds.length
      ? normalizedTargetFileIds
      : [selectedFileId];
    const pageScales = pages.reduce(
      (acc, page) => {
        const scaleX = page.pdfWidth ? page.width / page.pdfWidth : 1;
        const scaleY = page.pdfHeight ? page.height / page.pdfHeight : 1;
        acc[page.pageNumber] = { scaleX, scaleY };
        return acc;
      },
      {} as Record<number, { scaleX: number; scaleY: number }>,
    );
    onConfirm({
      fileId: selectedFileId,
      boxes: newBoxes,
      textBoxes: newTextBoxes,
      targetFileIds: targets.filter(Boolean) as string[],
      pageScales,
    });
  };

  if (isLoadingFiles) {
    return (
      <Card className="h-full w-full min-h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Prepare Signature Positions</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!pdfFiles.length) {
    return (
      <Card className="h-full w-full min-h-[300px] flex flex-col">
        <CardHeader>
          <CardTitle>Prepare Signature Positions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-md border border-dashed border-destructive/60 bg-destructive/10 text-sm text-destructive">
            This document does not have any PDF files. Upload a PDF file first
            to place signature boxes.
          </div>
          <Button variant="outline" size="sm" onClick={onExit}>
            Go back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activePageData = pages.find((p) => p.pageNumber === activePage);
  const applyingToCount = normalizedTargetFileIds.length || 1;
  const selectedDepartmentCount = selectedDepartmentIds.length;
  const isRedirecting =
    allowedDepartmentIds.length > 0 &&
    (isLoadingFiles || isRendering || pages.length === 0);

  return (
    <Card className="h-full w-full min-h-[600px] flex flex-col border-primary/40">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Prepare Signature Positions
            <Badge variant="outline">For Signature</Badge>
            {isRedirecting ? (
              <span className="ml-2 flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Redirecting...
              </span>
            ) : applyingToCount > 1 ? (
              <Badge variant="secondary">{applyingToCount} files</Badge>
            ) : null}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Add signature and text placeholders on the PDF. These positions will
            be used when processing the document for signature.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onExit}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={
              (boxes.length === 0 && textBoxes.length === 0) ||
              isRendering ||
              isConfirming ||
              isRedirecting
            }
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : isRendering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rendering PDF...
              </>
            ) : (
              "Confirm Placeholders"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              File
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded border bg-background px-2 text-xs flex justify-between items-center w-48"
                >
                  <span className="truncate max-w-[100px]">
                    {selectedFile?.name || "Select file"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 max-h-64 overflow-y-auto"
              >
                {selectableFiles.map((file) => (
                  <DropdownMenuItem
                    key={file.id}
                    onSelect={() => setSelectedFileId(file.id)}
                    className="cursor-pointer"
                  >
                    {file.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Page
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded border bg-background px-2 text-xs flex justify-between items-center w-24"
                >
                  <span>
                    {activePage} of {pages.length}
                  </span>
                  <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-64 overflow-y-auto"
              >
                {pages.map((page) => (
                  <DropdownMenuItem
                    key={page.pageNumber}
                    onSelect={() => setActivePage(page.pageNumber)}
                    className="cursor-pointer"
                  >
                    Page {page.pageNumber} of {pages.length}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto rounded-md bg-muted/20 min-h-[300px] pt-10">
            {isRendering || !activePageData ? (
              <div className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading PDF page...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center min-w-full overflow-visible">
                <div
                  className={cn(
                    "relative overflow-visible",
                    placementMode && "cursor-crosshair",
                  )}
                  style={{
                    width: activePageData.width,
                    height: activePageData.height,
                  }}
                  onClick={handlePlaceBox}
                >
                  <img
                    src={activePageData.imageUrl}
                    alt={`Page ${activePageData.pageNumber}`}
                    className="h-full w-full object-fill rounded-md border  border-red-500 bg-black"
                    style={{
                      width: activePageData.width,
                      height: activePageData.height,
                    }}
                  />

                  {boxesWithIndices
                    .filter(({ box }) => box.pageNumber === activePage)
                    .map(({ box, index }) => (
                      <Rnd
                        key={box.id}
                        size={{ width: box.width, height: box.height }}
                        position={{ x: box.x, y: box.y }}
                        minWidth={50}
                        minHeight={30}
                        disableDragging={
                          !hasDepartmentPermission && box.isExisting
                        }
                        enableResizing={
                          !hasDepartmentPermission && box.isExisting
                            ? false
                            : {
                                top: true,
                                right: true,
                                bottom: true,
                                left: true,
                                topRight: true,
                                topLeft: true,
                                bottomRight: true,
                                bottomLeft: true,
                              }
                        }
                        dragHandleClassName="signature-box-drag-handle"
                        onDragStop={(_, data) =>
                          handleUpdatePosition(box.id, data.x, data.y)
                        }
                        onResizeStop={(_, _dir, ref, _delta, position) => {
                          handleResize(
                            box.id,
                            ref.offsetWidth,
                            ref.offsetHeight,
                            position.x,
                            position.y,
                          );
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event: { stopPropagation: () => any }) =>
                          event.stopPropagation()
                        }
                        className="absolute overflow-visible"
                        style={{ zIndex: 1000 }}
                      >
                        <div
                          className="relative h-full w-full"
                          style={{
                            transform: `rotate(${box.rotation ?? 0}deg)`,
                            transformOrigin: "center",
                          }}
                        >
                          <div
                            className={cn(
                              "absolute inset-0 rounded-md border-2 shadow-sm",
                              box.isExisting
                                ? "border-emerald-500/70 bg-emerald-500/10"
                                : "border-primary/70 bg-primary/10",
                            )}
                          />
                          {!box.isExisting && (
                            <div className="signature-box-drag-handle !z-[1000] absolute -left-1 -top-8 cursor-pointer flex items-center gap-1 rounded-full border border-muted/50 bg-white/90 px-2 py-0.5 text-[10px] text-muted-foreground">
                              <Move className="h-3 w-3" />
                              Drag to position
                              <button
                                type="button"
                                className="rounded-full border border-muted/50 bg-white/90 p-1 text-muted-foreground hover:text-foreground"
                                onMouseDown={(event) => {
                                  event.stopPropagation();
                                  startMouseRotation(box.id, false, event);
                                }}
                                aria-label="Drag to rotate signature placeholder"
                              >
                                <RotateCw className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <div className="flex h-full w-full items-center justify-center text-[11px] font-medium text-primary">
                            {box.isExisting
                              ? `Existing Signature #${index}`
                              : "Signature"}
                          </div>
                          {!box.isExisting && (
                            <button
                              type="button"
                              className="absolute -right-2 -top-2 z-[1001] rounded-full bg-white p-1 text-destructive shadow"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRemove(box.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </Rnd>
                    ))}

                  {textBoxesWithIndices
                    .filter(({ box }) => box.pageNumber === activePage)
                    .map(({ box, index }) => (
                      <Rnd
                        key={box.id}
                        size={{ width: box.width, height: box.height }}
                        position={{ x: box.x, y: box.y }}
                        minWidth={60}
                        minHeight={30}
                        disableDragging={
                          !hasDepartmentPermission && box.isExisting
                        }
                        enableResizing={
                          !hasDepartmentPermission && box.isExisting
                            ? false
                            : {
                                top: true,
                                right: true,
                                bottom: true,
                                left: true,
                                topRight: true,
                                topLeft: true,
                                bottomRight: true,
                                bottomLeft: true,
                              }
                        }
                        dragHandleClassName="text-box-drag-handle"
                        onDragStop={(_, data) =>
                          handleUpdateTextPosition(box.id, data.x, data.y)
                        }
                        onResizeStop={(_, _dir, ref, _delta, position) => {
                          handleResizeText(
                            box.id,
                            ref.offsetWidth,
                            ref.offsetHeight,
                            position.x,
                            position.y,
                          );
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event: { stopPropagation: () => any }) =>
                          event.stopPropagation()
                        }
                        className={cn(
                          "absolute rounded-md border-2 border-dashed shadow-sm bg-transparent overflow-visible",
                          box.isExisting
                            ? "border-amber-500/70"
                            : "border-amber-500/80",
                        )}
                        style={{ zIndex: 1000 }}
                      >
                        <div
                          className="relative h-full w-full"
                          style={{
                            transform: `rotate(${box.rotation ?? 0}deg)`,
                            transformOrigin: "center",
                          }}
                        >
                          {!box.isExisting && (
                            <div className="text-box-drag-handle absolute -left-1 -top-8 cursor-pointer flex items-center gap-1 rounded-full border border-muted/50 bg-white/90 px-2 py-0.5 text-[10px] text-muted-foreground">
                              <Move className="h-3 w-3" />
                              Drag text
                              <button
                                type="button"
                                className="rounded-full border border-muted/50 bg-white/90 p-1 text-muted-foreground hover:text-foreground"
                                onMouseDown={(event) => {
                                  event.stopPropagation();
                                  startMouseRotation(box.id, true, event);
                                }}
                                aria-label="Drag to rotate text placeholder"
                              >
                                <RotateCw className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          <div
                            className="flex h-full w-full items-center justify-center text-center px-1"
                            style={{
                              fontFamily: box.fontFamily,
                              fontSize: box.fontSize,
                              color: box.fontColor,
                            }}
                          >
                            {box.isExisting
                              ? `Text Placeholder #${index}`
                              : box.text?.trim() || "Text"}
                          </div>
                          {!box.isExisting && (
                            <button
                              type="button"
                              className="absolute -right-2 -top-2 z-[1001] rounded-full bg-white p-1 text-destructive shadow"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRemoveText(box.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </Rnd>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full md:w-72 flex flex-col gap-3">
            <div className="rounded-md border bg-background p-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Department</span>
                {loadingDepartments && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <div className="rounded-md border border-input p-3 space-y-3 max-h-64 overflow-auto">
                  {loadingDepartments ? (
                    <div className="text-xs text-muted-foreground">
                      Loading options...
                    </div>
                  ) : filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => {
                      const groupDepartmentIds = getGroupDepartmentIds(group);
                      const groupChecked =
                        groupDepartmentIds.length > 0 &&
                        groupDepartmentIds.every((id) =>
                          selectedDepartmentIds.includes(id),
                        );
                      const groupIndeterminate =
                        !groupChecked &&
                        groupDepartmentIds.some((id) =>
                          selectedDepartmentIds.includes(id),
                        );

                      return (
                        <div key={group.group_id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={
                                groupChecked
                                  ? true
                                  : groupIndeterminate
                                    ? "indeterminate"
                                    : false
                              }
                              onCheckedChange={(checked) =>
                                toggleSelection(
                                  groupDepartmentIds,
                                  checked === true,
                                )
                              }
                            />
                            <span className="text-sm font-semibold">
                              Group: {group.name}
                            </span>
                          </div>

                          {group.centers.length > 0 && (
                            <div className="space-y-2 pl-6">
                              <div className="text-[11px] uppercase text-muted-foreground">
                                Center:
                              </div>
                              {group.centers.map((center) => {
                                const centerDepartmentIds =
                                  getCenterDepartmentIds(center);
                                const centerChecked =
                                  centerDepartmentIds.length > 0 &&
                                  centerDepartmentIds.every((id) =>
                                    selectedDepartmentIds.includes(id),
                                  );
                                const centerIndeterminate =
                                  !centerChecked &&
                                  centerDepartmentIds.some((id) =>
                                    selectedDepartmentIds.includes(id),
                                  );
                                return (
                                  <div
                                    key={center.center_id}
                                    className="space-y-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={
                                          centerChecked
                                            ? true
                                            : centerIndeterminate
                                              ? "indeterminate"
                                              : false
                                        }
                                        onCheckedChange={(checked) =>
                                          toggleSelection(
                                            centerDepartmentIds,
                                            checked === true,
                                          )
                                        }
                                      />
                                      <span className="text-sm font-medium">
                                        {center.name}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 pl-6">
                                      <div className="text-[11px] uppercase text-muted-foreground">
                                        Offices/Department:
                                      </div>
                                      {center.departments.map((dept) => (
                                        <label
                                          key={dept.department_id}
                                          className="flex items-center gap-2 text-sm"
                                        >
                                          <Checkbox
                                            checked={selectedDepartmentIds.includes(
                                              dept.department_id,
                                            )}
                                            onCheckedChange={(checked) =>
                                              toggleSelection(
                                                [dept.department_id],
                                                checked === true,
                                              )
                                            }
                                          />
                                          {dept.name}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {group.departments.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 pl-6">
                              <div className="text-[11px] uppercase text-muted-foreground">
                                Offices/Department:
                              </div>
                              {group.departments.map((dept) => (
                                <label
                                  key={dept.department_id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <Checkbox
                                    checked={selectedDepartmentIds.includes(
                                      dept.department_id,
                                    )}
                                    onCheckedChange={(checked) =>
                                      toggleSelection(
                                        [dept.department_id],
                                        checked === true,
                                      )
                                    }
                                  />
                                  {dept.name}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No groups available
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedDepartmentCount > 0
                  ? `Selected ${selectedDepartmentCount} department${
                      selectedDepartmentCount === 1 ? "" : "s"
                    }. New placeholders will be assigned to these departments.`
                  : "Select departments to assign new placeholders."}
              </p>
            </div>

            <div className="rounded-md border bg-background p-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Signature Boxes</span>
                <Badge variant="outline">{boxes.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Add one or more boxes where signers need to sign. You can drag
                and resize them on the page.
              </p>
              {placementMode === "signature" && (
                <p className="text-xs text-primary">
                  Click on the page to place the signature box.
                </p>
              )}
              <Button
                type="button"
                size="sm"
                className="mt-1 w-full"
                variant="outline"
                onClick={handleAddBox}
                disabled={
                  isRendering || !pages.length || !selectedDepartmentIds.length
                }
              >
                {placementMode === "signature"
                  ? "Cancel Placement"
                  : "Add Signature Box"}
              </Button>
            </div>

            <div className="rounded-md border bg-background p-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Text Boxes</span>
                <Badge variant="outline">{textBoxes.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Add text placeholders with custom font, size, and color. Text
                stays centered with no background.
              </p>
              {placementMode === "text" && (
                <p className="text-xs text-primary">
                  Click on the page to place the text box.
                </p>
              )}
              <Button
                type="button"
                size="sm"
                className="mt-1 w-full"
                variant="outline"
                onClick={handleAddTextBox}
                disabled={
                  isRendering || !pages.length || !selectedDepartmentIds.length
                }
              >
                {placementMode === "text" ? "Cancel Placement" : "Add Text Box"}
              </Button>
            </div>

            <div className="rounded-md border bg-background p-3 text-xs space-y-2 max-h-[100dvh] overflow-auto">
              {boxes.length === 0 && textBoxes.length === 0 ? (
                <p className="text-muted-foreground">
                  No placeholders yet. Use the buttons above to add signature or
                  text boxes.
                </p>
              ) : (
                <>
                  {boxesWithIndices.map(({ box, index }) => (
                    <div
                      key={box.id}
                      className="flex flex-col gap-2 rounded border p-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {box.isExisting
                            ? `Existing Signature #${index} (Page ${box.pageNumber})`
                            : `Signature ${index} (Page ${box.pageNumber})`}
                        </p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleRemove(box.id)}
                          disabled={box.isExisting && !hasDepartmentPermission}
                          title={
                            box.isExisting && !hasDepartmentPermission
                              ? "Only department members can delete existing placeholders"
                              : undefined
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Assigned to:{" "}
                        {box.assignedDepartmentIds?.length
                          ? box.assignedDepartmentIds
                              .map(
                                (id) => departmentNameById.get(id) || "Unknown",
                              )
                              .join(", ")
                          : box.assignedUserId
                            ? "Legacy user assignment"
                            : "Open"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">
                            X
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.x)}
                            onChange={(e) =>
                              handleUpdatePosition(
                                box.id,
                                Number(e.target.value),
                                box.y,
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Y
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.y)}
                            onChange={(e) =>
                              handleUpdatePosition(
                                box.id,
                                box.x,
                                Number(e.target.value),
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Width
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.width)}
                            min="50"
                            onChange={(e) => {
                              const value = Math.max(
                                50,
                                Number(e.target.value),
                              );
                              handleResize(
                                box.id,
                                value,
                                box.height,
                                box.x,
                                box.y,
                              );
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Height
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.height)}
                            min="30"
                            onChange={(e) => {
                              const value = Math.max(
                                30,
                                Number(e.target.value),
                              );
                              handleResize(
                                box.id,
                                box.width,
                                value,
                                box.x,
                                box.y,
                              );
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">
                            Rotation (degrees)
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.rotation ?? 0)}
                            step="5"
                            disabled={
                              box.isExisting && !hasDepartmentPermission
                            }
                            onChange={(e) =>
                              handleUpdateRotation(
                                box.id,
                                Number(e.target.value),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {textBoxesWithIndices.map(({ box, index }) => (
                    <div
                      key={box.id}
                      className="flex flex-col gap-2 rounded border p-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {box.isExisting
                            ? `Existing Text #${index} (Page ${box.pageNumber})`
                            : `Text ${index} (Page ${box.pageNumber})`}
                        </p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleRemoveText(box.id)}
                          disabled={box.isExisting && !hasDepartmentPermission}
                          title={
                            box.isExisting && !hasDepartmentPermission
                              ? "Only department members can delete existing placeholders"
                              : undefined
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Assigned to:{" "}
                        {box.assignedDepartmentIds?.length
                          ? box.assignedDepartmentIds
                              .map(
                                (id) => departmentNameById.get(id) || "Unknown",
                              )
                              .join(", ")
                          : box.assignedUserId
                            ? "Legacy user assignment"
                            : "Open"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">
                            X
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.x)}
                            onChange={(e) =>
                              handleUpdateTextPosition(
                                box.id,
                                Number(e.target.value),
                                box.y,
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Y
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.y)}
                            onChange={(e) =>
                              handleUpdateTextPosition(
                                box.id,
                                box.x,
                                Number(e.target.value),
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Width
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.width)}
                            min="60"
                            onChange={(e) => {
                              const value = Math.max(
                                60,
                                Number(e.target.value),
                              );
                              handleResizeText(
                                box.id,
                                value,
                                box.height,
                                box.x,
                                box.y,
                              );
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Height
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.height)}
                            min="30"
                            onChange={(e) => {
                              const value = Math.max(
                                30,
                                Number(e.target.value),
                              );
                              handleResizeText(
                                box.id,
                                box.width,
                                value,
                                box.x,
                                box.y,
                              );
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Font
                          </label>
                          <select
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={box.fontFamily}
                            onChange={(e) =>
                              handleUpdateTextStyle(box.id, {
                                fontFamily: e.target.value,
                              })
                            }
                          >
                            {TEXT_FONT_OPTIONS.map((font) => (
                              <option key={font} value={font}>
                                {font}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Size
                          </label>
                          <input
                            type="number"
                            className="w-full rounded border bg-background px-2 py-1 text-xs"
                            value={Math.round(box.fontSize)}
                            min="8"
                            onChange={(e) => {
                              const value = Math.max(8, Number(e.target.value));
                              handleUpdateTextStyle(box.id, {
                                fontSize: value,
                              });
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">
                            Color
                          </label>
                          <input
                            type="color"
                            className="h-8 w-full rounded border bg-background px-1 py-1 text-xs"
                            value={box.fontColor}
                            onChange={(e) =>
                              handleUpdateTextStyle(box.id, {
                                fontColor: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
