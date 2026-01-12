"use client";

import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentFileMetadata } from "@/hooks/use-document-files";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Loader2, Move, X } from "lucide-react";
import { toast } from "sonner";

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

export interface SignatureBox {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isExisting?: boolean;
}

interface SignaturePdfViewerProps {
  documentId: string;
  files: DocumentFileMetadata[];
  initialFileId?: string | null;
  targetFileIds?: string[];
  isLoadingFiles: boolean;
  onExit: () => void;
  onConfirm: (payload: {
    fileId: string;
    boxes: SignatureBox[];
    targetFileIds?: string[];
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

export function SignaturePdfViewer({
  documentId,
  files,
  initialFileId,
  targetFileIds,
  isLoadingFiles,
  onExit,
  onConfirm,
}: SignaturePdfViewerProps) {
  const pdfFiles = useMemo(
    () => files.filter((file) => isPdfLikeFile(file)),
    [files]
  );

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
    initialFileId ?? selectableFiles[0]?.id ?? null
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
      (file) => file.id === selectedFileId
    );
    if (!isAvailable) {
      setSelectedFileId(selectableFiles[0]?.id ?? null);
    }
  }, [selectableFiles, selectedFileId]);

  const [pages, setPages] = useState<PdfPageRender[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [isRendering, setIsRendering] = useState(false);
  const [boxes, setBoxes] = useState<SignatureBox[]>([]);
  const [isPlacingBox, setIsPlacingBox] = useState(false);

  const RENDER_SCALE = useMemo(() => 1.4, []);

  const { data: placeholders = [] } = useQuery({
    queryKey: ["signature-placeholders", documentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/document-signatures/documents/${documentId}/signature-placeholders`
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

  useEffect(() => {
    if (!selectedFileId) {
      setBoxes([]);
      return;
    }

    // Create a stable reference to existing boxes to prevent infinite loops
    const newExistingBoxes = placeholders
      .filter((placeholder) => placeholder.document_file_id === selectedFileId)
      .map((placeholder) => ({
        id: placeholder.placeholder_id,
        pageNumber: placeholder.page_number,
        x: placeholder.x_position * RENDER_SCALE,
        y: placeholder.y_position * RENDER_SCALE,
        width: placeholder.width * RENDER_SCALE,
        height: placeholder.height * RENDER_SCALE,
        isExisting: true,
      }));

    setBoxes((prevBoxes) => {
      // Separate existing and new boxes
      const prevExistingBoxes = prevBoxes.filter(b => b.isExisting);
      const prevNewBoxes = prevBoxes.filter(b => !b.isExisting);

      // Check if existing boxes have changed by comparing IDs and positions
      const hasExistingBoxesChanged =
        newExistingBoxes.length !== prevExistingBoxes.length ||
        !newExistingBoxes.every((newBox) =>
          prevExistingBoxes.some(prevBox =>
            prevBox.id === newBox.id &&
            prevBox.x === newBox.x &&
            prevBox.y === newBox.y &&
            prevBox.width === newBox.width &&
            prevBox.height === newBox.height
          )
        );

      if (!hasExistingBoxesChanged) {
        // Only return new boxes if existing ones haven't changed
        return [...newExistingBoxes, ...prevNewBoxes];
      }

      return [...newExistingBoxes, ...prevNewBoxes];
    });
  }, [selectedFileId, placeholders, RENDER_SCALE]);

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
            "PDF render was cancelled or worker was destroyed during cleanup."
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

  useEffect(() => {
    if (pages.length === 0) {
      setActivePage(1);
    } else if (activePage > pages.length) {
      setActivePage(1);
    }
  }, [pages, activePage]);

  const handleAddBox = () => {
    if (!pages.length) return;
    setIsPlacingBox((prev) => !prev);
  };

  const handlePlaceBox = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingBox || !pages.length) return;
    const targetPage = pages.find((p) => p.pageNumber === activePage);
    if (!targetPage) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const defaultWidth = Math.min(180, targetPage.width * 0.4);
    const defaultHeight = Math.min(60, targetPage.height * 0.08);

    const maxX = Math.max(0, targetPage.width - defaultWidth);
    const maxY = Math.max(0, targetPage.height - defaultHeight);

    const x = Math.min(Math.max(clickX - defaultWidth / 2, 0), maxX);
    const y = Math.min(Math.max(clickY - defaultHeight / 2, 0), maxY);

    const newBox: SignatureBox = {
      id: createId(),
      pageNumber: targetPage.pageNumber,
      x,
      y,
      width: defaultWidth,
      height: defaultHeight,
      isExisting: false,
    };

    setBoxes((prev) => [...prev, newBox]);
    setIsPlacingBox(false);
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    setBoxes((prev) =>
      prev.map((box) => (box.id === id ? { ...box, x, y } : box))
    );
  };

  const handleResize = (
    id: string,
    width: number,
    height: number,
    x: number,
    y: number
  ) => {
    setBoxes((prev) =>
      prev.map((box) => (box.id === id ? { ...box, width, height, x, y } : box))
    );
  };

  const handleRemove = (id: string) => {
    setBoxes((prev) => prev.filter((box) => box.id !== id));
  };

  const handleConfirm = () => {
    if (!selectedFileId) {
      toast.error(
        "No PDF file selected. Please select a PDF file before confirming signature positions."
      );
      console.error("No file selected for signature.");
      return;
    }

    const newBoxes = boxes.filter((box) => !box.isExisting);
    if (newBoxes.length === 0) {
      toast.error(
        "No new signature positions added. Please add at least one signature position before confirming."
      );
      return;
    }

    const targets = normalizedTargetFileIds.length
      ? normalizedTargetFileIds
      : [selectedFileId];
    onConfirm({
      fileId: selectedFileId,
      boxes: newBoxes,
      targetFileIds: targets.filter(Boolean) as string[],
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
          <div className="rounded-md border border-dashed border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">
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

  return (
    <Card className="h-full w-full min-h-[600px] flex flex-col border-primary/40">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Prepare Signature Positions
            <Badge variant="outline">For Signature</Badge>
            {applyingToCount > 1 && (
              <Badge variant="secondary">{applyingToCount} files</Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Add one or more signature boxes on the PDF. These positions will be
            used when processing the document for signature.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onExit}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={boxes.length === 0 || isRendering}
          >
            {isRendering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rendering PDF...
              </>
            ) : (
              "Confirm Signature Boxes"
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
          <div className="flex-1 overflow-auto rounded-md bg-muted/20 min-h-[300px]">
            {isRendering || !activePageData ? (
              <div className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading PDF page...</span>
              </div>
            ) : (
              <div className="flex items-center object-fill justify-center min-h-full min-w-full">
                <div
                  className={cn("relative", isPlacingBox && "cursor-crosshair")}
                  style={{
                    width: activePageData.width,
                    height: activePageData.height,
                  }}
                  onClick={handlePlaceBox}
                >
                  <img
                    src={activePageData.imageUrl}
                    alt={`Page ${activePageData.pageNumber}`}
                    className="h-full w-full object-contain rounded-md border bg-white"
                  />

                  {boxesWithIndices
                    .filter(({ box }) => box.pageNumber === activePage)
                    .map(({ box, index }) => (
                      <Rnd
                        key={box.id}
                        size={{ width: box.width, height: box.height }}
                        position={{ x: box.x, y: box.y }}
                        bounds="parent"
                        minWidth={50}
                        minHeight={30}
                        disableDragging={box.isExisting}
                        enableResizing={
                          box.isExisting
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
                            position.y
                          );
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event: { stopPropagation: () => any }) =>
                          event.stopPropagation()
                        }
                        className={cn(
                          "absolute rounded-md border-2 shadow-sm",
                          box.isExisting
                            ? "border-emerald-500/70 bg-emerald-500/10"
                            : "border-primary/70 bg-primary/10"
                        )}
                      >
                        <div className="relative h-full w-full">
                          {!box.isExisting && (
                            <div className="signature-box-drag-handle absolute -left-1 -top-8 cursor-pointer flex items-center gap-1 rounded-full border border-muted/50 bg-white/90 px-2 py-0.5 text-[10px] text-muted-foreground">
                              <Move className="h-3 w-3" />
                              Drag to position
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
                              className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-destructive shadow"
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
                </div>
              </div>
            )}
          </div>

          <div className="w-full md:w-72 flex flex-col gap-3">
            <div className="rounded-md border bg-background p-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Signature Boxes</span>
                <Badge variant="outline">{boxes.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Add one or more boxes where signers need to sign. You can drag
                and resize them on the page.
              </p>
              {isPlacingBox && (
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
                disabled={isRendering || !pages.length}
              >
                {isPlacingBox ? "Cancel Placement" : "Add Signature Box"}
              </Button>
            </div>

            <div className="rounded-md border bg-background p-3 text-xs space-y-2 max-h-64 overflow-auto">
              {boxes.length === 0 ? (
                <p className="text-muted-foreground">
                  No signature boxes yet. Use &quot;Add Signature Box&quot; to
                  place one on the current page.
                </p>
              ) : (
                boxesWithIndices.map(({ box, index }) => (
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
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
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
                              box.y
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
                              Number(e.target.value)
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
                            const value = Math.max(50, Number(e.target.value));
                            handleResize(
                              box.id,
                              value,
                              box.height,
                              box.x,
                              box.y
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
                            const value = Math.max(30, Number(e.target.value));
                            handleResize(
                              box.id,
                              box.width,
                              value,
                              box.x,
                              box.y
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
