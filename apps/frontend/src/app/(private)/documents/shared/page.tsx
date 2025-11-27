"use client";

import { useEffect, useMemo, useRef } from "react";
import { DataTable } from "@/components/reuseable/tables/data-table";
import { columns } from "./columns";
import { useSharedDocuments } from "@/hooks/use-shared-documents";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSocket } from "@/components/providers/providers";
import { useAuth } from "@/hooks/use-auth";

export default function SharedDocumentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    documents = [],
    isLoading: documentsLoading,
    error,
    refetch,
  } = useSharedDocuments(1, 100);
  const { socket } = useSocket();
  const mountedRef = useRef(false);

  // Mark component as mounted and clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Only fetch documents if user is authenticated
  const isLoading = authLoading || documentsLoading;

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket || !user) return;

    const safeRefetch = async () => {
      if (mountedRef.current) {
        try {
          await refetch();
        } catch (err) {
          console.error("Error refetching shared documents:", err);
        }
      }
    };

    const handleDocumentAdded = safeRefetch;
    const handleDocumentUpdated = safeRefetch;
    const handleDocumentDeleted = safeRefetch;
    const handleDocumentShared = safeRefetch;
    const handleDocumentAddedToUser = safeRefetch;

    // Listen for checkout-related events
    const handleCheckout = safeRefetch;
    const handleCheckin = safeRefetch;
    const handleCheckoutOverridden = safeRefetch;

    // Listen for document-related events
    socket.on("documentAdded", handleDocumentAdded);
    socket.on("documentUpdated", handleDocumentUpdated);
    socket.on("documentDeleted", handleDocumentDeleted);
    socket.on("documentShared", handleDocumentShared); // Handle document sharing events
    socket.on("documentAddedToUser", handleDocumentAddedToUser); // Handle when document is shared specifically to this user
    socket.on("documentUploadCompleted", handleDocumentAdded); // Also refetch on upload completion
    socket.on("checkout", handleCheckout); // Listen for checkout events
    socket.on("checkin", handleCheckin); // Listen for checkin events
    socket.on("checkoutOverridden", handleCheckoutOverridden); // Listen for checkout override events

    // Cleanup listeners on unmount
    return () => {
      socket.off("documentAdded", handleDocumentAdded);
      socket.off("documentUpdated", handleDocumentUpdated);
      socket.off("documentDeleted", handleDocumentDeleted);
      socket.off("documentShared", handleDocumentShared);
      socket.off("documentUploadCompleted", handleDocumentAdded);
      socket.off("checkout", handleCheckout);
      socket.off("checkin", handleCheckin);
      socket.off("checkoutOverridden", handleCheckoutOverridden);
    };
  }, [socket, refetch, user]);

  const sanitizedDocuments = useMemo(() => {
    return documents.map((doc) => {
      if (!doc?.document) {
        return { ...doc, documentTitle: doc?.document || "" };
      }

      const suffix =
        doc.documentId && doc.document.endsWith(` (${doc.documentId})`)
          ? ` (${doc.documentId})`
          : null;

      const documentTitle = suffix
        ? doc.document.slice(0, -suffix.length).trimEnd()
        : doc.document;

      return {
        ...doc,
        documentTitle,
      };
    });
  }, [documents]);

  // Check if the error is authentication-related
  const isAuthError = error && error.includes('Authentication required');

  return (
    <div className="flex h-full flex-col gap-4 bg-background">
      <div className="flex flex-col gap-1.5"></div>
      {error && !isAuthError && (
        <div className="mb-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Error loading shared documents: {error}</AlertDescription>
          </Alert>
        </div>
      )}
      {isAuthError && (
        <div className="mb-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>You must be logged in to view documents.</AlertDescription>
          </Alert>
        </div>
      )}
      <DataTable
        columns={columns}
        data={sanitizedDocuments}
        selection={true}
        viewType="shared"
        isLoading={isLoading}
      />
    </div>
  );
}
