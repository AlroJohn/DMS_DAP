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

interface OcrData {
  ocr_id: string;
  file_url: string;
  ocr_json: any;
  created_at: string;
  updated_at: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && documentId) {
      fetchOcrData();
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
        setOcrData(result.data?.ocrData || []);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document OCR Data
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <div className="text-red-500 mb-2">
                <Eye className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Error Loading OCR Data</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : ocrData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
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
              <div className="space-y-4">
                {ocrData.map((ocrItem) => (
                  <Card key={ocrItem.ocr_id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(ocrItem.created_at)}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyToClipboard(JSON.stringify(ocrItem.ocr_json, null, 2))}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy JSON
                        </Button>
                      </div>
                      
                      <Separator className="mb-3" />
                      
                      <div className="text-sm font-medium mb-2">OCR Result:</div>
                      <pre className="whitespace-pre-wrap break-words bg-muted p-3 rounded-md text-sm max-h-60 overflow-y-auto">
                        {JSON.stringify(ocrItem.ocr_json, null, 2)}
                      </pre>
                      
                      <div className="mt-3 text-xs text-muted-foreground">
                        File: {ocrItem.file_url.split('/').pop() || ocrItem.file_url}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}