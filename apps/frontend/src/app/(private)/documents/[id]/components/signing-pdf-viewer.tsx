"use client";

import { useEffect, useMemo, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf";
import { useQuery } from "@tanstack/react-query";
import { PDFDocument } from "pdf-lib";

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
  const [isSaving, setIsSaving] = useState(false);

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

  const { data: signatures = [], refetch: refetchSignatures } = useQuery({
    queryKey: ["document-signatures", documentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/document-signatures/documents/${documentId}/signatures`
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

  // Filter placeholders for the selected file
  const filePlaceholders = useMemo(() => {
    if (!selectedFileId) return [];
    return placeholders.filter((p) => p.document_file_id === selectedFileId);
  }, [placeholders, selectedFileId]);

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
    if (signedPlaceholderIds.has(placeholder.placeholder_id)) {
      toast.info("This placeholder already has a signature.");
      return;
    }
    setSelectedPlaceholder(placeholder);
  };

  const handleSaveDraft = () => {
    if (!selectedPlaceholder || !signatureData) return;
    const placeholderId = selectedPlaceholder.placeholder_id;
    setPlacedSignatures((prev) => ({
      ...prev,
      [placeholderId]: signatureData,
    }));
    setSignatureData(null);
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
    toast.success("Signature draft cleared.");
  };

  const handleConfirmSignature = async () => {
    if (!selectedFile) return;

    const pendingSignatures: Record<string, string> = {
      ...placedSignatures,
    };

    if (selectedPlaceholder && signatureData) {
      pendingSignatures[selectedPlaceholder.placeholder_id] = signatureData;
    }

    if (Object.keys(pendingSignatures).length === 0) {
      toast.error("Save at least one signature draft before confirming.");
      return;
    }

    setIsSaving(true);
    try {
      const pdfResponse = await fetch(
        `/api/documents/${documentId}/files/${selectedFile.id}/stream?download=1`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!pdfResponse.ok) {
        throw new Error("Unable to download PDF for signing.");
      }

      const buffer = await pdfResponse.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);

      const placeholderById = new Map(
        filePlaceholders.map((placeholder) => [
          placeholder.placeholder_id,
          placeholder,
        ])
      );

      for (const [placeholderId, dataUrl] of Object.entries(
        pendingSignatures
      )) {
        const placeholder = placeholderById.get(placeholderId);
        if (!placeholder) {
          continue;
        }

        const pageMeta = pages.find(
          (p) => p.pageNumber === placeholder.page_number
        );
        if (!pageMeta) {
          throw new Error(
            "Unable to find page metadata for signature placement."
          );
        }

        const page = pdfDoc.getPage(placeholder.page_number - 1);
        const { width: pageWidth, height: pageHeight } = page.getSize();

        const scaleX = pageWidth / pageMeta.pdfWidth;
        const scaleY = pageHeight / pageMeta.pdfHeight;

        const renderWidth = placeholder.width * scaleX;
        const renderHeight = placeholder.height * scaleY;
        const x = placeholder.x_position * scaleX;
        const y =
          pageHeight - placeholder.y_position * scaleY - renderHeight;

        const sigBytes = dataUrlToUint8Array(dataUrl);
        const isPng = dataUrl.startsWith("data:image/png");
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

      const pdfBytes: Uint8Array = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });

      const formData = new FormData();
      const fileName = selectedFile.name || "signed-document.pdf";
      formData.append("file", blob, fileName);

      const uploadResponse = await fetch(
        `/api/documents/${documentId}/files/${selectedFile.id}`,
        {
          method: "PUT",
          credentials: "include",
          body: formData,
        }
      );

      const uploadResult = await uploadResponse.json().catch(() => ({
        success: uploadResponse.ok,
      }));

      if (!uploadResponse.ok || uploadResult.success === false) {
        throw new Error(
          uploadResult.error?.message || "Failed to upload signed PDF."
        );
      }

      if (!user?.user_id) {
        throw new Error("User information missing for signature tracking.");
      }

      await Promise.all(
        Object.entries(pendingSignatures).map(([placeholderId, dataUrl]) => {
          const placeholder = placeholderById.get(placeholderId);
          if (!placeholder) return Promise.resolve();

          return fetch(
            `/api/document-signatures/documents/${documentId}/place-signature`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                signee_id: user.user_id,
                document_file_id: placeholder.document_file_id,
                page_number: placeholder.page_number,
                x_position: placeholder.x_position,
                y_position: placeholder.y_position,
                width: placeholder.width,
                height: placeholder.height,
                signature_data: dataUrl,
              }),
            }
          );
        })
      );

      toast.success("All signature drafts saved to the existing file.");

      setPlacedSignatures({});
      setSignatureData(null);
      setSelectedPlaceholder(null);

      refetchSignatures();
      onSigned();
    } catch (error: any) {
      console.error("Failed to save signed PDF", error);
      toast.error(
        error?.message || "Unable to save signed PDF. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
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
  const hasDrafts = Object.keys(placedSignatures).length > 0;
  const hasCurrentSignature = Boolean(selectedPlaceholder && signatureData);
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
                (() => {
                  const isSigned = signedPlaceholderIds.has(p.placeholder_id);
                  return (
                <Button
                  key={p.placeholder_id}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-auto py-2 whitespace-normal text-left"
                  disabled={isSigned}
                  onClick={() => {
                    if (!isSigned) {
                      setSelectedPlaceholder(p);
                      if (p.page_number !== activePage) {
                        setActivePage(p.page_number);
                      }
                    }
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">Signature #{i + 1}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Page {p.page_number}
                    </span>
                    {isSigned && (
                      <span className="text-[10px] text-emerald-600">
                        Signed
                      </span>
                    )}
                  </div>
                </Button>
                  );
                })()
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
                  .map((placeholder) => {
                    const signedData = signatureDataByPlaceholderId.get(
                      placeholder.placeholder_id
                    );
                    const overlaySignature =
                      signedData ||
                      (selectedPlaceholder &&
                        signatureData &&
                        selectedPlaceholder.placeholder_id ===
                          placeholder.placeholder_id &&
                        signatureData) ||
                      placedSignatures[placeholder.placeholder_id];
                    const isSigned = signedPlaceholderIds.has(
                      placeholder.placeholder_id
                    );

                    return (
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
                        className={cn(
                          "group rounded-md border-2 border-dashed transition-all flex items-center justify-center",
                          isSigned
                            ? "border-emerald-500 bg-emerald-500/15 cursor-not-allowed"
                            : "border-yellow-500 bg-yellow-500/20 hover:bg-yellow-500/40 cursor-pointer"
                        )}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent bubbling
                          handlePlaceholderClick(placeholder);
                        }}
                      >
                        {overlaySignature ? (
                          <img
                            src={overlaySignature}
                            alt="Signature"
                            className="h-full w-full object-contain rounded-md bg-white"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-yellow-700 font-bold bg-white/80 px-2 py-1 rounded shadow-sm animate-pulse">
                            <PenLine className="h-4 w-4" />
                            <span className="text-[10px]">
                              {isSigned ? "Signed" : "Sign Here"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
              signature below. Save each draft before confirming all signatures.
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
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!selectedPlaceholder || !signatureData || isSaving}
            >
              Save Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDraft}
              disabled={!selectedPlaceholder || !hasSelectedDraft || isSaving}
            >
              Clear Draft
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSignature}
              disabled={
                isSaving || (!hasDrafts && !hasCurrentSignature)
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm Signatures"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
