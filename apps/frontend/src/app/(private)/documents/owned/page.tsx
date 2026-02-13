"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { DataTable } from "@/components/reuseable/tables/data-table";
import { createOwnedDocumentColumns } from "@/app/(private)/documents/owned/columns";
import { Document, useDocumentsOwned } from "@/hooks/use-documents-owned";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSocket } from "@/components/providers/providers";
import { useDocumentTypes } from "@/hooks/use-document-types";
import { useProcessType } from "@/hooks/use-process.type";
import { useDocumentSidebarCounts } from "@/hooks/use-document-sidebar-counts";

export default function OwnedDocumentsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const mountedRef = useRef(false);

  const { documents, pagination, isLoading, error, refetch } =
    useDocumentsOwned(page, limit);
  const { socket } = useSocket();
  const { documentTypes } = useDocumentTypes();
  const { processTypes } = useProcessType();
  const { setCounts } = useDocumentSidebarCounts();

  // Mark component as mounted and clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("documents:returnTo", "/documents/owned");
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const documentTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    documentTypes.forEach((type) => {
      map[type.type_id] = type.name;
    });
    return map;
  }, [documentTypes]);

  const ownedColumns = useMemo(
    () =>
      createOwnedDocumentColumns({
        documentTypeMap,
        processTypeMap: processTypes.reduce(
          (map, type) => {
            map[type.process_type_id] = {
              code: type.code || "",
              name: type.name,
              duration_value: type.duration_value ?? null,
              duration_unit: type.duration_unit ?? null,
            };
            return map;
          },
          {} as Record<
            string,
            {
              code?: string;
              name: string;
              duration_value?: number | null;
              duration_unit?: string | null;
            }
          >
        ),
      }),
    [documentTypeMap, processTypes]
  );

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;

    const safeRefetch = async () => {
      if (mountedRef.current) {
        try {
          await refetch();
        } catch (err) {
          console.error("Error refetching owned documents:", err);
        }
      }
    };

    const handleDocumentAdded = safeRefetch;
    const handleDocumentUpdated = safeRefetch;
    const handleDocumentDeleted = safeRefetch;

    // Listen for document-related events
    socket.on("documentAdded", handleDocumentAdded);
    socket.on("documentUpdated", handleDocumentUpdated);
    socket.on("documentDeleted", handleDocumentDeleted);
    socket.on("documentShared", handleDocumentAdded); // Refetch when documents are shared
    socket.on("documentAddedToUser", handleDocumentAdded); // Refetch when a document is specifically shared to this user
    socket.on("documentUploadCompleted", handleDocumentAdded); // Also refetch on upload completion

    // Cleanup listeners on unmount
    return () => {
      socket.off("documentAdded", handleDocumentAdded);
      socket.off("documentUpdated", handleDocumentUpdated);
      socket.off("documentDeleted", handleDocumentDeleted);
      socket.off("documentShared", handleDocumentAdded);
      socket.off("documentAddedToUser", handleDocumentAdded);
      socket.off("documentUploadCompleted", handleDocumentAdded);
    };
  }, [socket, refetch]);

  // Check if the error is authentication-related
  const isAuthError = error && error.includes("Authentication required");

  // Filter out documents with 'deleted' or 'archive' status
  const filteredDocuments = useMemo(() => {
    return documents.filter(
      (doc) => doc.status !== "deleted" && doc.status !== "archive"
    );
  }, [documents]);

  useEffect(() => {
    setCounts({ ownedPendingDocuments: filteredDocuments.length });
  }, [filteredDocuments.length, setCounts]);

  return (
    <div className="flex p-4 h-full flex-col bg-background">
      {error && !isAuthError && (
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
      {isAuthError && (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              You must be logged in to view documents.
            </AlertDescription>
          </Alert>
        </div>
      )}
      <DataTable
        columns={ownedColumns}
        data={filteredDocuments}
        selection={true}
        viewType="owned"
        isLoading={isLoading}
        initialState={{
          columnOrder: [
            "select",
            "scan",
            "document",
            "contact",
            "currentLocation",
            "type",
            "origin",
            "processType",
            "classification",
            "status",
            "dates",
            "actions",
          ],
        }}
        meta={{ onRefetch: refetch }}
      />
    </div>
  );
}
