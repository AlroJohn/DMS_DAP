"use client";

import { DataTable } from "@/components/reuseable/tables/data-table";
import { createArchiveColumns, type ArchiveDocument } from "./columns";
import { useArchive } from "@/hooks/use-archive";
import { useSocket } from "@/components/providers/providers";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useMemo, useRef } from "react";
import { useDocumentTypes } from "@/hooks/use-document-types";

export default function ArchivePage() {
  const {
    archivedDocuments: rawArchivedDocuments,
    loading,
    error,
    fetchArchivedDocuments,
  } = useArchive();
  const { socket } = useSocket();
  const { documentTypes } = useDocumentTypes();
  const mountedRef = useRef(false);

  const documentTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    documentTypes.forEach((type) => {
      map[type.type_id] = type.name;
    });
    return map;
  }, [documentTypes]);

  const columns = useMemo(
    () => createArchiveColumns({ documentTypeMap }),
    [documentTypeMap]
  );

  // Mark component as mounted and clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("documents:returnTo", "/documents/archive");
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Transform the raw archived documents to match the ArchiveDocument type
  const mappedDocuments: ArchiveDocument[] = (rawArchivedDocuments || []).map(
    (d: any) => ({
      id: d.document_id || d.id || "",
      qrCode: d.qrCode || "",
      barcode: d.barcode || "",
      document: d.title || d.document || "",
      documentId: d.document_code || d.documentId || d.id || "",
      contactPerson: d.contactPerson || "",
      contactOrganization: d.contactOrganization || "",
      type: d.type as string,
      classification: (d.classification || "") as string,
      currentLocation: (d.currentLocation || "Archive") as string,
      status: (d.status || "completed") as string,
      activity: d.activity || "Archived",
      activityTime: d.activityTime || d.updated_at || d.deleted_at || "",
      deletedBy: d.deletedBy || d.deleted_by || "",
      deletedAt: d.deletedAt || d.deleted_at || "",
      restoredBy: d.restoredBy || d.restored_by || undefined,
      restoredAt: d.restoredAt || d.restored_at || undefined,
      // Add security related fields if they exist
      lockStatus: d.lockStatus || d.lock_status || undefined,
      lockedBy: d.lockedBy || d.locked_by || undefined,
      lockedAt: d.lockedAt || d.locked_at || undefined,
      ocrStatus: d.ocrStatus || d.ocr_status || undefined,
      ocrProgress: d.ocrProgress || d.ocr_progress || undefined,
      integrityStatus: d.integrityStatus || d.integrity_status || undefined,
      checksum: d.checksum || undefined,
      encryptionStatus: d.encryptionStatus || d.encryption_status || undefined,
    })
  );

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;

    const handleDocumentAdded = () => {
      if (mountedRef.current) {
        try {
          fetchArchivedDocuments();
        } catch (err) {
          console.error("Error refetching documents on documentAdded:", err);
        }
      }
    };

    const handleDocumentUpdated = () => {
      if (mountedRef.current) {
        try {
          fetchArchivedDocuments();
        } catch (err) {
          console.error("Error refetching documents on documentUpdated:", err);
        }
      }
    };

    const handleDocumentDeleted = () => {
      if (mountedRef.current) {
        try {
          fetchArchivedDocuments();
        } catch (err) {
          console.error("Error refetching documents on documentDeleted:", err);
        }
      }
    };

    // Listen for document-related events
    socket.on("documentAdded", handleDocumentAdded);
    socket.on("documentUpdated", handleDocumentUpdated);
    socket.on("documentDeleted", handleDocumentDeleted);
    socket.on("documentArchived", handleDocumentAdded); // Refetch when documents are archived
    socket.on("documentRestored", handleDocumentAdded); // Refetch when documents are restored

    // Cleanup listeners on unmount
    return () => {
      socket.off("documentAdded", handleDocumentAdded);
      socket.off("documentUpdated", handleDocumentUpdated);
      socket.off("documentDeleted", handleDocumentDeleted);
      socket.off("documentArchived", handleDocumentAdded);
      socket.off("documentRestored", handleDocumentAdded);
    };
  }, [socket, fetchArchivedDocuments]);

  // Check if the error is authentication-related
  const isAuthError = error && error.includes("Authentication required");

  return (
    <div className="w-full p-4 flex h-full flex-col bg-background">
      {error && !isAuthError && (
        <div className="mb-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {isAuthError && (
        <div className="mb-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              You must be logged in to view documents.
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <DataTable
        columns={columns}
        data={mappedDocuments}
        selection={true}
        excludedFilters={["documentId"]}
        showUploadButton={false}
        viewType="archive"
        initialState={{
          columnVisibility: {
            dates: false,
          },
        }}
        isLoading={loading}
      />
    </div>
  );
}
