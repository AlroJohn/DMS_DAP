"use client";

import { useEffect, useMemo, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";
import { useQuery, useMutation } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DocumentFileMetadata } from "@/hooks/use-document-files";
import { cn } from "@/lib/utils";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { SignaturePad } from "@/components/signature-pad";
import { useAuth } from "@/hooks/use-auth";

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
}

interface SigningPdfViewerProps {
  documentId: string;
  files: DocumentFileMetadata[];
  initialFileId?: string | null;
  isLoadingFiles: boolean;
  onExit: () => void;
  onSigned: () => void;
}

const isPdfLikeFile = (file?: DocumentFileMetadata | null) => {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  if (type.includes("pdf")) return true;
  const name = (file.name || "").toLowerCase();
  return name.endsWith(".pdf");
};

export function SigningPdfViewer({
  documentId,
  files,
  initialFileId,
  isLoadingFiles,
  onExit,
  onSigned,
}: SigningPdfViewerProps) {
  const { user } = useAuth();
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

  // Signature state
  const [selectedPlaceholder, setSelectedPlaceholder] =
    useState<SignaturePlaceholder | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [placedSignatures, setPlacedSignatures] = useState<
    Record<string, string>
  >({});

  const RENDER_SCALE = 1.4;

  // Fetch placeholders
  const { data: placeholders = [], isLoading: isLoadingPlaceholders } =
    useQuery({
      queryKey: ["signature-placeholders", documentId],
      queryFn: async () => {
        const response = await fetch(
          `/api/document-signatures/documents/${documentId}/signature-placeholders`
        );
        if (!response.ok)
          throw new Error("Failed to fetch signature placeholders");
        return response.json() as Promise<SignaturePlaceholder[]>;
      },
      enabled: !!documentId,
    });

  // Filter placeholders for the selected file
  const filePlaceholders = useMemo(() => {
    if (!selectedFileId) return [];
    return placeholders.filter((p) => p.document_file_id === selectedFileId);
  }, [placeholders, selectedFileId]);

  // Sign mutation
  const signMutation = useMutation({
    mutationFn: async (data: {
      placeholder: SignaturePlaceholder;
      signatureData: string;
    }) => {
      const response = await fetch(
        `/api/document-signatures/documents/${documentId}/place-signature`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            signee_id: user?.user_id,
            document_file_id: data.placeholder.document_file_id,
            page_number: data.placeholder.page_number,
            x_position: data.placeholder.x_position,
            y_position: data.placeholder.y_position,
            width: data.placeholder.width,
            height: data.placeholder.height,
            signature_data: data.signatureData,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save signature");
      }
      return response.json();
    },
    onSuccess: (_result, variables) => {
      toast.success("Signature placed successfully");
      // Show the signature on the currently selected placeholder for immediate feedback
      const placeholderId = variables.placeholder.placeholder_id;
      setPlacedSignatures((prev) => ({
        ...prev,
        [placeholderId]: variables.signatureData,
      }));
      setSignatureData(null);
      setSelectedPlaceholder(null);
      onSigned();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

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

  // Auto-navigate to first page with pending signature
  useEffect(() => {
    if (filePlaceholders.length > 0 && pages.length > 0) {
      const firstPlaceholder = filePlaceholders[0];
      if (firstPlaceholder.page_number !== activePage) {
        setActivePage(firstPlaceholder.page_number);
      }
    }
  }, [filePlaceholders, pages.length]); // Run when placeholders or pages load

  const handlePlaceholderClick = (placeholder: SignaturePlaceholder) => {
    setSelectedPlaceholder(placeholder);
  };

  const handleConfirmSignature = () => {
    if (!selectedPlaceholder || !signatureData) return;
    signMutation.mutate({
      placeholder: selectedPlaceholder,
      signatureData,
    });
  };

  if (isLoadingFiles || isLoadingPlaceholders) {
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

  if (!pdfFiles.length) {
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
  const pendingCount = filePlaceholders.length;

  return (
    <Card className="h-full w-full min-h-[600px] flex flex-col border-primary/40">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">
            {selectedFile?.name || "Sign Document"}
          </CardTitle>
          {pdfFiles.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                File
              </span>
              <div className="flex flex-wrap gap-1">
                {pdfFiles.map((file) => (
                  <Button
                    key={file.id}
                    variant={file.id === selectedFileId ? "secondary" : "ghost"}
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setSelectedFileId(file.id)}
                  >
                    {file.name}
                  </Button>
                ))}
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
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3 flex-1 overflow-hidden">
          {/* Sidebar for pending signatures */}
          <div className="w-full md:w-48 flex flex-col gap-2 overflow-y-auto border-r pr-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Signatures
            </h3>
            {filePlaceholders.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                No pending signatures
              </div>
            ) : (
              filePlaceholders.map((p, i) => (
                <Button
                  key={p.placeholder_id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-auto py-2 whitespace-normal text-left"
                  onClick={() => {
                    if (p.page_number !== activePage)
                      setActivePage(p.page_number);
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">Signature #{i + 1}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Page {p.page_number}
                    </span>
                  </div>
                </Button>
              ))
            )}
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto rounded-md border bg-muted/20 min-h-[300px]">
            {isRendering || !activePageData ? (
              <div className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading PDF page...</span>
              </div>
            ) : (
              <div
                className="relative shadow-lg"
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
                {filePlaceholders
                  .filter((p) => p.page_number === activePage)
                  .map((placeholder, index) => (
                    <div
                      key={placeholder.placeholder_id}
                      style={{
                        position: "absolute",
                        left: placeholder.x_position * RENDER_SCALE,
                        top: placeholder.y_position * RENDER_SCALE,
                        width: placeholder.width * RENDER_SCALE,
                        height: placeholder.height * RENDER_SCALE,
                        zIndex: 10, // Ensure it's on top
                      }}
                      className="group cursor-pointer rounded-md border-2 border-dashed border-yellow-500 bg-yellow-500/20 hover:bg-yellow-500/40 transition-all flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent bubbling
                        handlePlaceholderClick(placeholder);
                      }}
                    >
                      {placedSignatures[placeholder.placeholder_id] ? (
                        <img
                          src={placedSignatures[placeholder.placeholder_id]}
                          alt="Signature"
                          className="h-full w-full object-contain rounded-md bg-white"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-yellow-700 font-bold bg-white/80 px-2 py-1 rounded shadow-sm animate-pulse">
                          <PenLine className="h-4 w-4" />
                          <span className="text-[10px]">Sign Here</span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 border-t pt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-muted-foreground">
              Signature Pad
            </h3>
            <p className="text-xs text-muted-foreground">
              Select a &quot;Sign Here&quot; box on the document, then draw or upload your
              signature below. When ready, click &quot;Confirm Signature&quot; to place it.
            </p>
          </div>

          <SignaturePad
            value={signatureData || undefined}
            onChange={setSignatureData}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onExit}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSignature}
              disabled={
                !selectedPlaceholder || !signatureData || signMutation.isPending
              }
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm Signature"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
