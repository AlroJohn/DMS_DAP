"use client";

import { DataTable } from "@/components/reuseable/tables/data-table";
import { createDocumentColumns, type ReceivedDocument } from "./columns";
import { useDocuments } from "@/hooks/use-documents";
import { useSocket } from "@/components/providers/providers";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useRef, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProcessType } from "@/hooks/use-process.type";
import { useDocumentSidebarCounts } from "@/hooks/use-document-sidebar-counts";

export default function DocumentsPage() {
  const { documents, isLoading, error, refetch } = useDocuments(1, 50);
  const { socket } = useSocket();
  const { processTypes } = useProcessType();
  const { setCounts } = useDocumentSidebarCounts();
  const mountedRef = useRef(false);
  const [activeTab, setActiveTab] = useState("active");

  const processTypeMap = useMemo(() => {
    const map: Record<
      string,
      {
        code?: string;
        name: string;
        duration_value?: number | null;
        duration_unit?: string | null;
      }
    > = {};
    processTypes.forEach((type) => {
      map[type.process_type_id] = {
        code: type.code || "",
        name: type.name,
        duration_value: type.duration_value ?? null,
        duration_unit: type.duration_unit ?? null,
      };
    });
    return map;
  }, [processTypes]);

  const documentColumns = useMemo(
    () => createDocumentColumns({ processTypeMap, onRefetch: refetch }),
    [processTypeMap, refetch]
  );

  // Mark component as mounted and clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("documents:returnTo", "/documents");
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The `useDocuments` hook returns a raw Document[] shape while the
  // table `columns` expect `ReceivedDocument` items. Map the documents
  // into the table-friendly shape to satisfy TypeScript and ensure the
  // table has required fields (id, qrCode, barcode, document, etc.).
  // Memoize to prevent unnecessary recalculations and state updates during render
  const mappedDocuments: ReceivedDocument[] = useMemo(
    () =>
      (documents || []).map((d: any) => ({
        id: d.document_id || d.id || "",
        qrCode: d.qrCode || "",
        barcode: d.barcode || "",
        document: d.title || d.document || "",
        documentId: d.document_code || d.documentId || d.id || "",
        contactPerson: d.contactPerson || "",
        contactOrganization: d.contactOrganization || "",
        type: (d.document_type || d.type || "General") as string,
        processTypeId:
          d.process_type_id ||
          d.processTypeId ||
          d.processType?.process_type_id ||
          "",
        processTypeName: d.process_type_name || d.processTypeName || d.processType?.name || "",
        classification: (d.classification || "") as string,
        status: (d.status || "") as string,
        origin: (d.origin || "") as string,
        activity: d.activity || "",
        activityTime: d.activityTime || d.created_at || d.createdAt || "",
        createdAt: d.created_at || d.createdAt || d.activityTime || "",
        processTimerStartAt:
          d.process_timer_start_at || d.processTimerStartAt || undefined,
        processTimerCompleteAt:
          d.process_timer_complete_at || d.processTimerCompleteAt || undefined,
      })),
    [documents]
  );

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;

    const handleDocumentAdded = () => {
      if (mountedRef.current) {
        try {
          refetch();
        } catch (err) {
          // Error handling for document refetch
        }
      }
    };

    const handleDocumentUpdated = () => {
      if (mountedRef.current) {
        try {
          refetch();
        } catch (err) {
          // Error handling for document refetch
        }
      }
    };

    const handleDocumentDeleted = () => {
      if (mountedRef.current) {
        try {
          refetch();
        } catch (err) {
          // Error handling for document refetch
        }
      }
    };

    // Listen for document-related events
    socket.on("documentAdded", handleDocumentAdded);
    socket.on("documentUpdated", handleDocumentUpdated);
    socket.on("documentDeleted", handleDocumentDeleted);
    socket.on("documentArchived", handleDocumentUpdated);
    socket.on("documentRestored", handleDocumentUpdated);
    socket.on("documentShared", handleDocumentAdded); // Refetch when documents are shared
    socket.on("documentAddedToUser", handleDocumentAdded); // Refetch when a document is specifically shared to this user
    socket.on("documentUploadCompleted", handleDocumentAdded); // Also refetch on upload completion

    // Cleanup listeners on unmount
    return () => {
      socket.off("documentAdded", handleDocumentAdded);
      socket.off("documentUpdated", handleDocumentUpdated);
      socket.off("documentDeleted", handleDocumentDeleted);
      socket.off("documentArchived", handleDocumentUpdated);
      socket.off("documentRestored", handleDocumentUpdated);
      socket.off("documentShared", handleDocumentAdded);
      socket.off("documentAddedToUser", handleDocumentAdded);
      socket.off("documentUploadCompleted", handleDocumentAdded);
    };
  }, [socket, refetch]);

  // Check if the error is authentication-related
  const isAuthError = error && error.includes("Authentication required");

  // Filter documents based on active tab
  const filteredDocuments = useMemo(() => {
    if (activeTab === "completed") {
      return mappedDocuments.filter(doc => doc.status?.toLowerCase() === "completed");
    }
    // Active tab shows all non-completed documents
    return mappedDocuments.filter(doc => doc.status?.toLowerCase() !== "completed");
  }, [mappedDocuments, activeTab]);

  useEffect(() => {
    setCounts({ pendingDocuments: filteredDocuments.length });
  }, [filteredDocuments.length, setCounts]);

  return (
    <div className="p-4 w-full flex h-full flex-col bg-background">
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="flex-1 mt-0">
          <DataTable
            columns={documentColumns}
            data={filteredDocuments}
            selection={true}
            excludedFilters={["documentId"]}
            showUploadButton={true}
            viewType="document"
            initialState={{
              columnVisibility: {
                dates: true,
              },
              columnOrder: [
                "select",
                "scan",
                "document",
                "contact",
                "origin",
                "type",
                "processType",
                "classification",
                "status",
                "dates",
                "actions",
              ],
            }}
            isLoading={isLoading}
            meta={{ onRefetch: refetch }}
          />
        </TabsContent>

        <TabsContent value="completed" className="flex-1 mt-0">
          <DataTable
            columns={documentColumns}
            data={filteredDocuments}
            selection={true}
            excludedFilters={["documentId"]}
            showUploadButton={false}
            viewType="document"
            initialState={{
              columnVisibility: {
                dates: true,
              },
              columnOrder: [
                "select",
                "scan",
                "document",
                "contact",
                "type",
                "origin",
                "processType",
                "classification",
                "status",
                "dates",
                "actions",
              ],
            }}
            isLoading={isLoading}
            meta={{ onRefetch: refetch }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
