"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTableFacetedFilter } from "@/components/reuseable/tables/data-table-toolbar";
import {
  DOC_CLASSIFICATION_OPTIONS,
  DOC_STATUS_OPTIONS,
} from "@/lib/doc-enums";
import { Table } from "@tanstack/react-table";

interface DocumentFiltersModalProps<TData> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table<TData>;
}

export function DocumentFiltersModal<TData>({
  open,
  onOpenChange,
  table,
}: DocumentFiltersModalProps<TData>) {
  // Find the document column for search functionality
  const documentColumn = table
    .getAllColumns()
    .find((col) => col.id === "document");

  // Get current filter values
  const getFilterValue = (columnId: string) => {
    const column = table.getColumn(columnId);
    return column ? (column.getFilterValue() as string[]) || [] : [];
  };

  // Get current search value for document column
  const getDocumentSearchValue = () => {
    return documentColumn
      ? (documentColumn.getFilterValue() as string) || ""
      : "";
  };

  // Handle document search
  const handleDocumentSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    if (documentColumn) {
      documentColumn.setFilterValue(value || undefined);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    table.resetColumnFilters();
    onOpenChange(false);
  };

  const typeOptions = [
    { label: "Report", value: "Report" },
    { label: "Invoice", value: "Invoice" },
    { label: "Guideline", value: "Guideline" },
    { label: "Delivery notes", value: "Delivery notes" },
  ];

  const fileStatusOptions = [
    { label: "Uploaded", value: "uploaded" },
    { label: "Enrolled", value: "enrolled" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Document Search */}
          <div className="space-y-2">
            <Label htmlFor="document-search">Document Name</Label>
            <Input
              id="document-search"
              placeholder="Search documents..."
              value={getDocumentSearchValue()}
              onChange={handleDocumentSearchChange}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <DataTableFacetedFilter
                column={table.getColumn("status")}
                title="Status"
                options={DOC_STATUS_OPTIONS}
              />
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label>Type</Label>
              <DataTableFacetedFilter
                column={table.getColumn("type")}
                title="Type"
                options={typeOptions}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Classification Filter */}
            <div className="space-y-2">
              <Label>Classification</Label>
              <DataTableFacetedFilter
                column={table.getColumn("classification")}
                title="Classification"
                options={DOC_CLASSIFICATION_OPTIONS}
              />
            </div>

            {/* File Status Filter */}
            <div className="space-y-2">
              <Label>File Status</Label>
              <DataTableFacetedFilter
                column={documentColumn} // Using document column temporarily, we might need to adjust this
                title="File Status"
                options={fileStatusOptions}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset All Filters
            </Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
