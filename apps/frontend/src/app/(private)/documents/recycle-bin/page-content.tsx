"use client";

import { DataTable } from "@/components/reuseable/tables/data-table";
import { createRecycleBinColumns, type RecycleBinDocument } from "./columns";
import { useRecycleBinDocuments } from "@/hooks/use-recycle-bin-documents";
import { useSocket } from "@/components/providers/providers";
import { AlertCircle, AlertTriangle, Badge, Clock, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useMemo, useRef } from "react";
import { useRecycleBin } from "@/context/recycle-bin-context";
import { useProcessType } from "@/hooks/use-process.type";

export default function RecycleBinPage() {
  const { documents, isLoading, error, refetch } = useRecycleBinDocuments(
    1,
    100
  ); // Use page 1 with high limit
  const { socket } = useSocket();
  const mountedRef = useRef(false);
  const { showWarning } = useRecycleBin(); // Get showWarning from context
  const { processTypes } = useProcessType();

  const columns = useMemo(
    () =>
      createRecycleBinColumns(
        processTypes.reduce(
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
              name?: string;
              duration_value?: number | null;
              duration_unit?: string | null;
            }
          >
        )
      ),
    [processTypes]
  );

  // Mark component as mounted and clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("documents:returnTo", "/documents/recycle-bin");
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Create a safe refetch function that checks if component is mounted
  const safeRefetch = () => {
    if (mountedRef.current) {
      try {
        refetch();
      } catch (err) {
        console.error("Error refetching documents:", err);
      }
    }
  };

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;

    const handleDocumentDeleted = () => {
      safeRefetch();
    };

    const handleDocumentRestored = () => {
      safeRefetch();
    };

    // Listen for document-related events
    socket.on("documentDeleted", handleDocumentDeleted);
    socket.on("documentRestored", handleDocumentRestored);

    // Cleanup listeners on unmount
    return () => {
      socket.off("documentDeleted", handleDocumentDeleted);
      socket.off("documentRestored", handleDocumentRestored);
    };
  }, [socket, safeRefetch]);

  // Check if the error is authentication-related
  const isAuthError = error && error.includes("Authentication required");

  return (
    <div className="w-full p-4 flex h-full flex-col bg-background gap-2">
      {/* Warning Alert */}
      {showWarning && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">
            Auto-deletion Notice
          </AlertTitle>
          <AlertDescription className="text-orange-700">
            Documents in the recycle bin will be permanently deleted after 30
            days.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={documents}
        selection={true}
        excludedFilters={["documentId"]}
        showUploadButton={false} // Don't show upload button in recycle bin view
        viewType="recycle-bin"
        initialState={{
          columnVisibility: {
            dates: false,
            status: false,
          },
          columnOrder: [
            "select",
            "scan",
            "document",
            "contact",
            "type",
            "processType",
            "classification",
            "status",
            "dates",
            "deletedBy",
            "deletedAt",
            "actions",
          ],
        }}
        isLoading={isLoading}
        meta={{ onRefetch: refetch }}
      />
    </div>
  );
}
