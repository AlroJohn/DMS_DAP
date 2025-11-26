"use client";

import { DataTable } from "@/components/reuseable/tables/data-table";
import { columns, type ReceivedDocument } from "./columns";
import { useDocuments } from "@/hooks/use-documents";
import { useSocket } from "@/components/providers/providers";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect } from "react";

export default function DocumentsPage() {
  const { documents, isLoading, error, refetch } = useDocuments(1, 50);
  const { socket } = useSocket();

  // The `useDocuments` hook returns a raw Document[] shape while the
  // table `columns` expect `ReceivedDocument` items. Map the documents
  // into the table-friendly shape to satisfy TypeScript and ensure the
  // table has required fields (id, qrCode, barcode, document, etc.).
  const mappedDocuments: ReceivedDocument[] = (documents || []).map(
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
      status: (d.status || "") as string,
      activity: d.activity || "",
      activityTime: d.activityTime || d.created_at || "",
    })
  );

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;

    const handleDocumentAdded = () => {
      try {
        refetch();
      } catch (err) {
        console.error("Error refetching documents on documentAdded:", err);
      }
    };

    const handleDocumentUpdated = () => {
      try {
        refetch();
      } catch (err) {
        console.error("Error refetching documents on documentUpdated:", err);
      }
    };

    const handleDocumentDeleted = () => {
      try {
        refetch();
      } catch (err) {
        console.error("Error refetching documents on documentDeleted:", err);
      }
    };

    // Listen for document-related events
    socket.on('documentAdded', handleDocumentAdded);
    socket.on('documentUpdated', handleDocumentUpdated);
    socket.on('documentDeleted', handleDocumentDeleted);
    socket.on('documentShared', handleDocumentAdded); // Refetch when documents are shared
    socket.on('documentAddedToUser', handleDocumentAdded); // Refetch when a document is specifically shared to this user
    socket.on('documentUploadCompleted', handleDocumentAdded); // Also refetch on upload completion

    // Cleanup listeners on unmount
    return () => {
      socket.off("documentAdded", handleDocumentAdded);
      socket.off("documentUpdated", handleDocumentUpdated);
      socket.off("documentDeleted", handleDocumentDeleted);
      socket.off("documentUploadCompleted", handleDocumentAdded);
    };
  }, [socket, refetch]);

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
        showUploadButton={true}
        viewType="document"
        initialState={{
          columnVisibility: {
            security: false,
            dates: false,
          },
        }}
        isLoading={isLoading}
      />
    </div>
  );
}
