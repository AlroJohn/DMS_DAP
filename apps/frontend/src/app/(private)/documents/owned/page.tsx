"use client";

import { useState, useEffect, useMemo } from "react";
import { DataTable } from "@/components/reuseable/tables/data-table";
import { createOwnedDocumentColumns } from "@/app/(private)/documents/owned/columns";
import { Document, useDocumentsOwned } from "@/hooks/use-documents-owned";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSocket } from "@/components/providers/providers";
import { useDocumentTypes } from "@/hooks/use-document-types";

export default function OwnedDocumentsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { documents, pagination, isLoading, error, refetch } =
    useDocumentsOwned(page, limit);
  const { socket } = useSocket();
  const { documentTypes } = useDocumentTypes();

  const documentTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    documentTypes.forEach((type) => {
      map[type.type_id] = type.name;
    });
    return map;
  }, [documentTypes]);

  const ownedColumns = useMemo(
    () => createOwnedDocumentColumns({ documentTypeMap }),
    [documentTypeMap]
  );

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;

    const safeRefetch = async () => {
      try {
        await refetch();
      } catch (err) {
        console.error("Error refetching owned documents:", err);
      }
    };

    const handleDocumentAdded = safeRefetch;
    const handleDocumentUpdated = safeRefetch;
    const handleDocumentDeleted = safeRefetch;

    // Listen for document-related events
    socket.on('documentAdded', handleDocumentAdded);
    socket.on('documentUpdated', handleDocumentUpdated);
    socket.on('documentDeleted', handleDocumentDeleted);
    socket.on('documentShared', handleDocumentAdded); // Refetch when documents are shared
    socket.on('documentAddedToUser', handleDocumentAdded); // Refetch when a document is specifically shared to this user
    socket.on('documentUploadCompleted', handleDocumentAdded); // Also refetch on upload completion

    // Cleanup listeners on unmount
    return () => {
      socket.off('documentAdded', handleDocumentAdded);
      socket.off('documentUpdated', handleDocumentUpdated);
      socket.off('documentDeleted', handleDocumentDeleted);
      socket.off('documentShared', handleDocumentAdded);
      socket.off('documentAddedToUser', handleDocumentAdded);
      socket.off('documentUploadCompleted', handleDocumentAdded);
    };
  }, [socket, refetch]);

  return (
    <div className="flex h-full flex-col bg-background">
      {error && (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              <button
                onClick={refetch}
                className="ml-2 underline hover:no-underline"
              >
                Try again
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <DataTable
        columns={ownedColumns}
        data={documents}
        selection={true}
        viewType="owned"
        isLoading={isLoading}
      />
    </div>
  );
}
