"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/components/reuseable/tables/data-table";
import { getColumns } from "./columns";
import { useSharedDocuments } from "@/hooks/use-shared-documents";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSocket } from "@/components/providers/providers";
import { useAuth } from "@/hooks/use-auth";
import { SignatureCaptureModal } from "@/components/modals/signature-capture-modal";
import { toast } from "sonner";
import { SharedDocument } from "@dms/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SharedDocumentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const {
    documents = [],
    isLoading: documentsLoading,
    error,
    refetch,
  } = useSharedDocuments(1, 100);
  const { socket } = useSocket();
  const mountedRef = useRef(false);

  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<SharedDocument | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "active");

  const handleSignClick = (document: SharedDocument) => {
    setSelectedDocument(document);
    setIsSignModalOpen(true);
  };

  const handleSignConfirm = async (signatureData: string) => {
    if (!selectedDocument) return;

    try {
      const response = await fetch(
        `/api/documents/${selectedDocument.id}/sign-from-placeholder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ signatureData }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Signing failed.");
      }

      refetch(); // Refetch documents to show updated status
    } catch (error) {
      console.error("Error signing document:", error);
      toast.error("Failed to sign document. Please try again.");
    }
  };

  const columns = useMemo(() => getColumns({ onSign: handleSignClick }), []);

  // Mark component as mounted and clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("documents:returnTo", "/documents/shared");
    }
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
    const handleDocumentCanceled = (payload: { documentId?: string; documentTitle?: string }) => {
      const documentId = payload?.documentId;
      if (!documentId) return;

      const isInList = documents.some((doc) => doc.id === documentId);
      if (isInList) {
        toast.error(
          `Document cancelled: ${payload?.documentTitle || "Unknown document"}`,
        );
      }
      safeRefetch();
    };

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
    socket.on("documentCanceled", handleDocumentCanceled);

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
      socket.off("documentCanceled", handleDocumentCanceled);
    };
  }, [socket, refetch, user, documents]);

  const sanitizedDocuments = useMemo(() => {
    return documents.map((doc) => {
      if (!doc?.document) {
        return { ...doc, documentTitle: doc?.document || "" };
      }

      // Safe access to document properties
      const documentStr = doc?.document || "";
      const documentId = doc?.documentId || "";

      const suffix =
        documentId && documentStr.endsWith(` (${documentId})`)
          ? ` (${documentId})`
          : null;

      const documentTitle = suffix
        ? documentStr.slice(0, -suffix.length).trimEnd()
        : documentStr;

      return {
        ...doc,
        documentTitle,
      };
    });
  }, [documents]);

  // Check if the error is authentication-related
  const isAuthError =
    error &&
    (error.includes("Authentication required") ||
      error.includes("401") ||
      error.includes("Unauthorized"));

  // Filter documents based on active tab
  const filteredDocuments = useMemo(() => {
    if (activeTab === "completed") {
      return sanitizedDocuments.filter(doc => doc.status?.toLowerCase() === "completed");
    }
    // Active tab shows all non-completed documents (received, pending, shared, etc.)
    return sanitizedDocuments.filter(doc => doc.status?.toLowerCase() !== "completed");
  }, [sanitizedDocuments, activeTab]);

  return (
    <>
      <div className="flex h-full flex-col p-4 gap-4 bg-background">
        {error && !isAuthError && (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Error loading shared documents: {error}
              </AlertDescription>
            </Alert>
          </div>
        )}
        {isAuthError && (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                You must be logged in to view documents.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="flex-1 mt-0">
            <DataTable
              columns={columns}
              data={filteredDocuments}
              selection={true}
              viewType="shared"
              isLoading={isLoading}
              onSign={handleSignClick}
            />
          </TabsContent>

          <TabsContent value="completed" className="flex-1 mt-0">
            <DataTable
              columns={columns}
              data={filteredDocuments}
              selection={true}
              viewType="shared"
              isLoading={isLoading}
              onSign={handleSignClick}
            />
          </TabsContent>
        </Tabs>
      </div>
      {selectedDocument && (
        <SignatureCaptureModal
          open={isSignModalOpen}
          onOpenChange={setIsSignModalOpen}
          onConfirm={handleSignConfirm}
          documentTitle={
            selectedDocument.documentTitle ||
            selectedDocument.document ||
            "Unknown Document"
          }
        />
      )}
    </>
  );
}
