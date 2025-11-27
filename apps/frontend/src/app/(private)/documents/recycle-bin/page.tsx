"use client";

import { DataTable } from "@/components/reuseable/tables/data-table";
import { columns, type RecycleBinDocument } from "./columns";
import { useRecycleBinDocuments } from "@/hooks/use-recycle-bin-documents";
import { useSocket } from "@/components/providers/providers";
import { AlertCircle, AlertTriangle, Badge, Clock, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useRef, useState } from "react";

export default function RecycleBinPage() {
  const { documents, isLoading, error, refetch } = useRecycleBinDocuments(1, 100); // Use page 1 with high limit
  const { socket } = useSocket();
  const mountedRef = useRef(false);

  // Mark component as mounted and clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;

    const handleDocumentDeleted = () => {
      if (mountedRef.current) {
        try {
          refetch();
        } catch (err) {
          console.error("Error refetching documents on documentDeleted:", err);
        }
      }
    };

    const handleDocumentRestored = () => {
      if (mountedRef.current) {
        try {
          refetch();
        } catch (err) {
          console.error("Error refetching documents on documentRestored:", err);
        }
      }
    };

    // Listen for document-related events
    socket.on('documentDeleted', handleDocumentDeleted);
    socket.on('documentRestored', handleDocumentRestored);

    // Cleanup listeners on unmount
    return () => {
      socket.off("documentDeleted", handleDocumentDeleted);
      socket.off("documentRestored", handleDocumentRestored);
    };
  }, [socket, refetch]);

  // Check if the error is authentication-related
  const isAuthError = error && error.includes('Authentication required');

  return (
    <div className="w-full flex h-full flex-col bg-background gap-2">
      {/* Warning Alert */}
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
            <AlertDescription>You must be logged in to view documents.</AlertDescription>
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
            security: false,
            dates: false,
          },
        }}
        isLoading={isLoading}
      />
    </div>
  );
}