"use client";

import { DataTable } from "@/components/reuseable/tables/data-table";
import { columns, type ArchiveDocument } from "./columns";
import { useArchive } from "@/hooks/use-archive";
import { useSocket } from "@/components/providers/providers";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect } from "react";

export default function ArchivePage() {
  const { archivedDocuments: rawArchivedDocuments, loading, error, fetchArchivedDocuments } = useArchive();
  const { socket } = useSocket();

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
      type: (d.document_type || d.type || "General") as string,
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
      blockchainStatus: d.blockchainStatus || d.blockchain_status || null,
      blockchainProjectUuid: d.blockchainProjectUuid || undefined,
      blockchainTxHash: d.blockchainTxHash || undefined,
      signedAt: d.signedAt || d.signed_at || undefined,
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
      try {
        fetchArchivedDocuments();
      } catch (err) {
        console.error("Error refetching documents on documentAdded:", err);
      }
    };

    const handleDocumentUpdated = () => {
      try {
        fetchArchivedDocuments();
      } catch (err) {
        console.error("Error refetching documents on documentUpdated:", err);
      }
    };

    const handleDocumentDeleted = () => {
      try {
        fetchArchivedDocuments();
      } catch (err) {
        console.error("Error refetching documents on documentDeleted:", err);
      }
    };

    // Listen for document-related events
    socket.on('documentAdded', handleDocumentAdded);
    socket.on('documentUpdated', handleDocumentUpdated);
    socket.on('documentDeleted', handleDocumentDeleted);
    socket.on('documentArchived', handleDocumentAdded); // Refetch when documents are archived
    socket.on('documentRestored', handleDocumentAdded); // Refetch when documents are restored

    // Cleanup listeners on unmount
    return () => {
      socket.off("documentAdded", handleDocumentAdded);
      socket.off("documentUpdated", handleDocumentUpdated);
      socket.off("documentDeleted", handleDocumentDeleted);
      socket.off("documentArchived", handleDocumentAdded);
      socket.off("documentRestored", handleDocumentAdded);
    };
  }, [socket, fetchArchivedDocuments]);

  return (
    <div className="w-full flex h-full flex-col bg-background">
      {error && (
        <div className="mb-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      <DataTable
        columns={columns}
        data={mappedDocuments}
        selection={true}
        excludedFilters={["documentId"]}
        showUploadButton={false} // Don't show upload button in archive view
        viewType="archive"
        initialState={{
          columnVisibility: {
            security: false,
            dates: false,
          },
        }}
        isLoading={loading}
      />
    </div>
  );
}
