"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";
import { useQuery } from "@tanstack/react-query";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DocumentFileMetadata } from "@/hooks/use-document-files";
import { cn } from "@/lib/utils";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { SignatureModal } from "@/components/modals/signature-modal";
import { TextPlaceholderModal } from "@/components/modals/text-placeholder-modal";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/components/providers/providers";

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

export interface SignaturePlaceholder {
  placeholder_id: string;
  document_id: string;
  document_file_id: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  page_number: number;
  assigned_user_id?: string | null;
  department_id?: string | null;
}

export interface TextPlaceholder {
  placeholder_id: string;
  document_id: string;
  document_file_id: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  page_number: number;
  font_family: string;
  font_size: number;
  font_color: string;
  text_value?: string | null;
  assigned_user_id?: string | null;
  department_id?: string | null;
}

interface SigningPdfViewerProps {
  documentId: string;
  files: DocumentFileMetadata[];
  initialFileId?: string | null;
  isLoadingFiles: boolean;
  onExit: () => void;
  onSigned: () => void;
  returnPath?: string; // Optional path to navigate after signing
}

const dataUrlToUint8Array = (dataUrl: string) => {
  const parts = dataUrl.split(",");
  const base64 = parts[1] ?? "";
  const byteString = atob(base64);
  const buffer = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) {
    buffer[i] = byteString.charCodeAt(i);
  }
  return buffer;
};

const resolvePdfFont = (fontFamily?: string) => {
  const normalized = (fontFamily || "").toLowerCase();
  if (normalized.includes("courier")) return StandardFonts.Courier;
  if (normalized.includes("times") || normalized.includes("georgia")) {
    return StandardFonts.TimesRoman;
  }
  return StandardFonts.Helvetica;
};

const hexToRgb = (value?: string) => {
  const cleaned = (value || "").replace("#", "");
  if (!cleaned) {
    return { r: 17, g: 24, b: 39 };
  }
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : cleaned.padEnd(6, "0");
  const intValue = Number.parseInt(normalized.slice(0, 6), 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

const normalizeTextValue = (value?: string | null) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return trimmed;
};

const isPdfLikeFile = (file?: DocumentFileMetadata | null) => {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  if (type.includes("pdf")) return true;
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".pdf");
};

const parseVersion = (value?: string | null) => {
  if (!value) return null;
  const parts = value.split(".").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  return parts;
};

const compareDocumentFilesByVersionDesc = (
  left: DocumentFileMetadata,
  right: DocumentFileMetadata,
) => {
  const leftParts = parseVersion(left.version);
  const rightParts = parseVersion(right.version);

  if (leftParts && rightParts) {
    const length = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < length; index += 1) {
      const leftValue = leftParts[index] ?? 0;
      const rightValue = rightParts[index] ?? 0;
      if (leftValue !== rightValue) {
        return rightValue - leftValue;
      }
    }
  } else if (leftParts) {
    return -1;
  } else if (rightParts) {
    return 1;
  }

  const leftDate = left.uploadDate ? new Date(left.uploadDate).getTime() : 0;
  const rightDate = right.uploadDate ? new Date(right.uploadDate).getTime() : 0;
  if (leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  return left.name.localeCompare(right.name);
};

export function SigningPdfViewer({
  documentId,
  files,
  initialFileId,
  isLoadingFiles,
  onExit,
  onSigned,
  returnPath,
}: SigningPdfViewerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const signeeId = user?.user_id || user?.id;
  const currentDepartmentId =
    (user as { department_id?: string })?.department_id ||
    (user as { department?: { department_id?: string } })?.department
      ?.department_id ||
    null;
  const { socket } = useSocket();
  const [presence, setPresence] = useState<
    Array<{ userId: string; name: string; departmentId?: string | null }>
  >([]);
  const [remoteSignatureDrafts, setRemoteSignatureDrafts] = useState<
    Record<string, { dataUrl: string; userId: string }>
  >({});
  const [remoteTextDrafts, setRemoteTextDrafts] = useState<
    Record<string, { text: string; userId: string }>
  >({});
  const signatureDraftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textDraftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAssignedToCurrentUser = useCallback(
    (assignedUserId?: string | null, departmentId?: string | null) =>
      assignedUserId === signeeId ||
      (!assignedUserId &&
        (!departmentId || departmentId === currentDepartmentId)),
    [currentDepartmentId, signeeId],
  );
  const pdfFiles = useMemo(
    () => files.filter((file) => isPdfLikeFile(file)),
    [files],
  );
  const sortedPdfFiles = useMemo(
    () => [...pdfFiles].sort(compareDocumentFilesByVersionDesc),
    [pdfFiles],
  );

  // Fetch placeholders
  const { data: placeholders = [], isLoading: isLoadingPlaceholders } =
    useQuery({
      queryKey: ["signature-placeholders", documentId],
      queryFn: async () => {
        const response = await fetch(
          `/api/document-signatures/documents/${documentId}/signature-placeholders`,
        );
        if (!response.ok)
          throw new Error("Failed to fetch signature placeholders");
        return response.json() as Promise<SignaturePlaceholder[]>;
      },
      enabled: !!documentId,
    });

  const {
    data: textPlaceholders = [],
    isLoading: isLoadingTextPlaceholders,
    refetch: refetchTextPlaceholders,
  } = useQuery({
    queryKey: ["text-placeholders", documentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/document-texts/documents/${documentId}/text-placeholders`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch text placeholders");
      }
      return response.json() as Promise<TextPlaceholder[]>;
    },
    enabled: !!documentId,
  });

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    initialFileId ?? sortedPdfFiles[0]?.id ?? null,
  );

  // Group files by signature placeholder positions
  const groupedFiles = useMemo(() => {
    const groups: Array<{
      id: string;
      name: string;
      files: DocumentFileMetadata[];
      placeholderPositions: Array<{
        page_number: number;
        x_position: number;
        y_position: number;
        width: number;
        height: number;
      }>;
    }> = [];

    const processedFiles = new Set<string>();

    for (const file of sortedPdfFiles) {
      if (processedFiles.has(file.id)) continue;

      // Get placeholders for this file
      const filePlaceholders = placeholders.filter(
        (p) => p.document_file_id === file.id,
      );

      // Look for other files with similar placeholders
      const similarFiles = [file];
      processedFiles.add(file.id);

      for (const otherFile of sortedPdfFiles) {
        if (otherFile.id === file.id || processedFiles.has(otherFile.id))
          continue;

        const otherPlaceholders = placeholders.filter(
          (p) => p.document_file_id === otherFile.id,
        );

        // Compare if placeholders have similar positions
        if (filePlaceholders.length === otherPlaceholders.length) {
          let isSimilar = true;

          // Sort placeholders by position for comparison
          const sortedFilePlaceholders = [...filePlaceholders].sort(
            (a, b) =>
              a.page_number - b.page_number ||
              a.x_position - b.x_position ||
              a.y_position - b.y_position,
          );

          const sortedOtherPlaceholders = [...otherPlaceholders].sort(
            (a, b) =>
              a.page_number - b.page_number ||
              a.x_position - b.x_position ||
              a.y_position - b.y_position,
          );

          for (let i = 0; i < sortedFilePlaceholders.length; i++) {
            const fp = sortedFilePlaceholders[i];
            const op = sortedOtherPlaceholders[i];

            // Check if positions are similar (with a small tolerance)
            const EPSILON = 2; // Tolerance for position similarity

            if (
              fp.page_number !== op.page_number ||
              Math.abs(fp.x_position - op.x_position) > EPSILON ||
              Math.abs(fp.y_position - op.y_position) > EPSILON ||
              Math.abs(fp.width - op.width) > EPSILON ||
              Math.abs(fp.height - op.height) > EPSILON
            ) {
              isSimilar = false;
              break;
            }
          }

          if (isSimilar) {
            similarFiles.push(otherFile);
            processedFiles.add(otherFile.id);
          }
        }
      }

      // Create a group for similar files
      if (similarFiles.length > 0) {
        const firstFilePlaceholders = placeholders.filter(
          (p) => p.document_file_id === similarFiles[0].id,
        );

        const placeholderPositions = firstFilePlaceholders.map((p) => ({
          page_number: p.page_number,
          x_position: p.x_position,
          y_position: p.y_position,
          width: p.width,
          height: p.height,
        }));

        groups.push({
          id: `group-${groups.length + 1}`,
          name:
            similarFiles.length === 1
              ? similarFiles[0].name
              : `${similarFiles[0].name} and ${similarFiles.length - 1} other${similarFiles.length > 2 ? "s" : ""}`,
          files: similarFiles,
          placeholderPositions,
        });
      }
    }

    return groups;
  }, [sortedPdfFiles, placeholders]);

  useEffect(() => {
    if (!sortedPdfFiles.length) {
      setSelectedFileIds([]);
      return;
    }
    setSelectedFileIds((prev) => {
      const allowed = new Set(sortedPdfFiles.map((file) => file.id));
      const next = prev.filter((id) => allowed.has(id));
      return next.length > 0 ? next : sortedPdfFiles.map((file) => file.id);
    });
  }, [sortedPdfFiles]);

  const selectableFiles = useMemo(() => {
    if (!selectedFileIds.length) return sortedPdfFiles;
    const selectedSet = new Set(selectedFileIds);
    return sortedPdfFiles.filter((file) => selectedSet.has(file.id));
  }, [selectedFileIds, sortedPdfFiles]);

  const selectedFile = useMemo(() => {
    if (!selectableFiles || selectableFiles.length === 0) return null;
    const targetId = selectedFileId ?? selectableFiles[0]?.id ?? null;
    return targetId
      ? selectableFiles.find((file) => file.id === targetId)
      : null;
  }, [selectableFiles, selectedFileId]);
  const roomKey = selectedFile?.id
    ? `document-${documentId}:file-${selectedFile.id}`
    : null;

  useEffect(() => {
    if (!selectableFiles.length) {
      if (selectedFileId !== null) {
        setSelectedFileId(null);
      }
      return;
    }

    const hasSelected = selectedFileId
      ? selectableFiles.some((file) => file.id === selectedFileId)
      : false;

    if (hasSelected) return;

    const hasInitial = initialFileId
      ? selectableFiles.some((file) => file.id === initialFileId)
      : false;
    const nextId = hasInitial
      ? initialFileId
      : (selectableFiles[0]?.id ?? null);

    if (nextId && nextId !== selectedFileId) {
      setSelectedFileId(nextId);
    }
  }, [initialFileId, selectedFileId, selectableFiles]);

  const [pages, setPages] = useState<PdfPageRender[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [isRendering, setIsRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Signature state
  const [selectedPlaceholder, setSelectedPlaceholder] =
    useState<SignaturePlaceholder | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [placedSignatures, setPlacedSignatures] = useState<
    Record<string, string>
  >({});
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [selectedTextPlaceholder, setSelectedTextPlaceholder] =
    useState<TextPlaceholder | null>(null);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [shouldNavigateAfterSuccess, setShouldNavigateAfterSuccess] =
    useState(false);

  const RENDER_SCALE = 1.2;

  const handleSelectAllFiles = () => {
    setSelectedFileIds(sortedPdfFiles.map((file) => file.id));
  };

  const handleDeselectAllFiles = () => {
    setSelectedFileIds([]);
  };

  const handleToggleFileSelection = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const isSelected = prev.includes(fileId);
      const next = isSelected
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId];
      const nextIds = next.length > 0 ? next : prev;
      if (selectedFileId && !nextIds.includes(selectedFileId)) {
        setSelectedFileId(nextIds[0] ?? null);
      }
      if (!selectedFileId && nextIds.length > 0) {
        setSelectedFileId(nextIds[0]);
      }
      return nextIds;
    });
  };

  // Handle navigation after success modal is closed
  useEffect(() => {
    if (!isSuccessModalOpen && shouldNavigateAfterSuccess) {
      setShouldNavigateAfterSuccess(false);

      // If returnPath is provided, navigate there; otherwise call onSigned callback
      if (returnPath) {
        router.push(returnPath);
      } else {
        onSigned();
      }
    }
  }, [
    isSuccessModalOpen,
    shouldNavigateAfterSuccess,
    onSigned,
    returnPath,
    router,
  ]);

  // Fetch placeholders
  const { data: signatures = [], refetch: refetchSignatures } = useQuery({
    queryKey: ["document-signatures", documentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/document-signatures/documents/${documentId}/signatures`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch signatures");
      }
      return response.json() as Promise<
        Array<{
          document_file_id?: string;
          documentFileFile_id?: string;
          documentFile?: { file_id?: string };
          page_number: number;
          x_position: number;
          y_position: number;
          width: number;
          height: number;
          signature_data?: string | null;
        }>
      >;
    },
    enabled: !!documentId,
  });

  useEffect(() => {
    if (!socket || !roomKey) return;
    socket.emit("signature:join-room", {
      documentId,
      fileId: selectedFileId,
    });
    setRemoteSignatureDrafts({});
    setRemoteTextDrafts({});
    setPresence([]);

    return () => {
      socket.emit("signature:leave-room", {
        documentId,
        fileId: selectedFileId,
      });
    };
  }, [documentId, roomKey, selectedFileId, socket]);

  useEffect(() => {
    if (!socket) return;

    const handlePresence = (data: {
      room: string;
      members: Array<{
        userId: string;
        name: string;
        departmentId?: string | null;
      }>;
    }) => {
      if (data.room !== roomKey) return;
      setPresence(data.members);
    };

    const handleSignatureDraft = (data: {
      room: string;
      documentId: string;
      fileId: string;
      placeholderId: string;
      userId: string;
      signatureData: string | null;
    }) => {
      if (data.room !== roomKey) return;
      if (!data.placeholderId) return;
      if (data.userId === signeeId) return;
      setRemoteSignatureDrafts((prev) => {
        const next = { ...prev };
        if (!data.signatureData) {
          delete next[data.placeholderId];
          return next;
        }
        next[data.placeholderId] = {
          dataUrl: data.signatureData,
          userId: data.userId,
        };
        return next;
      });
    };

    const handleTextDraft = (data: {
      room: string;
      documentId: string;
      fileId: string;
      placeholderId: string;
      userId: string;
      text: string | null;
    }) => {
      if (data.room !== roomKey) return;
      if (!data.placeholderId) return;
      if (data.userId === signeeId) return;
      setRemoteTextDrafts((prev) => {
        const next = { ...prev };
        if (!data.text) {
          delete next[data.placeholderId];
          return next;
        }
        next[data.placeholderId] = {
          text: data.text,
          userId: data.userId,
        };
        return next;
      });
    };

    const handleSaveEvent = (data: {
      room: string;
      documentId: string;
      fileId: string;
      userId: string;
      placeholderIds?: string[];
      textPlaceholderIds?: string[];
    }) => {
      if (data.room !== roomKey) return;
      if (data.userId === signeeId) return;
      if (data.placeholderIds?.length) {
        setRemoteSignatureDrafts((prev) => {
          const next = { ...prev };
          data.placeholderIds?.forEach((id) => delete next[id]);
          return next;
        });
      }
      if (data.textPlaceholderIds?.length) {
        setRemoteTextDrafts((prev) => {
          const next = { ...prev };
          data.textPlaceholderIds?.forEach((id) => delete next[id]);
          return next;
        });
      }
      void Promise.all([refetchSignatures(), refetchTextPlaceholders()]);
    };

    socket.on("signature:presence", handlePresence);
    socket.on("signature:draft:update", handleSignatureDraft);
    socket.on("text:draft:update", handleTextDraft);
    socket.on("signature:save", handleSaveEvent);

    return () => {
      socket.off("signature:presence", handlePresence);
      socket.off("signature:draft:update", handleSignatureDraft);
      socket.off("text:draft:update", handleTextDraft);
      socket.off("signature:save", handleSaveEvent);
    };
  }, [refetchSignatures, refetchTextPlaceholders, roomKey, signeeId, socket]);

  const findMatchingPlaceholders = useMemo(() => {
    const EPSILON = 0.5;
    return (
      source: SignaturePlaceholder,
      targetFileIds: string[],
    ): SignaturePlaceholder[] => {
      return placeholders.filter((placeholder) => {
        if (!targetFileIds.includes(placeholder.document_file_id)) return false;
        if (placeholder.page_number !== source.page_number) return false;
        if (
          placeholder.assigned_user_id !== source.assigned_user_id ||
          !isAssignedToCurrentUser(
            placeholder.assigned_user_id,
            placeholder.department_id,
          )
        ) {
          return false;
        }
        return (
          Math.abs(placeholder.x_position - source.x_position) <= EPSILON &&
          Math.abs(placeholder.y_position - source.y_position) <= EPSILON &&
          Math.abs(placeholder.width - source.width) <= EPSILON &&
          Math.abs(placeholder.height - source.height) <= EPSILON
        );
      });
    };
  }, [isAssignedToCurrentUser, placeholders]);

  const findMatchingTextPlaceholders = useMemo(() => {
    const EPSILON = 0.5;
    return (
      source: TextPlaceholder,
      targetFileIds: string[],
    ): TextPlaceholder[] => {
      return textPlaceholders.filter((placeholder) => {
        if (!targetFileIds.includes(placeholder.document_file_id)) return false;
        if (placeholder.page_number !== source.page_number) return false;
        if (
          placeholder.assigned_user_id !== source.assigned_user_id ||
          !isAssignedToCurrentUser(
            placeholder.assigned_user_id,
            placeholder.department_id,
          )
        ) {
          return false;
        }
        return (
          Math.abs(placeholder.x_position - source.x_position) <= EPSILON &&
          Math.abs(placeholder.y_position - source.y_position) <= EPSILON &&
          Math.abs(placeholder.width - source.width) <= EPSILON &&
          Math.abs(placeholder.height - source.height) <= EPSILON
        );
      });
    };
  }, [isAssignedToCurrentUser, textPlaceholders]);

  // Filter placeholders for the selected file
  const filePlaceholders = useMemo(() => {
    if (!selectedFileId) return [];
    return placeholders.filter((p) => p.document_file_id === selectedFileId);
  }, [placeholders, selectedFileId]);

  const fileTextPlaceholders = useMemo(() => {
    if (!selectedFileId) return [];
    return textPlaceholders.filter(
      (p) => p.document_file_id === selectedFileId,
    );
  }, [textPlaceholders, selectedFileId]);

  const actionableFilePlaceholders = useMemo(
    () =>
      filePlaceholders.filter((placeholder) =>
        isAssignedToCurrentUser(
          placeholder.assigned_user_id,
          placeholder.department_id,
        ),
      ),
    [filePlaceholders, isAssignedToCurrentUser],
  );

  const actionableTextPlaceholders = useMemo(
    () =>
      fileTextPlaceholders.filter((placeholder) =>
        isAssignedToCurrentUser(
          placeholder.assigned_user_id,
          placeholder.department_id,
        ),
      ),
    [fileTextPlaceholders, isAssignedToCurrentUser],
  );

  const normalizedSignatures = useMemo(() => {
    return signatures.map((signature) => ({
      fileId:
        signature.document_file_id ||
        signature.documentFileFile_id ||
        signature.documentFile?.file_id ||
        "",
      pageNumber: signature.page_number,
      x: signature.x_position,
      y: signature.y_position,
      width: signature.width,
      height: signature.height,
      signatureData: signature.signature_data || null,
    }));
  }, [signatures]);

  const signedPlaceholderIds = useMemo(() => {
    const ids = new Set<string>();
    const EPSILON = 0.5;

    for (const placeholder of placeholders) {
      const signatureMatch = normalizedSignatures.find((signature) => {
        if (!signature.fileId) return false;
        if (signature.fileId !== placeholder.document_file_id) return false;
        if (signature.pageNumber !== placeholder.page_number) return false;
        return (
          Math.abs(signature.x - placeholder.x_position) <= EPSILON &&
          Math.abs(signature.y - placeholder.y_position) <= EPSILON &&
          Math.abs(signature.width - placeholder.width) <= EPSILON &&
          Math.abs(signature.height - placeholder.height) <= EPSILON
        );
      });

      if (signatureMatch) {
        ids.add(placeholder.placeholder_id);
      }
    }

    return ids;
  }, [normalizedSignatures, placeholders]);

  const signatureDataByPlaceholderId = useMemo(() => {
    const map = new Map<string, string>();
    const EPSILON = 0.5;

    for (const placeholder of placeholders) {
      const signatureMatch = normalizedSignatures.find((signature) => {
        if (!signature.fileId) return false;
        if (signature.fileId !== placeholder.document_file_id) return false;
        if (signature.pageNumber !== placeholder.page_number) return false;
        return (
          Math.abs(signature.x - placeholder.x_position) <= EPSILON &&
          Math.abs(signature.y - placeholder.y_position) <= EPSILON &&
          Math.abs(signature.width - placeholder.width) <= EPSILON &&
          Math.abs(signature.height - placeholder.height) <= EPSILON
        );
      });

      if (signatureMatch?.signatureData) {
        map.set(placeholder.placeholder_id, signatureMatch.signatureData);
      }
    }

    return map;
  }, [normalizedSignatures, placeholders]);

  useEffect(() => {
    if (
      selectedPlaceholder &&
      signedPlaceholderIds.has(selectedPlaceholder.placeholder_id)
    ) {
      setSelectedPlaceholder(null);
      setSignatureData(null);
    }
  }, [selectedPlaceholder, signedPlaceholderIds]);

  useEffect(() => {
    if (!textPlaceholders.length) return;
    setTextValues((prev) => {
      const next = { ...prev };
      textPlaceholders.forEach((placeholder) => {
        // Update the text value from the API to reflect what's in the database
        // This ensures that when the component re-renders after saving, it shows the saved values
        const rawText = placeholder.text_value || "";
        const isPlaceholder = rawText.trim().toLowerCase() === "text";
        const storedText = isPlaceholder ? "" : rawText;

        // Update the value in state with the value from the API
        // This will override any temporary values with the saved values from the database
        next[placeholder.placeholder_id] = storedText;
      });
      return next;
    });
  }, [textPlaceholders]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, selectedFile?.id]);

  // Auto-navigate to first page with pending signature
  useEffect(() => {
    if (actionableFilePlaceholders.length > 0 && pages.length > 0) {
      const firstPlaceholder = actionableFilePlaceholders[0];
      if (firstPlaceholder.page_number !== activePage) {
        setActivePage(firstPlaceholder.page_number);
      }
    }
  }, [actionableFilePlaceholders, pages.length]); // Run when placeholders or pages load

  const handlePlaceholderClick = (placeholder: SignaturePlaceholder) => {
    if (
      !isAssignedToCurrentUser(
        placeholder.assigned_user_id,
        placeholder.department_id,
      )
    ) {
      toast.error("This placeholder is assigned to another user.");
      return;
    }
    if (signedPlaceholderIds.has(placeholder.placeholder_id)) {
      toast.info("This placeholder already has a signature.");
      return;
    }
    setSelectedPlaceholder(placeholder);
    setIsSignatureModalOpen(true);
  };

  const emitSignatureDraft = useCallback(
    (signature: string | null) => {
      if (!socket || !roomKey || !selectedPlaceholder || !signeeId) return;
      socket.emit("signature:draft:update", {
        documentId,
        fileId: selectedFile?.id,
        placeholderId: selectedPlaceholder.placeholder_id,
        signatureData: signature,
        userId: signeeId,
      });
    },
    [
      documentId,
      roomKey,
      selectedFile?.id,
      selectedPlaceholder,
      signeeId,
      socket,
    ],
  );

  const emitTextDraft = useCallback(
    (text: string) => {
      if (!socket || !roomKey || !selectedTextPlaceholder || !signeeId) return;
      socket.emit("text:draft:update", {
        documentId,
        fileId: selectedFile?.id,
        placeholderId: selectedTextPlaceholder.placeholder_id,
        text,
        userId: signeeId,
      });
    },
    [
      documentId,
      roomKey,
      selectedFile?.id,
      selectedTextPlaceholder,
      signeeId,
      socket,
    ],
  );

  const handleSaveDraft = () => {
    if (!selectedPlaceholder || !signatureData) return;
    const placeholderId = selectedPlaceholder.placeholder_id;
    setPlacedSignatures((prev) => ({
      ...prev,
      [placeholderId]: signatureData,
    }));
    setSignatureData(null);
    setIsSignatureModalOpen(false);
    toast.success("Signature draft saved.");
  };

  const handleClearDraft = () => {
    if (!selectedPlaceholder) return;
    const placeholderId = selectedPlaceholder.placeholder_id;
    setPlacedSignatures((prev) => {
      if (!prev[placeholderId]) return prev;
      const next = { ...prev };
      delete next[placeholderId];
      return next;
    });
    setSignatureData(null);
    setIsSignatureModalOpen(false);
    toast.success("Signature draft cleared.");
  };

  const handleConfirmSignature = async () => {
    const pendingSignatures: Record<string, string> = {
      ...placedSignatures,
    };

    if (selectedPlaceholder && signatureData) {
      pendingSignatures[selectedPlaceholder.placeholder_id] = signatureData;
    }

    const pendingTextEntries = Object.entries(textValues).reduce(
      (acc, [placeholderId, value]) => {
        const placeholder = textPlaceholders.find(
          (item) => item.placeholder_id === placeholderId,
        );
        if (
          !placeholder ||
          !isAssignedToCurrentUser(
            placeholder.assigned_user_id,
            placeholder.department_id,
          )
        ) {
          return acc;
        }
        const trimmed = value.trim();
        if (trimmed) {
          acc[placeholderId] = trimmed;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    if (
      Object.keys(pendingSignatures).length === 0 &&
      Object.keys(pendingTextEntries).length === 0
    ) {
      toast.error(
        "Save at least one signature or text entry before confirming.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const signaturesResponse = await fetch(
        `/api/document-signatures/documents/${documentId}/signatures`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      );

      if (!signaturesResponse.ok) {
        throw new Error("Failed to fetch existing signatures.");
      }

      const signatureRecords: Array<{
        document_file_id?: string;
        documentFileFile_id?: string;
        documentFile?: { file_id?: string };
        page_number: number;
        x_position: number;
        y_position: number;
        width: number;
        height: number;
        signature_data?: string | null;
      }> = await signaturesResponse.json();

      const normalizedSignaturesForPdf = signatureRecords
        .map((signature) => ({
          fileId:
            signature.document_file_id ||
            signature.documentFileFile_id ||
            signature.documentFile?.file_id ||
            "",
          pageNumber: signature.page_number,
          x: signature.x_position,
          y: signature.y_position,
          width: signature.width,
          height: signature.height,
          signatureData: signature.signature_data || null,
        }))
        .filter((signature) => signature.fileId);

      const placeholderById = new Map(
        placeholders.map((placeholder) => [
          placeholder.placeholder_id,
          placeholder,
        ]),
      );

      const targetFileIds =
        selectedFileIds.length > 0
          ? selectedFileIds
          : selectedFileId
            ? [selectedFileId]
            : [];

      for (const fileId of targetFileIds) {
        const targetFile = sortedPdfFiles.find((file) => file.id === fileId);
        if (!targetFile) continue;

        const filePlaceholdersForTarget = placeholders.filter(
          (placeholder) => placeholder.document_file_id === fileId,
        );
        const fileTextPlaceholdersForTarget = textPlaceholders.filter(
          (placeholder) => placeholder.document_file_id === fileId,
        );
        if (
          !filePlaceholdersForTarget.length &&
          !fileTextPlaceholdersForTarget.length
        ) {
          continue;
        }

        const signatureEntries = new Map<
          string,
          {
            pageNumber: number;
            x: number;
            y: number;
            width: number;
            height: number;
            dataUrl: string;
          }
        >();

        const filePlaceholderById = new Map(
          filePlaceholdersForTarget.map((placeholder) => [
            placeholder.placeholder_id,
            placeholder,
          ]),
        );

        const existingSignaturesForFile = normalizedSignaturesForPdf.filter(
          (signature) => signature.fileId === fileId && signature.signatureData,
        );

        for (const signature of existingSignaturesForFile) {
          const key = `${signature.pageNumber}-${signature.x}-${signature.y}-${signature.width}-${signature.height}`;
          signatureEntries.set(key, {
            pageNumber: signature.pageNumber,
            x: signature.x,
            y: signature.y,
            width: signature.width,
            height: signature.height,
            dataUrl: signature.signatureData || "",
          });
        }

        for (const [placeholderId, dataUrl] of Object.entries(
          pendingSignatures,
        )) {
          const placeholder = filePlaceholderById.get(placeholderId);
          if (!placeholder) {
            continue;
          }

          const key = `${placeholder.page_number}-${placeholder.x_position}-${placeholder.y_position}-${placeholder.width}-${placeholder.height}`;
          signatureEntries.set(key, {
            pageNumber: placeholder.page_number,
            x: placeholder.x_position,
            y: placeholder.y_position,
            width: placeholder.width,
            height: placeholder.height,
            dataUrl,
          });
        }

        const textEntries = fileTextPlaceholdersForTarget
          .map((placeholder) => {
            const pendingText = pendingTextEntries[placeholder.placeholder_id];
            // If there's pending text, use it; otherwise use the stored text value from the API
            const baseText = pendingText ?? placeholder.text_value ?? "";
            return {
              placeholder,
              text: baseText.trim(),
            };
          })
          .filter((entry) => entry.text.trim().length > 0);

        const pdfResponse = await fetch(
          `/api/documents/${documentId}/files/${
            targetFile.id
          }/stream?download=1&v=${Date.now()}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        if (!pdfResponse.ok) {
          throw new Error("Unable to download PDF for signing.");
        }

        const buffer = await pdfResponse.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);
        const fontCache = new Map<StandardFonts, PDFFont>();
        const getFont = async (fontName: StandardFonts) => {
          if (fontCache.has(fontName)) {
            return fontCache.get(fontName)!;
          }
          const font = await pdfDoc.embedFont(fontName);
          fontCache.set(fontName, font);
          return font;
        };

        for (const signature of signatureEntries.values()) {
          const page = pdfDoc.getPage(signature.pageNumber - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          const renderWidth = signature.width;
          const renderHeight = signature.height;
          const x = signature.x;
          const y = pageHeight - signature.y - renderHeight;

          if (renderWidth > pageWidth || renderHeight > pageHeight) {
            throw new Error("Signature placement is outside the page bounds.");
          }

          let sigBytes: Uint8Array;
          if (signature.dataUrl.startsWith("data:image/")) {
            sigBytes = dataUrlToUint8Array(signature.dataUrl);
          } else {
            const imageResponse = await fetch(signature.dataUrl);
            if (!imageResponse.ok) {
              throw new Error("Unable to load signature image data.");
            }
            const arrayBuffer = await imageResponse.arrayBuffer();
            sigBytes = new Uint8Array(arrayBuffer);
          }

          const isPng = signature.dataUrl.startsWith("data:image/png");
          const image = isPng
            ? await pdfDoc.embedPng(sigBytes)
            : await pdfDoc.embedJpg(sigBytes);

          page.drawImage(image, {
            x,
            y,
            width: renderWidth,
            height: renderHeight,
          });
        }

        for (const entry of textEntries) {
          const page = pdfDoc.getPage(entry.placeholder.page_number - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();
          const boxWidth = entry.placeholder.width;
          const boxHeight = entry.placeholder.height;
          const fontName = resolvePdfFont(entry.placeholder.font_family);
          const font = await getFont(fontName);
          const baseSize = Math.max(6, entry.placeholder.font_size || 12);
          const widthAtSize = font.widthOfTextAtSize(entry.text, baseSize);
          const size =
            widthAtSize > boxWidth
              ? Math.max(6, (boxWidth / widthAtSize) * baseSize)
              : baseSize;
          const textWidth = font.widthOfTextAtSize(entry.text, size);
          const textHeight = font.heightAtSize(size);
          const x = entry.placeholder.x_position + (boxWidth - textWidth) / 2;
          const y =
            pageHeight -
            entry.placeholder.y_position -
            boxHeight +
            (boxHeight - textHeight) / 2;
          const { r, g, b } = hexToRgb(entry.placeholder.font_color);

          if (boxWidth > pageWidth || boxHeight > pageHeight) {
            throw new Error("Text placement is outside the page bounds.");
          }

          page.drawText(entry.text, {
            x,
            y,
            size,
            font,
            color: rgb(r / 255, g / 255, b / 255),
          });
        }

        const pdfBytes: Uint8Array = await pdfDoc.save();
        const blob = new Blob([pdfBytes as BlobPart], {
          type: "application/pdf",
        });

        const formData = new FormData();
        const fileName = targetFile.name || "signed-document.pdf";
        formData.append("file", blob, fileName);

        const uploadResponse = await fetch(
          `/api/documents/${documentId}/files/${targetFile.id}`,
          {
            method: "PUT",
            credentials: "include",
            body: formData,
          },
        );

        const uploadResult = await uploadResponse.json().catch(() => ({
          success: uploadResponse.ok,
        }));

        if (!uploadResponse.ok || uploadResult.success === false) {
          throw new Error(
            uploadResult.error?.message || "Failed to upload signed PDF.",
          );
        }
      }

      if (!signeeId) {
        throw new Error("User information missing for signature tracking.");
      }

      await Promise.all(
        Object.entries(pendingSignatures).map(
          async ([placeholderId, dataUrl]) => {
            const placeholder = placeholderById.get(placeholderId);
            if (!placeholder) return null;

            const response = await fetch(
              `/api/document-signatures/documents/${documentId}/place-signature`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  signee_id: signeeId,
                  document_file_id: placeholder.document_file_id,
                  page_number: placeholder.page_number,
                  x_position: placeholder.x_position,
                  y_position: placeholder.y_position,
                  width: placeholder.width,
                  height: placeholder.height,
                  signature_data: dataUrl,
                }),
              },
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.error || "Failed to save signature record.",
              );
            }

            return response.json().catch(() => null);
          },
        ),
      );

      // Save text placeholders to the database
      const textPlaceholderUpdates = Object.entries(pendingTextEntries).map(
        async ([placeholderId, textValue]) => {
          // Find the placeholder to get its details
          const placeholder = [...textPlaceholders].find(
            (p) => p.placeholder_id === placeholderId,
          );

          if (!placeholder) return null;

          const response = await fetch(
            `/api/document-texts/documents/${documentId}/update-text-placeholder`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                placeholder_id: placeholderId,
                text_value: textValue,
              }),
            },
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || "Failed to update text placeholder.",
            );
          }

          return response.json().catch(() => null);
        },
      );

      await Promise.all(textPlaceholderUpdates);

      toast.success(
        "All signature and text drafts saved to the selected files.",
      );

      setPlacedSignatures({});
      setSignatureData(null);
      setSelectedPlaceholder(null);
      setIsSignatureModalOpen(false);

      // Refetch both signatures and text placeholders to update the UI
      await Promise.all([refetchSignatures(), refetchTextPlaceholders()]);

      if (socket && signeeId) {
        const placeholderIds = Object.keys(pendingSignatures);
        const textPlaceholderIds = Object.keys(pendingTextEntries);
        const targetFileIdsForRooms =
          selectedFileIds.length > 0
            ? selectedFileIds
            : selectedFileId
              ? [selectedFileId]
              : [];
        targetFileIdsForRooms.forEach((fileId) => {
          socket.emit("signature:save", {
            documentId,
            fileId,
            userId: signeeId,
            placeholderIds,
            textPlaceholderIds,
          });
        });
      }

      setIsSuccessModalOpen(true); // Show success modal instead of calling onSigned immediately
    } catch (error: any) {
      console.error("Failed to save signed PDF", error);
      toast.error(
        error?.message || "Unable to save signed PDF. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingFiles || isLoadingPlaceholders || isLoadingTextPlaceholders) {
    return (
      <Card className="h-full w-full min-h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Sign Document</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!sortedPdfFiles.length) {
    return (
      <Card className="h-full w-full min-h-[300px] flex flex-col">
        <CardHeader>
          <CardTitle>Sign Document</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-md border border-dashed border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">
            This document does not have any PDF files to sign.
          </div>
          <Button variant="outline" size="sm" onClick={onExit}>
            Go back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activePageData = pages.find((p) => p.pageNumber === activePage);
  const pageScaleX = activePageData?.pdfWidth
    ? activePageData.width / activePageData.pdfWidth
    : RENDER_SCALE;
  const pageScaleY = activePageData?.pdfHeight
    ? activePageData.height / activePageData.pdfHeight
    : RENDER_SCALE;
  const pendingCount = actionableFilePlaceholders.length;
  const hasDrafts = Object.keys(placedSignatures).length > 0;
  const hasCurrentSignature = Boolean(selectedPlaceholder && signatureData);
  const hasTextDrafts = Object.values(textValues).some((value) => value.trim());
  const hasSelectedDraft = selectedPlaceholder
    ? Boolean(placedSignatures[selectedPlaceholder.placeholder_id])
    : false;

  return (
    <Card className="h-full w-full min-h-[600px] flex flex-col border-primary/40">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">
            {selectedFile?.name || "Sign Document"}
          </CardTitle>
          {sortedPdfFiles.length > 1 && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Documents
                </span>
                <span className="text-xs text-muted-foreground">
                  Selected {selectedFileIds.length} of {sortedPdfFiles.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleSelectAllFiles}
                >
                  Select all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleDeselectAllFiles}
                >
                  Deselect all
                </Button>
              </div>

              {/* Grouped files display */}
              <div className="flex flex-wrap gap-2">
                {groupedFiles.map((group) => {
                  const allGroupFilesSelected = group.files.every((file) =>
                    selectedFileIds.includes(file.id),
                  );
                  const someGroupFilesSelected = group.files.some((file) =>
                    selectedFileIds.includes(file.id),
                  );

                  return (
                    <div
                      key={group.id}
                      className={cn(
                        "flex flex-col rounded border px-2 py-1 text-xs w-full",
                        allGroupFilesSelected
                          ? "border-primary/60 bg-accent"
                          : "border-muted",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allGroupFilesSelected}
                          indeterminate={
                            someGroupFilesSelected && !allGroupFilesSelected
                          }
                          onCheckedChange={() => {
                            if (allGroupFilesSelected) {
                              // Deselect all files in the group
                              setSelectedFileIds((prev) =>
                                prev.filter(
                                  (id) => !group.files.some((f) => f.id === id),
                                ),
                              );
                            } else {
                              // Select all files in the group
                              const newSelectedIds = new Set([
                                ...selectedFileIds,
                              ]);
                              group.files.forEach((file) =>
                                newSelectedIds.add(file.id),
                              );
                              setSelectedFileIds(Array.from(newSelectedIds));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <button
                            type="button"
                            onClick={() => {
                              // Select the first file in the group
                              setSelectedFileId(group.files[0].id);
                            }}
                            className={cn(
                              "max-w-[160px] truncate text-left font-semibold",
                              group.files.some((f) => f.id === selectedFileId)
                                ? "text-primary"
                                : "",
                            )}
                          >
                            {group.name}
                          </button>
                          <div className="text-[10px] text-muted-foreground">
                            {group.files.length} file
                            {group.files.length > 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>

                      {/* Show individual files in the group */}
                      <div className="ml-6 mt-1 flex flex-wrap gap-1">
                        {group.files.map((file) => {
                          const isSelected = selectedFileIds.includes(file.id);
                          return (
                            <div
                              key={file.id}
                              className={cn(
                                "flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                                isSelected
                                  ? "border-primary/60 bg-primary/10"
                                  : "border-muted",
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handleToggleFileSelection(file.id)
                                }
                                className="h-3 w-3"
                              />
                              <button
                                type="button"
                                onClick={() => setSelectedFileId(file.id)}
                                className={cn(
                                  "truncate text-left",
                                  file.id === selectedFileId
                                    ? "font-medium"
                                    : "",
                                )}
                              >
                                {file.name}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Files that don't belong to any group */}
                {(() => {
                  const ungroupedFiles = sortedPdfFiles.filter(
                    (file) =>
                      !groupedFiles.some((group) =>
                        group.files.some((gf) => gf.id === file.id),
                      ),
                  );

                  if (ungroupedFiles.length === 0) return null;

                  return (
                    <div className="w-full">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Individual Files
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ungroupedFiles.map((file) => {
                          const isSelected = selectedFileIds.includes(file.id);
                          return (
                            <div
                              key={file.id}
                              className={cn(
                                "flex items-center gap-2 rounded border px-2 py-1 text-xs",
                                isSelected
                                  ? "border-primary/60 bg-accent"
                                  : "border-muted",
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handleToggleFileSelection(file.id)
                                }
                              />
                              <button
                                type="button"
                                onClick={() => setSelectedFileId(file.id)}
                                className={cn(
                                  "max-w-[160px] truncate text-left",
                                  file.id === selectedFileId
                                    ? "font-semibold"
                                    : "",
                                )}
                              >
                                {file.name}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Page
          </span>
          <div className="flex flex-wrap gap-1">
            {pages.map((page) => (
              <Button
                key={page.pageNumber}
                variant={page.pageNumber === activePage ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setActivePage(page.pageNumber)}
              >
                {page.pageNumber}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={handleConfirmSignature}
            disabled={
              isSaving || (!hasDrafts && !hasCurrentSignature && !hasTextDrafts)
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm Entries"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3 flex-1 overflow-hidden">
          {/* Sidebar for pending signatures */}
          <div className="w-full md:w-56 flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Active in File
              </h3>
              {presence.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No active signers
                </div>
              ) : (
                presence.map((member) => (
                  <div
                    key={member.userId}
                    className="rounded border px-2 py-1 text-xs text-muted-foreground"
                  >
                    {member.name}
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Signatures
              </h3>
              {filePlaceholders.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No pending signatures
                </div>
              ) : actionableFilePlaceholders.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No signatures assigned to you
                </div>
              ) : (
                filePlaceholders.map((p, i) =>
                  (() => {
                    const isSigned = signedPlaceholderIds.has(p.placeholder_id);
                    const isLocked = !isAssignedToCurrentUser(
                      p.assigned_user_id,
                      p.department_id,
                    );
                    const remoteDraft = remoteSignatureDrafts[p.placeholder_id];
                    return (
                      <Button
                        key={p.placeholder_id}
                        variant="outline"
                        size="sm"
                        className="justify-start text-xs h-auto py-2 whitespace-normal text-left"
                        disabled={isSigned || isLocked}
                        onClick={() => {
                          if (!isSigned && !isLocked) {
                            setSelectedPlaceholder(p);
                            if (p.page_number !== activePage) {
                              setActivePage(p.page_number);
                            }
                          }
                        }}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">
                            Signature #{i + 1}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Page {p.page_number}
                          </span>
                          {isLocked && (
                            <span className="text-[10px] text-muted-foreground">
                              Assigned to another user
                            </span>
                          )}
                          {!isSigned && remoteDraft && (
                            <span className="text-[10px] text-muted-foreground">
                              In progress
                            </span>
                          )}
                          {isSigned && (
                            <span className="text-[10px] text-emerald-600">
                              Signed
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })(),
                )
              )}
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Text
              </h3>
              {fileTextPlaceholders.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No text placeholders
                </div>
              ) : actionableTextPlaceholders.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No text placeholders assigned to you
                </div>
              ) : (
                fileTextPlaceholders.map((p, i) => {
                  const storedText = p.text_value || "";
                  const savedText = textValues[p.placeholder_id] || "";
                  // Use the saved text from state if available, otherwise use stored text from API
                  const displayText = savedText || storedText;
                  const hasSavedText = Boolean(
                    displayText && displayText.toLowerCase() !== "text",
                  );
                  const isLocked = !isAssignedToCurrentUser(
                    p.assigned_user_id,
                    p.department_id,
                  );
                  const remoteDraft = remoteTextDrafts[p.placeholder_id];

                  return (
                    <Button
                      key={p.placeholder_id}
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-auto py-2 whitespace-normal text-left"
                      disabled={hasSavedText || isLocked}
                      onClick={() => {
                        if (hasSavedText || isLocked) return;
                        setSelectedTextPlaceholder(p);
                        setIsTextModalOpen(true);
                        if (p.page_number !== activePage) {
                          setActivePage(p.page_number);
                        }
                      }}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">Text #{i + 1}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Page {p.page_number}
                        </span>
                        {isLocked && (
                          <span className="text-[10px] text-muted-foreground">
                            Assigned to another user
                          </span>
                        )}
                        {!hasSavedText && remoteDraft && (
                          <span className="text-[10px] text-muted-foreground">
                            In progress
                          </span>
                        )}
                        {hasSavedText && (
                          <span className="text-[10px] text-emerald-600">
                            Filled
                          </span>
                        )}
                      </div>
                    </Button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded-md bg-muted/20 min-h-[300px]">
            {isRendering || !activePageData ? (
              <div className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading PDF page...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center min-w-full">
                <div
                  className="relative "
                  style={{
                    width: activePageData.width,
                    height: activePageData.height,
                  }}
                >
                  <img
                    src={activePageData.imageUrl}
                    alt={`Page ${activePageData.pageNumber}`}
                    className="h-full w-full object-fill rounded-md border  border-red-500 bg-black scroll-none"
                    style={{
                      width: activePageData.width,
                      height: activePageData.height,
                    }}
                  />
                  {filePlaceholders
                    .filter((p) => p.page_number === activePage)
                    .map((placeholder) => {
                      const signedData = signatureDataByPlaceholderId.get(
                        placeholder.placeholder_id,
                      );
                      const overlaySignature =
                        signedData ||
                        (selectedPlaceholder &&
                          signatureData &&
                          selectedPlaceholder.placeholder_id ===
                            placeholder.placeholder_id &&
                          signatureData) ||
                        placedSignatures[placeholder.placeholder_id] ||
                        remoteSignatureDrafts[placeholder.placeholder_id]
                          ?.dataUrl;
                      const isSigned = signedPlaceholderIds.has(
                        placeholder.placeholder_id,
                      );
                      const isLocked = !isAssignedToCurrentUser(
                        placeholder.assigned_user_id,
                        placeholder.department_id,
                      );
                      const remoteSignatureUser =
                        remoteSignatureDrafts[placeholder.placeholder_id]
                          ?.userId;

                      return (
                        <div
                          key={placeholder.placeholder_id}
                          style={{
                            position: "absolute",
                            left: placeholder.x_position * pageScaleX,
                            top: placeholder.y_position * pageScaleY,
                            width: placeholder.width * pageScaleX,
                            height: placeholder.height * pageScaleY,
                            zIndex: 10, // Ensure it's on top
                          }}
                          className={cn(
                            "group rounded-md border-2 border-dashed transition-all flex items-center justify-center",
                            isSigned
                              ? "border-emerald-500 bg-emerald-500/15 cursor-not-allowed"
                              : isLocked
                                ? "border-slate-300 bg-slate-100/60 cursor-not-allowed"
                                : "border-yellow-500 bg-yellow-500/20 hover:bg-yellow-500/40 cursor-pointer",
                          )}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent bubbling
                            if (!isLocked) {
                              handlePlaceholderClick(placeholder);
                            }
                          }}
                        >
                          {overlaySignature ? (
                            <img
                              src={overlaySignature}
                              alt="Signature"
                              className="h-full w-full object-contain rounded-md bg-white pointer-events-none"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-yellow-700 font-bold bg-white/80 px-2 py-1 rounded shadow-sm animate-pulse pointer-events-none">
                              <PenLine className="h-4 w-4" />
                              <span className="text-[10px]">
                                {isSigned
                                  ? "Signed"
                                  : isLocked
                                    ? "Assigned"
                                    : "Sign Here"}
                              </span>
                              {!isSigned && remoteSignatureUser && (
                                <span className="text-[10px] text-muted-foreground">
                                  In progress
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {fileTextPlaceholders
                    .filter((p) => p.page_number === activePage)
                    .map((placeholder) => {
                      const storedText = placeholder.text_value || "";
                      const savedText =
                        textValues[placeholder.placeholder_id] || "";
                      // Use the saved text from state if available, otherwise use stored text from API
                      // Only show "Text" as placeholder if both are empty
                      const remoteText =
                        remoteTextDrafts[placeholder.placeholder_id]?.text;
                      const mergedText =
                        savedText || storedText || remoteText || "Text";
                      const hasMergedText = Boolean(
                        mergedText && mergedText.toLowerCase() !== "text",
                      );
                      const isLocked = !isAssignedToCurrentUser(
                        placeholder.assigned_user_id,
                        placeholder.department_id,
                      );
                      return (
                        <div
                          key={placeholder.placeholder_id}
                          style={{
                            position: "absolute",
                            left: placeholder.x_position * pageScaleX,
                            top: placeholder.y_position * pageScaleY,
                            width: placeholder.width * pageScaleX,
                            height: placeholder.height * pageScaleY,
                            zIndex: 8,
                          }}
                          className={cn(
                            "rounded-md border-2 border-dashed bg-transparent flex items-center justify-center",
                            hasMergedText
                              ? "border-amber-500/50 cursor-not-allowed"
                              : isLocked
                                ? "border-slate-300 bg-slate-100/60 cursor-not-allowed"
                                : "border-amber-500/70 cursor-pointer hover:border-amber-500",
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!hasMergedText && !isLocked) {
                              setSelectedTextPlaceholder(placeholder);
                              setIsTextModalOpen(true);
                            }
                          }}
                        >
                          <div
                            className="text-center px-1"
                            style={{
                              fontFamily: placeholder.font_family || "Arial",
                              fontSize: placeholder.font_size || 14,
                              color: placeholder.font_color || "#111827",
                            }}
                          >
                            {mergedText}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 border-t pt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              Signature Actions
            </h3>
            <p className="text-xs text-muted-foreground">
              Select a &quot;Sign Here&quot; box on the document to add your
              signature or tap a text box to enter text. Confirm all entries
              when finished.
            </p>
          </div>
        </div>

        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setSignatureData(null); // Clear signature data when closing
          }}
          onChange={(signature) => {
            if (signatureDraftTimerRef.current) {
              clearTimeout(signatureDraftTimerRef.current);
            }
            signatureDraftTimerRef.current = setTimeout(() => {
              emitSignatureDraft(signature);
            }, 120);
          }}
          onSave={(signature) => {
            setSignatureData(signature);
            // Save as draft immediately
            if (selectedPlaceholder) {
              const placeholderId = selectedPlaceholder.placeholder_id;
              setPlacedSignatures((prev) => ({
                ...prev,
                [placeholderId]: signature,
              }));
              emitSignatureDraft(signature);
              const targetIds = selectedFileIds.length
                ? selectedFileIds
                : selectedFileId
                  ? [selectedFileId]
                  : [];
              if (targetIds.length > 1) {
                const matches = findMatchingPlaceholders(
                  selectedPlaceholder,
                  targetIds,
                );
                if (matches.length > 0) {
                  setPlacedSignatures((prev) => {
                    const next = { ...prev };
                    matches.forEach((match) => {
                      next[match.placeholder_id] = signature;
                    });
                    return next;
                  });
                }
              }
              toast.success("Signature saved to placeholder.");
            }
            setIsSignatureModalOpen(false);
          }}
          onCancel={() => {
            // When cancelling, clear any temporary signature data
            setSignatureData(null);
            setIsSignatureModalOpen(false);
            emitSignatureDraft(null);
          }}
          initialSignature={signatureData || undefined}
          title="Create Your Signature"
        />

        <TextPlaceholderModal
          isOpen={isTextModalOpen}
          onClose={() => {
            setIsTextModalOpen(false);
            setSelectedTextPlaceholder(null);
          }}
          onSave={(text) => {
            if (selectedTextPlaceholder) {
              const targetIds =
                selectedFileIds.length > 0
                  ? selectedFileIds
                  : selectedFileId
                    ? [selectedFileId]
                    : [];
              const matchingPlaceholders = findMatchingTextPlaceholders(
                selectedTextPlaceholder,
                targetIds,
              );

              setTextValues((prev) => {
                const next = { ...prev };
                matchingPlaceholders.forEach((p) => {
                  next[p.placeholder_id] = text;
                });
                return next;
              });

              emitTextDraft(text);
              toast.success("Text saved to placeholder(s).");
            }
            setIsTextModalOpen(false);
            setSelectedTextPlaceholder(null);
          }}
          onChange={(text) => {
            if (textDraftTimerRef.current) {
              clearTimeout(textDraftTimerRef.current);
            }
            textDraftTimerRef.current = setTimeout(() => {
              emitTextDraft(text);
            }, 120);
          }}
          onCancel={() => {
            setIsTextModalOpen(false);
            setSelectedTextPlaceholder(null);
            emitTextDraft("");
          }}
          initialText={
            selectedTextPlaceholder
              ? textValues[selectedTextPlaceholder.placeholder_id] ||
                (selectedTextPlaceholder.text_value &&
                selectedTextPlaceholder.text_value.toLowerCase() !== "text"
                  ? selectedTextPlaceholder.text_value
                  : "")
              : ""
          }
          title="Add Text"
          fontFamily={selectedTextPlaceholder?.font_family}
          fontSize={selectedTextPlaceholder?.font_size}
          fontColor={selectedTextPlaceholder?.font_color}
        />

        {/* Success Modal */}
        {isSuccessModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsSuccessModalOpen(false);
                setShouldNavigateAfterSuccess(true); // Set flag to navigate after modal closes
              }}
            />
            <div className="relative z-50 bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Signatures Confirmed!</h3>
                <p className="text-muted-foreground">
                  Your signatures have been successfully saved to the document.
                </p>
                <div className="flex gap-2 w-full mt-4">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setIsSuccessModalOpen(false);
                      setShouldNavigateAfterSuccess(true); // Set flag to navigate after modal closes
                    }}
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
