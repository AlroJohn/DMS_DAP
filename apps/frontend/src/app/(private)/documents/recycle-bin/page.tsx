"use client";

import { DataTable } from "@/components/reuseable/tables/data-table";
import { columns, type RecycleBinDocument } from "./columns";
import { useRecycleBinDocuments } from "@/hooks/use-recycle-bin-documents";
import { AlertCircle, AlertTriangle, Badge, Clock, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RecycleBinPage() {
  const { documents, isLoading, error, refetch } = useRecycleBinDocuments(1, 100); // Use page 1 with high limit

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
      {error && (
        <div className="mb-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
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