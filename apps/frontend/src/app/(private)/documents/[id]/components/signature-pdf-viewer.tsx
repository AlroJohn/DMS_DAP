"use client";

import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DocumentFileMetadata } from "@/hooks/use-document-files";
import { cn } from "@/lib/utils";
import { Loader2, Move, X } from "lucide-react";
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
}

interface SignaturePdfViewerProps {
  documentId: string;
  files: DocumentFileMetadata[];
  initialFileId?: string | null;
  isLoadingFiles: boolean;
  onExit: () => void;
  onConfirm: (payload: { fileId: string; boxes: SignatureBox[] }) => void;
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
  isLoadingFiles,
  onExit,
  onConfirm,
}: SignaturePdfViewerProps) {
  const pdfFiles = useMemo(
    () => files.filter((file) => isPdfLikeFile(file)),
    [files]
  );

  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    initialFileId ?? pdfFiles[0]?.id ?? null
  );

  const selectedFile = useMemo(() => {
    if (!pdfFiles || pdfFiles.length === 0) return null;
    const targetId = selectedFileId ?? pdfFiles[0]?.id ?? null;
    return targetId ? pdfFiles.find((file) => file.id === targetId) : null;
  }, [pdfFiles, selectedFileId]);

  const [pages, setPages] = useState<PdfPageRender[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [isRendering, setIsRendering] = useState(false);
  const [boxes, setBoxes] = useState<SignatureBox[]>([]);

  const RENDER_SCALE = 1.4;

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
    const targetPage = pages.find((p) => p.pageNumber === activePage);
    if (!targetPage) return;

    const defaultWidth = Math.min(180, targetPage.width * 0.4);
    const defaultHeight = Math.min(60, targetPage.height * 0.08);

    const newBox: SignatureBox = {
      id: createId(),
      pageNumber: targetPage.pageNumber,
      x: (targetPage.width - defaultWidth) / 2,
      y: (targetPage.height - defaultHeight) / 2,
      width: defaultWidth,
      height: defaultHeight,
    };

    setBoxes((prev) => [...prev, newBox]);
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
      prev.map((box) =>
        box.id === id ? { ...box, width, height, x, y } : box
      )
    );
  };

  const handleRemove = (id: string) => {
    setBoxes((prev) => prev.filter((box) => box.id !== id));
  };

  const handleConfirm = () => {
    if (!selectedFileId) {
      toast.error("No PDF file selected. Please select a PDF file before confirming signature positions.");
      console.error("No file selected for signature.");
      return;
    }

    if (boxes.length === 0) {
      toast.error("No signature positions added. Please add at least one signature position before confirming.");
      return;
    }

    onConfirm({ fileId: selectedFileId, boxes });
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

  return (
    <Card className="h-full w-full min-h-[600px] flex flex-col border-primary/40">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Prepare Signature Positions
            <Badge variant="outline">For Signature</Badge>
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
            <div className="flex flex-wrap gap-1">
              {pdfFiles.map((file) => (
                <Button
                  key={file.id}
                  variant={file.id === selectedFileId ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedFileId(file.id)}
                >
                  {file.name}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Page
            </span>
            <div className="flex flex-wrap gap-1">
              {pages.map((page) => (
                <Button
                  key={page.pageNumber}
                  variant={
                    page.pageNumber === activePage ? "secondary" : "ghost"
                  }
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setActivePage(page.pageNumber)}
                >
                  {page.pageNumber}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 flex-1 overflow-hidden">
          <div className="flex-1 flex items-center justify-center overflow-auto rounded-md border bg-muted/20 min-h-[300px]">
            {isRendering || !activePageData ? (
              <div className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading PDF page...</span>
              </div>
            ) : (
              <div
                className="relative"
                style={{
                  width: activePageData.width,
                  height: activePageData.height,
                }}
              >
                <img
                  src={activePageData.imageUrl}
                  alt={`Page ${activePageData.pageNumber}`}
                  className="h-full w-full object-contain rounded-md border bg-white"
                />

                {boxes
                  .filter((box) => box.pageNumber === activePage)
                  .map((box) => (
                    <Rnd
                      key={box.id}
                      size={{ width: box.width, height: box.height }}
                      position={{ x: box.x, y: box.y }}
                      bounds="parent"
                      minWidth={80}
                      minHeight={40}
                      enableResizing={{
                        top: true,
                        right: true,
                        bottom: true,
                        left: true,
                        topRight: true,
                        topLeft: true,
                        bottomRight: true,
                        bottomLeft: true,
                      }}
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
                      className={cn(
                        "absolute rounded-md border-2 border-primary/70 bg-primary/10 shadow-sm"
                      )}
                    >
                      <div className="relative h-full w-full">
                        <div className="signature-box-drag-handle absolute -left-1 -top-8 cursor-pointer flex items-center gap-1 rounded-full border border-muted/50 bg-white/90 px-2 py-0.5 text-[10px] text-muted-foreground">
                          <Move className="h-3 w-3" />
                          Drag to position
                        </div>
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-medium text-primary">
                          Signature
                        </div>
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
                      </div>
                    </Rnd>
                  ))}
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
              <Button
                type="button"
                size="sm"
                className="mt-1 w-full"
                variant="outline"
                onClick={handleAddBox}
                disabled={isRendering || !pages.length}
              >
                Add Signature Box
              </Button>
            </div>

            <div className="rounded-md border bg-background p-3 text-xs space-y-2 max-h-64 overflow-auto">
              {boxes.length === 0 ? (
                <p className="text-muted-foreground">
                  No signature boxes yet. Use &quot;Add Signature Box&quot; to
                  place one on the current page.
                </p>
              ) : (
                boxes.map((box, index) => (
                  <div
                    key={box.id}
                    className="flex items-start justify-between gap-2 rounded border p-2"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        Signature {index + 1} (Page {box.pageNumber})
                      </p>
                      <p className="text-muted-foreground">
                        X: {box.x.toFixed(0)}, Y: {box.y.toFixed(0)} | W:{" "}
                        {box.width.toFixed(0)}, H: {box.height.toFixed(0)}
                      </p>
                    </div>
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
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

