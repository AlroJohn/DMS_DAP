"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ReleaseDocumentModal } from "@/components/modals/release-document-modal";
import type { DocumentListItem } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { hasAnyPermission } from "@/lib/document-permissions";

interface DocumentLookup {
  document_id: string;
  document_code: string;
  title: string;
  classification: string;
  status: string;
  document_type: string;
  created_at: string;
}

interface TransmitByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransmitByCodeModal({
  isOpen,
  onClose,
}: TransmitByCodeModalProps) {
  const [documentCode, setDocumentCode] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [isReceiving, setIsReceiving] = React.useState(false);
  const [document, setDocument] = React.useState<DocumentLookup | null>(null);
  const [releaseDocument, setReleaseDocument] =
    React.useState<DocumentListItem | null>(null);
  const [isReleaseOpen, setIsReleaseOpen] = React.useState(false);
  const { user: currentUser } = useAuth();
  const canRelease = hasAnyPermission(currentUser, [
    "document_transfer_initiate",
    "document_transfer_approve",
    "document_write",
  ]);
  const canReceive = hasAnyPermission(currentUser, [
    "document_transfer_receive",
    "document_write",
  ]);

  React.useEffect(() => {
    if (!isOpen && !isReleaseOpen) {
      setDocumentCode("");
      setDocument(null);
      setReleaseDocument(null);
      setIsSearching(false);
      setIsReceiving(false);
    }
  }, [isOpen, isReleaseOpen]);

  const handleLookup = async () => {
    const trimmed = documentCode.trim();
    if (!trimmed) {
      toast.error("Please enter a document code.");
      return;
    }

    setIsSearching(true);
    setDocument(null);

    try {
      const response = await fetch(
        `/api/documents/search?q=${encodeURIComponent(trimmed)}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || errorData.error || "Search failed."
        );
      }

      const result = await response.json().catch(() => ({}));
      const documents = Array.isArray(result?.data) ? result.data : [];
      const normalised = trimmed.toLowerCase();
      const matched =
        documents.find(
          (doc: DocumentLookup) =>
            (doc.document_code || "").toLowerCase() === normalised
        ) || documents[0];

      if (!matched) {
        toast.error("Document code not found.");
        return;
      }

      setDocument(matched);
    } catch (error: any) {
      console.error("Lookup error:", error);
      toast.error(error.message || "Failed to find document.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReceive = async () => {
    if (!document) {
      toast.error("Please lookup a document first.");
      return;
    }

    if (!canReceive) {
      toast.error("You don't have permission to receive documents.");
      return;
    }

    if (document.status !== "intransit") {
      toast.error("Document must be in transit to receive.");
      return;
    }

    setIsReceiving(true);

    try {
      const response = await fetch(
        `/api/documents/${document.document_id}/receive`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || errorData.error || "Failed to receive."
        );
      }

      toast.success("Document received successfully.");
      onClose();
    } catch (error: any) {
      console.error("Receive error:", error);
      toast.error(error.message || "Failed to receive document.");
    } finally {
      setIsReceiving(false);
    }
  };

  const handleRelease = () => {
    if (!document) {
      toast.error("Please lookup a document first.");
      return;
    }

    if (!canRelease) {
      toast.error("You don't have permission to release documents.");
      return;
    }

    const mapped: DocumentListItem = {
      id: document.document_id,
      qrCode: "",
      barcode: "",
      document: document.title || "Untitled",
      documentId: document.document_code || document.document_id,
      contactPerson: "N/A",
      contactOrganization: "N/A",
      currentLocation: "N/A",
      type: document.document_type || "General",
      classification: document.classification || "simple",
      status: document.status || "dispatch",
      activity: "lookup",
      activityTime: document.created_at || new Date().toISOString(),
    };

    setReleaseDocument(mapped);
    setIsReleaseOpen(true);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transmit by Document Code</DialogTitle>
            <DialogDescription>
              Enter a document code to release or receive a document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter document code (e.g., ADMIN-2026-VJJD)"
                value={documentCode}
                onChange={(event) => setDocumentCode(event.target.value)}
              />
              <Button onClick={handleLookup} disabled={isSearching}>
                {isSearching ? "Searching..." : "Find"}
              </Button>
            </div>

            {document && (
              <div className="rounded-md border p-3 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{document.document_code}</Badge>
                  <span className="truncate">{document.title}</span>
                </div>
                <div className="text-muted-foreground">
                  Status: <span className="font-medium">{document.status}</span>
                </div>
                <div className="text-muted-foreground">
                  Classification:{" "}
                  <span className="font-medium">{document.classification}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleReceive}
              disabled={!document || isReceiving || !canReceive}
            >
              {isReceiving ? "Receiving..." : "Receive"}
            </Button>
            <Button onClick={handleRelease} disabled={!document || !canRelease}>
              Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReleaseDocumentModal
        document={releaseDocument}
        isOpen={isReleaseOpen}
        onClose={() => setIsReleaseOpen(false)}
      />
    </>
  );
}
