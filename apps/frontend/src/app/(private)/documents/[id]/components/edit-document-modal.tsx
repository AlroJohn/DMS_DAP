"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { useSocket } from "@/components/providers/providers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Document {
  document_id: string;
  title: string;
  description?: string;
  document_code: string;
  document_type: string;
  classification: string;
  origin: string;
  status: string;
  detail?: {
    document_name?: string;
    classification?: string;
    origin?: string;
    document_code?: string;
  };
}

interface EditDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  onSuccess: () => void;
}

export function EditDocumentModal({
  open,
  onOpenChange,
  documentId,
  onSuccess,
}: EditDocumentModalProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classification: "",
    origin: "",
  });

  const { socket } = useSocket();

  useEffect(() => {
    if (open && documentId) {
      fetchDocument();
    }
  }, [open, documentId]);

  const fetchDocument = async () => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const doc = result.data;
          setDocument(doc);
          setFormData({
            title: doc.title || doc.detail?.document_name || "",
            description: doc.description || "",
            classification:
              doc.classification || doc.detail?.classification || "",
            origin: doc.origin || doc.detail?.origin || "",
          });
        }
      } else {
        toast.error("Failed to load document");
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Error loading document");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!documentId) return;

    try {
      setIsSaving(true);

      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.title,
          content: formData.description,
          classification: formData.classification,
          origin: formData.origin,
        }),
      });

      if (response.ok) {
        toast.success("Document updated successfully");
        onSuccess();
        onOpenChange(false);
        if (socket && documentId) {
          socket.emit("documentUpdated", { documentId });
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error?.message || "Failed to update document");
      }
    } catch (error) {
      toast.error("Error updating document");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Make changes to your document here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">Document Code</Label>
                      <Input
                        id="code"
                        value={
                          document?.document_code ||
                          document?.detail?.document_code ||
                          ""
                        }
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Input
                        id="status"
                        value={document?.status || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Enter document title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Enter document description"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="classification">Classification</Label>
                      <Select
                        value={formData.classification}
                        onValueChange={(value) =>
                          setFormData({ ...formData, classification: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="complex">Complex</SelectItem>
                          <SelectItem value="highly_technical">
                            Highly Technical
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="origin">Origin</Label>
                      <Select
                        value={formData.origin}
                        onValueChange={(value) =>
                          setFormData({ ...formData, origin: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
