"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/reuseable/tables/data-table";
import { outgoingColumns, type OutgoingDocument } from "./outgoing-columns";
import { incomingColumns, type IncomingDocument } from "./incoming-columns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useIncomingDocuments,
  useOutgoingDocuments,
} from "@/hooks/use-documents-in-transit";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSocket } from "@/components/providers/providers";
import { toast } from "sonner";

export default function InTransitDocumentsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const initialTab =
    tabParam === "outgoing" || tabParam === "incoming" ? tabParam : "incoming";
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">(
    initialTab
  );
  const { socket } = useSocket();
  const mountedRef = useRef(false);
  const router = useRouter();

  // Mark component as mounted and clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (tabParam === "incoming" || tabParam === "outgoing") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "documents:returnTo",
        `/documents/in-transit?tab=${activeTab}`,
      );
    }
  }, [activeTab]);

  // Fetch incoming documents
  const {
    documents: incomingDocuments = [],
    isLoading: isLoadingIncoming,
    error: incomingError,
    refetch: refetchIncoming,
  } = useIncomingDocuments(1, 100);

  // Fetch outgoing documents
  const {
    documents: outgoingDocuments = [],
    isLoading: isLoadingOutgoing,
    error: outgoingError,
    refetch: refetchOutgoing,
  } = useOutgoingDocuments(1, 100);

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;

    const safeRefetch = async () => {
      if (mountedRef.current) {
        try {
          await refetchIncoming();
          await refetchOutgoing();
        } catch (err) {
          console.error("Error refetching in-transit documents:", err);
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
      socket.off("documentUploadCompleted", handleDocumentAdded);
    };
  }, [socket, refetchIncoming, refetchOutgoing]);

  const handleReceiveSuccess = () => {
    refetchIncoming();
    toast.success("Document received successfully!", {
      description: "Redirecting to shared documents...",
    });
    setTimeout(() => {
      router.push("/documents/shared");
    }, 1500);
  };
  // Check if the errors are authentication-related
  const isAuthErrorIncoming =
    incomingError && incomingError.includes("Authentication required");
  const isAuthErrorOutgoing =
    outgoingError && outgoingError.includes("Authentication required");

  return (
    <div className="flex h-full flex-col gap-4 p-4 bg-background">
      <Tabs
        value={activeTab}
        className="w-full"
        onValueChange={(value) =>
          setActiveTab(value as "incoming" | "outgoing")
        }
      >
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="incoming">Incoming Documents</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4">
          {incomingError && !isAuthErrorIncoming && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Error loading incoming documents: {incomingError}
                </AlertDescription>
              </Alert>
            </div>
          )}
          {isAuthErrorIncoming && (
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
          <DataTable
            columns={incomingColumns}
            data={incomingDocuments}
            selection={true}
            isLoading={isLoadingIncoming}
            meta={{
              onReceived: handleReceiveSuccess,
              onRefetch: refetchIncoming,
            }}
          />
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          {outgoingError && !isAuthErrorOutgoing && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Error loading outgoing documents: {outgoingError}
                </AlertDescription>
              </Alert>
            </div>
          )}
          {isAuthErrorOutgoing && (
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
          <DataTable
            columns={outgoingColumns}
            data={outgoingDocuments}
            selection={true}
            viewType="outgoing"
            isLoading={isLoadingOutgoing}
            meta={{ onRefetch: refetchOutgoing }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
