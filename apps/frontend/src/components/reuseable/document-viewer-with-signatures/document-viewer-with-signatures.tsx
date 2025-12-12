"use client";

import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Skeleton } from "@/components/ui/skeleton";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface DocumentViewerWithSignaturesProps {
  documentFiles: Array<{
    id: string;
    name: string;
    downloadUrl: string;
    isPrimary: boolean;
  }>;
  signedDocuments: Array<{
    signed_document_id: string;
    documentFileFile_id: string;
    signature_data: string;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
    page_number: number;
  }>;
  activeSignatureData?: string | null;
  onConfirmSignaturePlacement?: (coords: {
    signatureData: string;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
    page_number: number;
  }) => Promise<void>;
  onCancelSignaturePlacement?: () => void;
}

export function DocumentViewerWithSignatures({
  documentFiles,
  signedDocuments,
  activeSignatureData,
  onConfirmSignaturePlacement,
  onCancelSignaturePlacement,
}: DocumentViewerWithSignaturesProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [placementSignatureCoords, setPlacementSignatureCoords] = useState({
    x: 0,
    y: 0,
    width: 200, // Default width
    height: 50, // Default height
    page: 1,
  });
  const [isPlacingSignature, setIsPlacingSignature] = useState(false);
  const [isSavingPlacement, setIsSavingPlacement] = useState(false);

  // Effect to initialize placement mode when activeSignatureData changes
  useEffect(() => {
    if (activeSignatureData) {
      setIsPlacingSignature(true);
      setPlacementSignatureCoords({
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        page: pageNumber,
      }); // Reset coords
    } else {
      setIsPlacingSignature(false);
      setPlacementSignatureCoords({ x: 0, y: 0, width: 0, height: 0, page: 0 }); // Clear coords
    }
  }, [activeSignatureData, pageNumber]);

  const primaryFile =
    documentFiles.find((file) => file.isPrimary) || documentFiles[0];
  const fileUrl = primaryFile?.downloadUrl;

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1); // Reset to first page on new document load
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: any) {
    console.error("Error loading PDF document:", error);
    setError("Failed to load document. Please try again.");
    setLoading(false);
  }

  const handlePlaceSignature = async () => {
    if (!activeSignatureData || !onConfirmSignaturePlacement) return;

    setIsSavingPlacement(true);
    try {
      await onConfirmSignaturePlacement({
        signatureData: activeSignatureData,
        x_position: placementSignatureCoords.x,
        y_position: placementSignatureCoords.y,
        width: placementSignatureCoords.width,
        height: placementSignatureCoords.height,
        page_number: pageNumber,
      });
      setIsPlacingSignature(false);
      // activeSignatureData and placementSignatureCoords will be reset by parent
    } catch (err) {
      console.error("Error confirming signature placement:", err);
      // Keep placement mode active for user to retry or adjust
    } finally {
      setIsSavingPlacement(false);
    }
  };

  const handleCancelPlacement = () => {
    setIsPlacingSignature(false);
    if (onCancelSignaturePlacement) {
      onCancelSignaturePlacement();
    }
    // activeSignatureData will be reset by parent
  };

  if (!fileUrl) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No document file available for viewing.
      </div>
    );
  }

  if (loading) {
    return <Skeleton className="w-full h-full min-h-[500px]" />;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  const signaturesForCurrentPage = signedDocuments.filter(
    (sig) =>
      sig.documentFileFile_id === primaryFile?.id &&
      sig.page_number === pageNumber
  );

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {isPlacingSignature && (
        <div className="flex justify-center mb-4 gap-2">
          <Button onClick={handlePlaceSignature} disabled={isSavingPlacement}>
            {isSavingPlacement ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing...
              </>
            ) : (
              "Place Signature"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancelPlacement}
            disabled={isSavingPlacement}
          >
            Cancel Placement
          </Button>
        </div>
      )}

      <div className="flex justify-center mb-4 gap-2">
        <button
          type="button"
          disabled={pageNumber <= 1 || isPlacingSignature}
          onClick={() =>
            setPageNumber((prevPageNumber) => {
              setPlacementSignatureCoords((prev) => ({
                ...prev,
                page: prevPageNumber - 1,
              }));
              return prevPageNumber - 1;
            })
          }
          className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm font-medium">
          Page {pageNumber} of {numPages || "--"}
        </span>
        <button
          type="button"
          disabled={pageNumber >= (numPages || 0) || isPlacingSignature}
          onClick={() =>
            setPageNumber((prevPageNumber) => {
              setPlacementSignatureCoords((prev) => ({
                ...prev,
                page: prevPageNumber + 1,
              }));
              return prevPageNumber + 1;
            })
          }
          className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <div className="relative border shadow-lg rounded-md overflow-hidden">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          className="w-full h-full"
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="relative"
            onRenderSuccess={() => setLoading(false)}
          >
            {signaturesForCurrentPage.map((sig) => (
              <img
                key={sig.signed_document_id}
                src={sig.signature_data}
                alt="Signature"
                style={{
                  position: "absolute",
                  left: `${sig.x_position}px`,
                  top: `${sig.y_position}px`,
                  width: `${sig.width}px`,
                  height: `${sig.height}px`,
                  zIndex: 100, // Ensure signature is on top
                }}
              />
            ))}

            {isPlacingSignature &&
              activeSignatureData &&
              placementSignatureCoords.page === pageNumber && (
                <Draggable
                  bounds="parent"
                  defaultPosition={{
                    x: placementSignatureCoords.x,
                    y: placementSignatureCoords.y,
                  }}
                  onStop={(e, data) => {
                    setPlacementSignatureCoords((prev) => ({
                      ...prev,
                      x: data.x,
                      y: data.y,
                    }));
                  }}
                >
                  <ResizableBox
                    width={placementSignatureCoords.width}
                    height={placementSignatureCoords.height}
                    minConstraints={[50, 20]}
                    maxConstraints={[300, 100]}
                    lockAspectRatio={true} // Maintain aspect ratio for signatures
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-100/30 flex items-center justify-center cursor-move"
                    style={{ zIndex: 101 }}
                  >
                    <img
                      src={activeSignatureData}
                      alt="New Signature"
                      className="w-full h-full object-contain pointer-events-none" // Disable pointer events to allow dragging/resizing parent
                    />
                  </ResizableBox>
                </Draggable>
              )}
          </Page>
        </Document>
      </div>
    </div>
  );
}
