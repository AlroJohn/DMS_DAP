"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { Rnd } from "react-rnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Move,
  PenLine,
  Save,
  Type,
  Undo2,
  X,
} from "lucide-react";
import type { DocumentFileMetadata } from "@/hooks/use-document-files";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";

const PDFJS_WORKER_CDN =
  process.env.NEXT_PUBLIC_PDFJS_WORKER_URL ||
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.394/legacy/build/pdf.worker.min.mjs";

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
}

type AnnotationType = "text" | "image";

interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextAnnotation extends BaseAnnotation {
  type: "text";
  text: string;
  fontSize: number;
  fontName: StandardFonts;
  fontFamily?: FontFamilyId;
  isBold?: boolean;
  isItalic?: boolean;
  listStyle?: ListStyleType;
  backgroundColor?: string | null;
  textColor?: string | null;
}

interface ImageAnnotation extends BaseAnnotation {
  type: "image";
  dataUrl: string;
  mimeType: string;
}

type Annotation = TextAnnotation | ImageAnnotation;

interface PdfPageRender {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
  pdfWidth: number;
  pdfHeight: number;
}

interface EditablePdfViewerProps {
  documentId: string;
  files: DocumentFileMetadata[];
  initialFileId?: string | null;
  isLoadingFiles: boolean;
  onExit: () => void;
  onSaved: (newFileId?: string) => void;
}

type FontFamilyId = "helvetica" | "times" | "courier" | "symbol";
type ListStyleType = "none" | "bullet" | "number";

const isPdfLikeFile = (file?: DocumentFileMetadata | null) => {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  if (type.includes("pdf")) return true;
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".pdf");
};

const createAnnotationId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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

const hexToRgbColor = (hex?: string | null) => {
  if (!hex || hex === "transparent") return null;
  const normalized = hex.replace("#", "");
  if (![3, 6].includes(normalized.length)) return null;
  const expand =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = parseInt(expand, 16);
  if (Number.isNaN(num)) return null;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return rgb(r / 255, g / 255, b / 255);
};

const FONT_FAMILIES: Array<{
  id: FontFamilyId;
  label: string;
  cssFamily: string;
  variants: {
    regular: StandardFonts;
    bold?: StandardFonts;
    italic?: StandardFonts;
    boldItalic?: StandardFonts;
  };
}> = [
  {
    id: "helvetica",
    label: "Helvetica",
    cssFamily: "Helvetica, Arial, sans-serif",
    variants: {
      regular: StandardFonts.Helvetica,
      bold: StandardFonts.HelveticaBold,
      italic: StandardFonts.HelveticaOblique,
      boldItalic: StandardFonts.HelveticaBoldOblique,
    },
  },
  {
    id: "times",
    label: "Times",
    cssFamily: "'Times New Roman', Times, serif",
    variants: {
      regular: StandardFonts.TimesRoman,
      bold: StandardFonts.TimesRomanBold,
      italic: StandardFonts.TimesRomanItalic,
      boldItalic: StandardFonts.TimesRomanBoldItalic,
    },
  },
  {
    id: "courier",
    label: "Courier",
    cssFamily: "'Courier New', Courier, monospace",
    variants: {
      regular: StandardFonts.Courier,
      bold: StandardFonts.CourierBold,
      italic: StandardFonts.CourierOblique,
      boldItalic: StandardFonts.CourierBoldOblique,
    },
  },
  {
    id: "symbol",
    label: "Symbol",
    cssFamily: "Symbol, serif",
    variants: {
      regular: StandardFonts.Symbol,
    },
  },
];

const findFamilyByFontName = (fontName: StandardFonts | undefined) =>
  FONT_FAMILIES.find((family) =>
    Object.values(family.variants).some((variant) => variant === fontName)
  );

const resolveFontVariant = ({
  fontFamily,
  fontName,
  isBold,
  isItalic,
}: {
  fontFamily?: FontFamilyId;
  fontName?: StandardFonts;
  isBold?: boolean;
  isItalic?: boolean;
}) => {
  const family =
    FONT_FAMILIES.find((item) => item.id === fontFamily) ||
    findFamilyByFontName(fontName) ||
    FONT_FAMILIES[0];

  const wantsBold = Boolean(isBold);
  const wantsItalic = Boolean(isItalic);

  const variant =
    (wantsBold && wantsItalic && family.variants.boldItalic) ||
    (wantsBold && family.variants.bold) ||
    (wantsItalic && family.variants.italic) ||
    family.variants.regular ||
    fontName ||
    FONT_FAMILIES[0].variants.regular;

  return {
    pdfFont: variant,
    cssFamily: family.cssFamily,
    fontWeight: wantsBold ? "700" : undefined,
    fontStyle: wantsItalic ? "italic" : undefined,
    familyId: family.id,
  };
};

const formatListText = (text: string, listStyle?: ListStyleType) => {
  if (!text) return "";
  if (listStyle === "bullet") {
    return text
      .split("\n")
      .map((line) => `• ${line}`)
      .join("\n");
  }
  if (listStyle === "number") {
    return text
      .split("\n")
      .map((line, idx) => `${idx + 1}. ${line}`)
      .join("\n");
  }
  return text;
};

export function EditablePdfViewer({
  documentId,
  files,
  initialFileId,
  isLoadingFiles,
  onExit,
  onSaved,
}: EditablePdfViewerProps) {
  const getFontStyleForAnnotation = (annotation?: Partial<TextAnnotation>) => {
    return resolveFontVariant({
      fontFamily: annotation?.fontFamily,
      fontName: annotation?.fontName,
      isBold: annotation?.isBold,
      isItalic: annotation?.isItalic,
    });
  };

  const pdfFiles = useMemo(
    () => files.filter((file) => isPdfLikeFile(file)),
    [files]
  );
  const [internalSelectedFileId, setInternalSelectedFileId] = useState<
    string | null
  >(initialFileId ?? pdfFiles[0]?.id ?? null);

  const selectedFile = useMemo(() => {
    if (!pdfFiles || pdfFiles.length === 0) return null;

    let targetFileId: string | null = null;

    // 1. Prioritize initialFileId from URL
    if (initialFileId) {
      targetFileId = initialFileId;
    } else if (internalSelectedFileId) {
      // 2. Fallback to internal selection if no initialFileId
      targetFileId = internalSelectedFileId;
    } else {
      // 3. Fallback to the first PDF file if no explicit selection
      targetFileId = pdfFiles[0]?.id ?? null;
    }

    const foundFile = targetFileId
      ? pdfFiles.find((file) => file.id === targetFileId)
      : null;

    // If a file was found with the targetFileId, use it. Otherwise, fall back to the first file.
    return foundFile || pdfFiles[0] || null;
  }, [pdfFiles, initialFileId, internalSelectedFileId]);

  // Moved pages state and its direct useEffect here
  const [pages, setPages] = useState<PdfPageRender[]>([]);
  const [activePage, setActivePage] = useState(1); // activePage also moved here as it's directly related to pages
  const [isRendering, setIsRendering] = useState(false);
  const RENDER_SCALE = 1.4;

  useEffect(() => {
    if (pages.length === 0) {
      setActivePage(1);
    } else if (activePage > pages.length) {
      setActivePage(1);
    }
  }, [pages, activePage]);

  useEffect(() => {
    let isMounted = true;
    let loadingTask: { destroy?: () => Promise<void> } | null = null;
    const renderTasks: Array<{ cancel?: () => void }> = [];

    const renderPdfPages = async () => {
      if (!selectedFile) {
        setPages([]);
        setIsRendering(false);
        return;
      }

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
        const renderedPages: PdfPageRender[] = [];

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

          renderedPages.push({
            pageNumber,
            imageUrl,
            width: renderViewport.width,
            height: renderViewport.height,
            pdfWidth: baseViewport.width,
            pdfHeight: baseViewport.height,
          });
        }

        if (isMounted) {
          setPages(renderedPages);
          setActivePage((prev) => Math.min(prev, renderedPages.length) || 1);
        }
      } catch (error: any) {
        // RenderingCancelledException is expected when switching files mid-render
        if (
          error?.name === "RenderingCancelledException" ||
          error?.message?.includes("Worker was destroyed")
        ) {
          console.warn(
            "PDF render was cancelled or worker was destroyed during cleanup."
          );
        } else {
          console.error("Failed to render PDF for editing", error);
          if (isMounted) {
            setPages([]);
            toast.error("Unable to load PDF for editing. Please try again.");
          }
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    };

    renderPdfPages();

    return () => {
      isMounted = false;
      renderTasks.forEach((task) => {
        try {
          task?.cancel?.();
        } catch {
          // ignore
        }
      });
      if (loadingTask?.destroy) {
        loadingTask.destroy().catch(() => {
          /* ignore cleanup errors */
        });
      }
    };
  }, [documentId, selectedFile]);

  // Original useEffect for rendering pages (depends on selectedFile) remains in its position.
  // const [pages, setPages] = useState<PdfPageRender[]>([]); // This line was moved and removed
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  // const [activePage, setActivePage] = useState(1); // This line was moved and removed
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAssetType, setPendingAssetType] = useState<"image" | null>(
    null
  );
  const assetInputRef = useRef<HTMLInputElement>(null);

  const getSafeFontSize = (value?: number | null) => {
    if (typeof value !== "number" || Number.isNaN(value)) return 12;
    return value;
  };

  const measureTextDimensions = (
    text: string,
    fontSize: number,
    fontStyleInfo: {
      cssFamily: string;
      fontWeight?: string;
      fontStyle?: string;
    }
  ) => {
    const safeFontSize = getSafeFontSize(fontSize);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return { width: 80, height: safeFontSize + 4 };
    }
    const weight = fontStyleInfo.fontWeight
      ? `${fontStyleInfo.fontWeight} `
      : "";
    const style = fontStyleInfo.fontStyle ? `${fontStyleInfo.fontStyle} ` : "";
    context.font = `${style}${weight}${safeFontSize}px ${fontStyleInfo.cssFamily}`;

    const lines = text.split("\n");
    const widths = lines.map((line) => context.measureText(line).width);
    const maxWidth = Math.max(...widths);
    const height = lines.length * (safeFontSize + 2);

    return { width: maxWidth + 8, height };
  };

  const handleAddText = () => {
    if (!selectedFile || pages.length === 0) return;
    const initialText = "Enter text";
    const initialFontSize = 14;
    const initialFont = resolveFontVariant({
      fontFamily: "helvetica",
      isBold: false,
      isItalic: false,
    });
    const { width: initialWidth, height: initialHeight } =
      measureTextDimensions(
        formatListText(initialText, "none"),
        initialFontSize,
        initialFont
      );
    const newAnnotation: TextAnnotation = {
      id: createAnnotationId(),
      type: "text",
      pageNumber: activePage,
      x: 40,
      y: 40,
      width: initialWidth,
      height: initialHeight,
      text: initialText,
      fontSize: initialFontSize,
      fontName: initialFont.pdfFont,
      fontFamily: "helvetica",
      isBold: false,
      isItalic: false,
      listStyle: "none",
      backgroundColor: "#ffffff",
      textColor: "#000000",
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    setEditingTextId(newAnnotation.id);
  };
  const handleRequestAsset = (type: "image") => {
    setPendingAssetType(type);
    assetInputRef.current?.click();
  };

  const handleAssetChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const newAnnotation: ImageAnnotation = {
        id: createAnnotationId(),
        type: pendingAssetType ?? "image",
        pageNumber: activePage,
        x: 48,
        y: 48,
        width: 200,
        height: 90,
        dataUrl,
        mimeType: file.type || "image/png",
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
      setSelectedAnnotationId(newAnnotation.id);
    } catch (error) {
      console.error("Failed to read image", error);
      toast.error("Unable to load the selected image.");
    } finally {
      if (event.target) {
        event.target.value = "";
      }
      setPendingAssetType(null);
    }
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((annotation) =>
        annotation.id === id
          ? ({ ...annotation, ...updates } as Annotation)
          : annotation
      )
    );
  };

  const removeAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((annotation) => annotation.id !== id));
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
    if (editingTextId === id) {
      setEditingTextId(null);
    }
  };

  const clampPosition = (annotation: Annotation, x: number, y: number) => {
    const pageMeta = pages.find(
      (page) => page.pageNumber === annotation.pageNumber
    );
    if (!pageMeta) return { x, y };
    const maxX = Math.max(0, pageMeta.width - annotation.width);
    const maxY = Math.max(0, pageMeta.height - annotation.height);
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  };

  const updateAnnotationPosition = (id: string, x: number, y: number) => {
    setAnnotations((prev) =>
      prev.map((annotation) => {
        if (annotation.id !== id) return annotation;
        const clamped = clampPosition(annotation, x, y);
        return { ...annotation, ...clamped };
      })
    );
  };

  const updateAnnotationSize = (
    id: string,
    width: number,
    height: number,
    x: number,
    y: number
  ) => {
    setAnnotations((prev) =>
      prev.map((annotation) => {
        if (annotation.id !== id) return annotation;
        const clamped = clampPosition(annotation, x, y);
        return { ...annotation, width, height, ...clamped };
      })
    );
  };

  const clearAnnotations = () => {
    setAnnotations([]);
    setSelectedAnnotationId(null);
    setEditingTextId(null);
  };

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error("Select a PDF file to edit first.");
      return;
    }
    if (annotations.length === 0) {
      toast.error("Add at least one text or image before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const sortedPdfFiles = [...pdfFiles].sort((a, b) => {
        const versionA = parseFloat(a.version || "0");
        const versionB = parseFloat(b.version || "0");
        return versionA - versionB;
      });

      // Use the currently selected file as the source; fall back to the oldest if missing
      const sourceFile = selectedFile || sortedPdfFiles[0];

      if (!sourceFile) {
        throw new Error("No PDF file found to edit");
      }

      const response = await fetch(
        `/api/documents/${documentId}/files/${sourceFile.id}/stream?download=1`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to download the PDF");
      }

      const buffer = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const fontCache = new Map<StandardFonts, PDFFont>();
      const getFont = async (fontName: StandardFonts) => {
        if (fontCache.has(fontName)) return fontCache.get(fontName)!;
        const embedded = await pdfDoc.embedFont(fontName);
        fontCache.set(fontName, embedded);
        return embedded;
      };

      for (const annotation of annotations) {
        const meta = pages.find(
          (page) => page.pageNumber === annotation.pageNumber
        );
        if (!meta) continue;
        const page = pdfDoc.getPage(annotation.pageNumber - 1);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scaleX = pageWidth / meta.width;
        const scaleY = pageHeight / meta.height;
        const renderWidth = annotation.width * scaleX;
        const renderHeight = annotation.height * scaleY;
        const rectX = annotation.x * scaleX;
        const rectY = pageHeight - annotation.y * scaleY - renderHeight;

        if (annotation.type === "text") {
          const baseFontSize = getSafeFontSize(annotation.fontSize);
          const fontSize = baseFontSize * scaleY;
          const resolvedFont = resolveFontVariant({
            fontFamily: annotation.fontFamily,
            fontName: annotation.fontName,
            isBold: annotation.isBold,
            isItalic: annotation.isItalic,
          });
          const font = await getFont(resolvedFont.pdfFont);
          const textValue = formatListText(
            annotation.text || "",
            annotation.listStyle
          );
          const rectWidth = renderWidth;
          const rectHeight = renderHeight;
          // Lift the baseline a bit more so saved text aligns with on-canvas position
          const baselineNudge = 4 * scaleY;
          const resolvedBg =
            annotation.backgroundColor === undefined
              ? "#ffffff"
              : annotation.backgroundColor;
          const bgColor = hexToRgbColor(resolvedBg);
          if (bgColor) {
            page.drawRectangle({
              x: rectX,
              y: rectY,
              width: rectWidth,
              height: rectHeight,
              color: bgColor,
            });
          }
          const textHeight = font.heightAtSize(fontSize);
          const textY = rectY + rectHeight - textHeight + baselineNudge;
          page.drawText(textValue, {
            x: rectX,
            y: textY,
            size: fontSize,
            font,
            color:
              hexToRgbColor(annotation.textColor || "#000000") || rgb(0, 0, 0),
            maxWidth: rectWidth,
            lineHeight: fontSize,
          });
        } else if (annotation.type === "image") {
          const bytes = dataUrlToUint8Array(annotation.dataUrl);
          const image = annotation.mimeType.includes("png")
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes);
          page.drawImage(image, {
            x: rectX,
            y: rectY,
            width: renderWidth,
            height: renderHeight,
          });
        }
      }

      const editedBytes = await pdfDoc.save();
      const editedFileName = `${(selectedFile.name || "document")
        .replace(/\.pdf$/i, "")
        .trim()}-edited-${Date.now()}.pdf`;
      const editedCopy = new Uint8Array(editedBytes);
      const editedBlob = new Blob([editedCopy], { type: "application/pdf" });
      const editedFile = new File([editedBlob], editedFileName, {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.append("files", editedFile);

      // Include the versionGroupId from the source file to maintain the same version group
      if (selectedFile.versionGroupId) {
        formData.append("versionGroupId", selectedFile.versionGroupId);
      }

      const uploadResponse = await fetch(`/api/documents/${documentId}/files`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const uploadResult = await uploadResponse.json().catch(() => ({
        success: uploadResponse.ok,
      }));

      if (!uploadResponse.ok || uploadResult.success === false) {
        throw new Error(
          uploadResult.error?.message || "Failed to upload edited PDF."
        );
      }

      toast.success(
        "Saved a new PDF version. The previous file remains available."
      );
      clearAnnotations();
      const newFileId = (uploadResult.data && uploadResult.data[0]?.id) || null;

      // Check in the original file to release the lock after successful save
      try {
        const checkinResponse = await fetch(
          `/api/files/${selectedFile.id}/checkin`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!checkinResponse.ok) {
          const checkinResult = await checkinResponse.json().catch(() => ({
            error: { message: "Failed to checkin file" },
          }));
          console.warn("Failed to checkin file after save:", checkinResult.error?.message || "Unknown error");
          // Don't throw an error here as the save was successful, just warn the user
          toast.warning("Document saved but failed to release file lock");
        } else {
          console.log("Successfully checked in the file after saving");
        }
      } catch (checkinError) {
        console.error("Error checking in file after save:", checkinError);
        toast.warning("Document saved but failed to release file lock");
      }

      onSaved(newFileId ?? undefined);
    } catch (error: any) {
      console.error("Failed to save PDF edits", error);
      toast.error(error.message || "Unable to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const clampFontSize = (value: number) => {
    if (Number.isNaN(value)) return 6;
    return Math.max(6, Math.min(value, 150));
  };

  const renderAnnotationControls = () => {
    if (!selectedAnnotationId) return null;
    const annotation = annotations.find(
      (item) => item.id === selectedAnnotationId
    );
    if (!annotation) return null;
    return (
      <div className="rounded-md  bg-background p-4 shadow-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium capitalize">{annotation.type}</p>
            <p className="text-xs text-muted-foreground">
              Page {annotation.pageNumber}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeAnnotation(annotation.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {annotation.type === "text" && (
          <div className="mt-3 space-y-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Text
              </label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded border px-2 py-0 text-sm whitespace-nowrap"
                value={annotation.text}
                onChange={(event) => {
                  const newText = event.target.value;
                  const formatted = formatListText(
                    newText,
                    annotation.listStyle
                  );
                  const style = getFontStyleForAnnotation(annotation);
                  const dims = measureTextDimensions(
                    formatted,
                    annotation.fontSize,
                    style
                  );
                  updateAnnotation(annotation.id, {
                    text: newText,
                    width: dims.width,
                    height: dims.height,
                  });
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Font
                </label>
                <select
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={annotation.fontFamily || "helvetica"}
                  onChange={(event) => {
                    const nextFamily = event.target.value as FontFamilyId;
                    const style = resolveFontVariant({
                      fontFamily: nextFamily,
                      isBold: annotation.isBold,
                      isItalic: annotation.isItalic,
                    });
                    const formatted = formatListText(
                      annotation.text,
                      annotation.listStyle
                    );
                    const dims = measureTextDimensions(
                      formatted,
                      annotation.fontSize,
                      style
                    );
                    updateAnnotation(annotation.id, {
                      fontName: style.pdfFont,
                      fontFamily: style.familyId,
                      width: dims.width,
                      height: dims.height,
                    });
                  }}
                >
                  {FONT_FAMILIES.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="text-xs font-medium text-muted-foreground">
                  Font size
                </label>
                <input
                  type="number"
                  min={6}
                  max={150}
                  step={1}
                  value={
                    Number.isNaN(annotation.fontSize) ||
                    annotation.fontSize === undefined ||
                    annotation.fontSize === null
                      ? ""
                      : annotation.fontSize
                  }
                  onChange={(event) => {
                    const rawStr = event.target.value;
                    if (rawStr === "") {
                      updateAnnotation(annotation.id, {
                        fontSize: Number.NaN,
                      });
                      return;
                    }
                    const raw = Number(rawStr);
                    const nextSize = clampFontSize(raw);
                    const formatted = formatListText(
                      annotation.text,
                      annotation.listStyle
                    );
                    const style = getFontStyleForAnnotation(annotation);
                    const dims = measureTextDimensions(
                      formatted,
                      nextSize,
                      style
                    );
                    updateAnnotation(annotation.id, {
                      fontSize: nextSize,
                      width: dims.width,
                      height: dims.height,
                    });
                  }}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={annotation.isBold ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  const nextBold = !annotation.isBold;
                  const style = resolveFontVariant({
                    fontFamily: annotation.fontFamily,
                    fontName: annotation.fontName,
                    isBold: nextBold,
                    isItalic: annotation.isItalic,
                  });
                  const formatted = formatListText(
                    annotation.text,
                    annotation.listStyle
                  );
                  const dims = measureTextDimensions(
                    formatted,
                    annotation.fontSize,
                    style
                  );
                  updateAnnotation(annotation.id, {
                    isBold: nextBold,
                    fontName: style.pdfFont,
                    fontFamily: style.familyId,
                    width: dims.width,
                    height: dims.height,
                  });
                }}
              >
                <span className="font-semibold">B</span>
              </Button>
              <Button
                type="button"
                variant={annotation.isItalic ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  const nextItalic = !annotation.isItalic;
                  const style = resolveFontVariant({
                    fontFamily: annotation.fontFamily,
                    fontName: annotation.fontName,
                    isBold: annotation.isBold,
                    isItalic: nextItalic,
                  });
                  const formatted = formatListText(
                    annotation.text,
                    annotation.listStyle
                  );
                  const dims = measureTextDimensions(
                    formatted,
                    annotation.fontSize,
                    style
                  );
                  updateAnnotation(annotation.id, {
                    isItalic: nextItalic,
                    fontName: style.pdfFont,
                    fontFamily: style.familyId,
                    width: dims.width,
                    height: dims.height,
                  });
                }}
              >
                <span className="italic">I</span>
              </Button>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">
                  List style
                </label>
                <select
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={annotation.listStyle ?? "none"}
                  onChange={(event) => {
                    const nextList = event.target.value as ListStyleType;
                    const formatted = formatListText(annotation.text, nextList);
                    const style = getFontStyleForAnnotation(annotation);
                    const dims = measureTextDimensions(
                      formatted,
                      annotation.fontSize,
                      style
                    );
                    updateAnnotation(annotation.id, {
                      listStyle: nextList,
                      width: dims.width,
                      height: dims.height,
                    });
                  }}
                >
                  <option value="none">None</option>
                  <option value="bullet">Bullets</option>
                  <option value="number">Numbered</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Text color
                </label>
                {(() => {
                  const presetTextColors = [
                    "#000000",
                    "#1f2937",
                    "#374151",
                    "#0f172a",
                    "#dc2626",
                    "#16a34a",
                    "#2563eb",
                  ];
                  const currentColor = annotation.textColor ?? "#000000";
                  const normalized = currentColor.toLowerCase();
                  const selectValue = presetTextColors.includes(normalized)
                    ? normalized
                    : "custom";

                  return (
                    <select
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={selectValue}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "custom") {
                          return;
                        }
                        updateAnnotation(annotation.id, {
                          textColor: value,
                        });
                      }}
                    >
                      <option value="#000000">Black</option>
                      <option value="#1f2937">Dark gray</option>
                      <option value="#374151">Slate</option>
                      <option value="#0f172a">Navy</option>
                      <option value="#dc2626">Red</option>
                      <option value="#16a34a">Green</option>
                      <option value="#2563eb">Blue</option>
                      <option value="custom">Custom</option>
                    </select>
                  );
                })()}
              </div>
              <div className="w-28">
                <label className="text-xs font-medium text-muted-foreground">
                  Custom
                </label>
                <input
                  type="color"
                  className="mt-1 h-9 w-full cursor-pointer rounded border px-1 py-1"
                  value={(annotation.textColor ?? "#000000") || "#000000"}
                  onChange={(event) => {
                    updateAnnotation(annotation.id, {
                      textColor: event.target.value,
                    });
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Background
                </label>
                <select
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={
                    annotation.backgroundColor === undefined
                      ? "#ffffff"
                      : annotation.backgroundColor ?? "transparent"
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    updateAnnotation(annotation.id, {
                      backgroundColor: value === "transparent" ? null : value,
                    });
                  }}
                >
                  <option value="transparent">No fill</option>
                  <option value="#ffffff">White</option>
                  <option value="#f1f5f9">Light gray</option>
                  <option value="#e3f2fd">Light blue</option>
                  <option value="#fff3cd">Light yellow</option>
                  <option value="#f8d7da">Light red</option>
                </select>
              </div>
              <div className="w-28">
                <label className="text-xs font-medium text-muted-foreground">
                  Custom
                </label>
                <input
                  type="color"
                  className="mt-1 h-9 w-full cursor-pointer rounded border px-1 py-1"
                  value={
                    (annotation.backgroundColor === undefined
                      ? "#ffffff"
                      : annotation.backgroundColor) || "#ffffff"
                  }
                  onChange={(event) => {
                    updateAnnotation(annotation.id, {
                      backgroundColor: event.target.value,
                    });
                  }}
                />
              </div>
            </div>
            <input
              type="range"
              min={6}
              max={150}
              step={1}
              value={
                Number.isNaN(annotation.fontSize) ||
                annotation.fontSize === undefined ||
                annotation.fontSize === null
                  ? 6
                  : annotation.fontSize
              }
              onChange={(event) => {
                const raw = Number(event.target.value);
                const nextSize = clampFontSize(raw);
                const formatted = formatListText(
                  annotation.text,
                  annotation.listStyle
                );
                const style = getFontStyleForAnnotation(annotation);
                const dims = measureTextDimensions(formatted, nextSize, style);
                updateAnnotation(annotation.id, {
                  fontSize: nextSize,
                  width: dims.width,
                  height: dims.height,
                });
              }}
              className="w-full"
            />
          </div>
        )}
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p>
            Position: X {Math.round(annotation.x)} px • Y{" "}
            {Math.round(annotation.y)} px
          </p>
          <p>
            Size: {Math.round(annotation.width)} ×{" "}
            {Math.round(annotation.height)} px
          </p>
        </div>
      </div>
    );
  };

  const annotationToolsDisabled =
    !selectedFile || isRendering || pages.length === 0;

  const handleCanvasBackgroundClick = () => {
    setSelectedAnnotationId(null);
    setEditingTextId(null);
  };

  return (
    <Card className="border-2 h-fit border-primary/40 bg-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Edit PDF
          {selectedFile && (
            <Badge variant="secondary" className="ml-1">
              {selectedFile.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFile && (
          <AlertNoPdf hasFiles={pdfFiles.length > 0} onExit={onExit} />
        )}

        {selectedFile && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {/* Only show file selector if no specific file was selected (initialFileId is null) */}
              {!initialFileId && pdfFiles.length > 1 && (
                <Select
                  value={internalSelectedFileId ?? ""}
                  onValueChange={(value) => setInternalSelectedFileId(value)}
                  disabled={pdfFiles.length <= 1}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Pick a PDF version" />
                  </SelectTrigger>
                  <SelectContent>
                    {pdfFiles.map((file) => (
                      <SelectItem key={file.id} value={file.id}>
                        {file.name}
                        {file.version ? ` · v${file.version}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Show selected file info when viewing a specific version */}
              {initialFileId && selectedFile && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {selectedFile.name}
                    {selectedFile.version ? ` · v${selectedFile.version}` : ""}
                  </span>
                </div>
              )}

              <Select
                value={String(activePage)}
                onValueChange={(value) => setActivePage(Number(value))}
                disabled={pages.length <= 1}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Page" />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((page) => (
                    <SelectItem
                      key={page.pageNumber}
                      value={String(page.pageNumber)}
                    >
                      Page {page.pageNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-1 justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAnnotations}
                  disabled={annotations.length === 0}
                >
                  <Undo2 className="mr-1 h-4 w-4" />
                  Clear
                </Button>
                <Button variant="ghost" size="sm" onClick={onExit}>
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Place text or images on the canvas. Saving will upload a new
              version and keep previous files intact.
            </p>

            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex-1 overflow-auto bg-transparent p-0">
                {isRendering && (
                  <div className="flex flex-col items-center justify-center gap-2 py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Rendering PDF pages…
                    </p>
                  </div>
                )}

                {!isRendering && pages.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Select a PDF file to begin editing.
                  </p>
                )}

                {!isRendering &&
                  pages.map((page) => (
                    <div key={page.pageNumber} className="mb-6">
                      <div
                        className="relative"
                        style={{ width: page.width, height: page.height }}
                      >
                        <img
                          src={page.imageUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                        />
                        <div
                          className="absolute inset-0"
                          style={{ width: page.width, height: page.height }}
                          onMouseDown={handleCanvasBackgroundClick}
                        >
                          {annotations
                            .filter(
                              (annotation) =>
                                annotation.pageNumber === page.pageNumber
                            )
                            .map((annotation) => {
                              const isText = annotation.type === "text";
                              const displayFontSize = getSafeFontSize(
                                isText ? annotation.fontSize : undefined
                              );
                              const resolvedBg =
                                isText &&
                                annotation.backgroundColor === undefined
                                  ? "#ffffff"
                                  : isText
                                  ? annotation.backgroundColor
                                  : undefined;
                              const isEditing =
                                isText && editingTextId === annotation.id;
                              const resolvedFont = isText
                                ? getFontStyleForAnnotation(annotation)
                                : null;
                              const formattedText = isText
                                ? formatListText(
                                    annotation.text,
                                    annotation.listStyle
                                  )
                                : "";

                              return (
                                <RndAnnotation
                                  key={annotation.id}
                                  annotation={annotation}
                                  selected={
                                    annotation.id === selectedAnnotationId
                                  }
                                  onSelect={() =>
                                    setSelectedAnnotationId(annotation.id)
                                  }
                                  onPositionChange={updateAnnotationPosition}
                                  onResize={updateAnnotationSize}
                                  onRemove={removeAnnotation}
                                  onMouseDownCapture={(event) => {
                                    event.stopPropagation();
                                    setSelectedAnnotationId(annotation.id);
                                    if (isText) {
                                      setEditingTextId(annotation.id);
                                    } else {
                                      setEditingTextId(null);
                                    }
                                  }}
                                >
                                  {isText ? (
                                    isEditing ? (
                                      <textarea
                                        rows={1}
                                        className="
                                          annotation-input
                                          min-w-[24px]
                                          w-full
                                          resize-none
                                          outline-none
                                          pb-2
                                          leading-none
                                          overflow-hidden
                                        "
                                        value={annotation.text}
                                        style={{
                                          fontSize: displayFontSize,
                                          lineHeight: `${displayFontSize}px`,
                                          whiteSpace: "pre-wrap",
                                          fontFamily: resolvedFont?.cssFamily,
                                          fontWeight: resolvedFont?.fontWeight,
                                          fontStyle: resolvedFont?.fontStyle,
                                          color:
                                            annotation.textColor || "#000000",
                                          backgroundColor:
                                            resolvedBg || "transparent",
                                        }}
                                        autoFocus
                                        onBlur={() => setEditingTextId(null)}
                                        onChange={(event) => {
                                          const el = event.target;
                                          el.style.height = "auto";
                                          el.style.height = `${el.scrollHeight}px`;

                                          const newText = el.value;
                                          if (resolvedFont) {
                                            const dims = measureTextDimensions(
                                              formatListText(
                                                newText,
                                                annotation.listStyle
                                              ),
                                              displayFontSize,
                                              resolvedFont
                                            );

                                            updateAnnotation(annotation.id, {
                                              text: newText,
                                              width: dims.width,
                                              height: dims.height,
                                            });
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div
                                        className="h-full w-full cursor-text select-none"
                                        style={{
                                          fontSize: displayFontSize,
                                          lineHeight: `${displayFontSize}px`,
                                          whiteSpace: "pre-wrap",
                                          fontFamily: resolvedFont?.cssFamily,
                                          fontWeight: resolvedFont?.fontWeight,
                                          fontStyle: resolvedFont?.fontStyle,
                                          color:
                                            annotation.textColor || "#000000",
                                          backgroundColor:
                                            resolvedBg || "transparent",
                                        }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedAnnotationId(
                                            annotation.id
                                          );
                                          setEditingTextId(annotation.id);
                                        }}
                                      >
                                        {annotation.text}
                                      </div>
                                    )
                                  ) : (
                                    <img
                                      src={annotation.dataUrl}
                                      alt={annotation.type}
                                      className="h-full w-full rounded object-contain"
                                    />
                                  )}
                                </RndAnnotation>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="w-full max-w-sm space-y-3 rounded-md border bg-background p-3">
                <div className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                  Saving uploads a brand-new PDF to this document. Older
                  versions stay visible in the file list for auditing and
                  rollback.
                </div>

                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-sm font-medium">Annotations</p>
                  <p className="text-xs text-muted-foreground">
                    {annotations.length === 0
                      ? "No annotations yet."
                      : `${annotations.length} item${
                          annotations.length === 1 ? "" : "s"
                        } added`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={handleAddText}
                    disabled={annotationToolsDisabled}
                  >
                    <Type className="mr-1 h-4 w-4" />
                    Add Text
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestAsset("image")}
                    disabled={annotationToolsDisabled}
                  >
                    <ImageIcon className="mr-1 h-4 w-4" />
                    Add Image
                  </Button>
                </div>

                {renderAnnotationControls()}

                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={isSaving || annotations.length === 0}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save as New Version
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        <input
          ref={assetInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAssetChosen}
        />
      </CardContent>
    </Card>
  );
}

interface RndAnnotationProps {
  annotation: Annotation;
  selected: boolean;
  onSelect: () => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onResize: (
    id: string,
    width: number,
    height: number,
    x: number,
    y: number
  ) => void;
  onRemove: (id: string) => void;
  children: React.ReactNode;
  // Rnd uses native MouseEvent; keep this narrow to avoid React MouseEvent mismatch
  onMouseDownCapture?: (event: { stopPropagation: () => void }) => void;
}

function RndAnnotation({
  annotation,
  selected,
  onSelect,
  onPositionChange,
  onResize,
  onRemove,
  children,
  onMouseDownCapture,
}: RndAnnotationProps) {
  const minWidth = annotation.type === "text" ? 24 : 40;
  const minHeight =
    annotation.type === "text"
      ? Math.max(18, Math.round(annotation.fontSize) + 4)
      : 40;
  const enableResizing = {
    top: true,
    right: true,
    bottom: true,
    left: true,
    topRight: true,
    topLeft: true,
    bottomRight: true,
    bottomLeft: true,
  };

  return (
    <Rnd
      size={{ width: annotation.width, height: annotation.height }}
      position={{ x: annotation.x, y: annotation.y }}
      bounds="parent"
      minWidth={minWidth}
      minHeight={minHeight}
      enableResizing={enableResizing}
      dragHandleClassName="annotation-drag-handle"
      onMouseDown={onMouseDownCapture}
      onDragStop={(_, data) => onPositionChange(annotation.id, data.x, data.y)}
      onResizeStop={(_, _dir, ref, _delta, position) => {
        onResize(
          annotation.id,
          ref.offsetWidth,
          ref.offsetHeight,
          position.x,
          position.y
        );
      }}
      className={cn(
        "absolute annotation-drag-handle rounded-md border p-0 shadow-none group",
        selected ? "border-primary ring-2 ring-primary/60" : "border-muted",
        annotation.type === "text" ? "bg-transparent" : "bg-white/0"
      )}
    >
      <div className="relative h-fit w-full p-0">
        <div className="annotation-drag-handle absolute -left-1 -top-8 cursor-pointer flex items-center gap-1 rounded-full border border-muted/50 bg-white/80 px-2 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100">
          <Move className="h-3 w-3" />
          Drag
        </div>
        {children}
        {/* <button
          type="button"
          className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-red-600 shadow"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(annotation.id);
          }}
        >
          <X className="h-3 w-3" />
        </button> */}
      </div>
    </Rnd>
  );
}

function AlertNoPdf({
  hasFiles,
  onExit,
}: {
  hasFiles: boolean;
  onExit: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">
      {hasFiles ? (
        <p>
          None of the uploaded files for this document are PDFs. Upload a PDF
          version first, then reopen the editor.
        </p>
      ) : (
        <p>
          This document does not have any files yet. Upload a PDF via the “Add
          File” button to start editing.
        </p>
      )}
      <Button variant="outline" size="sm" className="mt-3" onClick={onExit}>
        Go back
      </Button>
    </div>
  );
}
