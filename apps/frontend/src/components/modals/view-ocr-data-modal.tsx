"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Eye, Copy, FileText, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OcrData {
  ocr_id: string;
  file_url: string;
  ocr_json: any;
  created_at: string;
  updated_at: string;
}

interface OcrPageView {
  pageNumber: number;
  text: string;
}

interface ViewOcrDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
}

export function ViewOcrDataModal({
  open,
  onOpenChange,
  documentId,
}: ViewOcrDataModalProps) {
  const [ocrData, setOcrData] = useState<OcrData[]>([]);
  const [selectedOcrId, setSelectedOcrId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && documentId) {
      fetchOcrData();
    }
    if (!open) {
      setOcrData([]);
      setSelectedOcrId(null);
      setLoading(true);
      setError(null);
    }
  }, [open, documentId]);

  const fetchOcrData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}/ocr`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch OCR data");
      }

      const result = await response.json();

      if (result.success) {
        const fetchedOcrData = result.data?.ocrData || [];
        setOcrData(fetchedOcrData);
        if (fetchedOcrData.length > 0) {
          setSelectedOcrId(fetchedOcrData[0].ocr_id);
        }
      } else {
        throw new Error(result.message || "Failed to fetch OCR data");
      }
    } catch (err: any) {
      console.error("Error fetching OCR data:", err);
      setError(err.message || "An error occurred while fetching OCR data");
      toast.error("Failed to load OCR data", {
        description: err.message || "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("OCR text copied to clipboard!");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const normalizeOcrPages = (ocrJson: unknown): OcrPageView[] => {
    if (!ocrJson) return [];

    if (typeof ocrJson === "string") {
      return [{ pageNumber: 1, text: ocrJson }];
    }

    if (Array.isArray(ocrJson)) {
      return ocrJson
        .map((entry, index) => {
          if (typeof entry === "string") {
            return { pageNumber: index + 1, text: entry };
          }
          if (entry && typeof entry === "object") {
            const pageValue = (entry as { page?: number }).page;
            const textValue = (entry as { text?: string }).text;
            return {
              pageNumber: typeof pageValue === "number" ? pageValue : index + 1,
              text: typeof textValue === "string" ? textValue : "",
            };
          }
          return { pageNumber: index + 1, text: "" };
        })
        .filter((page) => page.text.trim().length > 0);
    }

    if (typeof ocrJson === "object") {
      const record = ocrJson as { pages?: unknown; text?: unknown };
      if (Array.isArray(record.pages)) {
        return normalizeOcrPages(record.pages);
      }
      if (typeof record.text === "string") {
        return [{ pageNumber: 1, text: record.text }];
      }
    }

    return [];
  };

  const buildAllPagesText = (pages: OcrPageView[]) =>
    pages.map((page) => `Page ${page.pageNumber}:\n${page.text}`).join("\n\n");

  const selectedOcrItem = ocrData.find((item) => item.ocr_id === selectedOcrId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document OCR Data
          </DialogTitle>
        </DialogHeader>

        {ocrData.length > 1 && (
          <div className="px-6 pt-4 pb-2">
            <Select
              value={selectedOcrId ?? ""}
              onValueChange={(value) => setSelectedOcrId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a file to view its OCR data" />
              </SelectTrigger>
              <SelectContent>
                {ocrData.map((item) => (
                  <SelectItem key={item.ocr_id} value={item.ocr_id}>
                    {item.file_url.split("/").pop() || item.file_url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ✅ add min-h-0 so the scroll area can take remaining space */}
        <div className="overflow-y-auto h-full">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
              <div className="text-red-500 mb-2">
                <Eye className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                Error Loading OCR Data
              </h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : ocrData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
              <div className="text-muted-foreground mb-2">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No OCR Data Found</h3>
              <p className="text-sm text-muted-foreground">
                This document does not have any OCR data associated with it.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              {selectedOcrItem && (
                <Card>
                  <CardContent className="p-4">
                    {(() => {
                      const pages = normalizeOcrPages(selectedOcrItem.ocr_json);
                      const pageText = buildAllPagesText(pages);

                      return (
                        <>
                          <div className="flex justify-between items-start mb-3">
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(selectedOcrItem.created_at)}
                            </Badge>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyToClipboard(pageText)}
                              disabled={!pageText}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy OCR Text
                            </Button>
                          </div>

                          <Separator className="mb-3" />

                          <div className="text-sm font-medium mb-2">
                            OCR Result:
                          </div>

                          {pages.length > 0 ? (
                            <div className="space-y-3">
                              {pages.map((page) => (
                                <div
                                  key={`${selectedOcrItem.ocr_id}-page-${page.pageNumber}`}
                                  className="rounded-md border bg-muted/20 p-3"
                                >
                                  <div className="text-xs font-semibold mb-2">
                                    Page {page.pageNumber}
                                  </div>
                                  <p className="whitespace-pre-wrap break-words text-sm">
                                    {page.text ||
                                      "No text detected on this page."}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No OCR text available for this file.
                            </p>
                          )}

                          <div className="mt-3 text-xs text-muted-foreground">
                            File:{" "}
                            {selectedOcrItem.file_url.split("/").pop() ||
                              selectedOcrItem.file_url}
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
