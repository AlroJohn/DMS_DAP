"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Lock,
  Unlock,
  AlertTriangle,
  LockKeyhole,
} from "lucide-react";
import { useDocumentLock } from "@/hooks/useDocumentLock";
import { CheckoutDocumentModal } from "@/components/modals/checkout-document-modal";
import { DocumentLockBadge } from "@/components/ui/document-lock-badge";

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

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classification: "",
    origin: "",
  });
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutAction, setCheckoutAction] = useState<
    "checkout" | "checkin" | "override"
  >("checkout");

  // Document lock management
  const { lock, checkout, checkin, override, canEdit, canOverride, checkLock } =
    useDocumentLock({
      documentId: documentId,
      currentUserId: "current-user-id", // TODO: Get from auth context
    });

  useEffect(() => {
    fetchDocument();
    checkLock(); // Check lock status on mount
  }, [documentId, checkLock]);

  const fetchDocument = async () => {
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
        router.back();
      }
    } catch (error) {
      toast.error("Error loading document");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckoutAction = (
    action: "checkout" | "checkin" | "override"
  ) => {
    setCheckoutAction(action);
    setCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = async () => {
    let success = false;
    if (checkoutAction === "checkout") {
      success = await checkout();
    } else if (checkoutAction === "checkin") {
      success = await checkin();
    } else {
      success = await override();
    }

    if (success) {
      await checkLock(); // Refresh lock status
    }
  };

  const handleSave = async () => {
    // Check if document is locked by someone else
    if (lock.status === "locked" && !canEdit) {
      toast.error("Cannot save: Document is locked by another user");
      return;
    }

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
        router.back();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  // Determine if form should be disabled
  const isFormDisabled = lock.status === "locked" && !canEdit;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Edit Document</h1>
        </div>
      </div>

      {/* Lock Warning Alert */}
      {lock.status === "locked" && !canEdit && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This document is currently locked by{" "}
            <strong>{lock.lockedBy?.name}</strong> since{" "}
            {lock.lockedAt
              ? new Date(lock.lockedAt).toLocaleString()
              : "unknown"}
            . You cannot edit this document until it is checked back in.
            {canOverride && (
              <Button
                variant="link"
                className="p-0 h-auto ml-2"
                onClick={() => handleCheckoutAction("override")}
              >
                Override lock
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Prompt to checkout if available */}
      {lock.status === "available" && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            This document is available for editing. Consider checking it out to
            prevent conflicts with other users.
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-blue-600"
              onClick={() => handleCheckoutAction("checkout")}
            >
              Check out now
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
              disabled={isFormDisabled}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter document description"
              rows={4}
              disabled={isFormDisabled}
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
                disabled={isFormDisabled}
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
                disabled={isFormDisabled}
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

          <div className="flex justify-end gap-4 pt-6">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isFormDisabled}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
