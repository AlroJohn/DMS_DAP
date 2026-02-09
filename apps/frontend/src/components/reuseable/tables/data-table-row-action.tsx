"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  Trash2,
  Archive,
  Copy,
  Shield,
  FilePenLine,
  RotateCcw,
  FileText,
} from "lucide-react";
import { ViewDocumentsModal } from "@/components/reuseable/view-details-documents/view-documents";
import { ViewOcrDataModal } from "@/components/modals/view-ocr-data-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReleaseDocumentModal } from "@/components/modals/release-document-modal";
import { EditDocumentModal } from "@/app/(private)/documents/[id]/components/edit-document-modal";
import { CheckoutFileModal } from "@/components/modals/checkout-file-modal";
import { Document } from "@/hooks/use-documents-owned";
import { useAuth } from "@/hooks/use-auth";
// import { useSignDocument } from "@/hooks/use-sign-document";
import {
  canViewDocuments,
  canEditDocumentDetails,
  canEditDocument,
  canViewDocument,
  canSignDocument,
  canReleaseDocument,
  canCompleteDocument,
  canCancelDocument,
  canArchiveDocument,
  canDeleteDocument,
  hasAnyPermission,
  hasPermission,
} from "@/lib/document-permissions";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  viewType?:
    | "document"
    | "owned"
    | "shared"
    | "outgoing"
    | "archive"
    | "recycle-bin";
  onSign?: (document: TData) => void;
  onActionSuccess?: () => void; // Add callback to refresh data after actions
}

const getReturnPathForView = (
  viewType: DataTableRowActionsProps<unknown>["viewType"],
) => {
  switch (viewType) {
    case "owned":
      return "/documents/owned";
    case "shared":
      return "/documents/shared";
    case "outgoing":
      return "/documents/in-transit?tab=outgoing";
    case "archive":
      return "/documents/archive";
    case "recycle-bin":
      return "/documents/recycle-bin";
    case "document":
    default:
      return "/documents";
  }
};

export function DataTableRowActions<TData>({
  row,
  viewType = "document",
  onActionSuccess,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  // const { signDocument, isLoading: isSigning, error: signError } = useSignDocument();

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [modalState, setModalState] = useState({
    view: false,
    edit: false,
    release: false,
    checkoutFile: false,
  });
  const [checkoutAction, setCheckoutAction] = useState<"edit" | "signature">(
    "edit",
  );

  const [activeSignatureData, setActiveSignatureData] = useState<string | null>(
    null,
  );
  const [viewDocumentModalOpen, setViewDocumentModalOpen] = useState(false);
  const [viewOcrModalOpen, setViewOcrModalOpen] = useState(false);
  const [showCompleteAlert, setShowCompleteAlert] = useState(false);
  const [showUncompleteAlert, setShowUncompleteAlert] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const document = row.original as Document;

  // Event handlers
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(document.documentId);
    toast.success("Document Code copied to clipboard");
  };

  const toggleModal = (modalType: keyof typeof modalState, value: boolean) => {
    setModalState((prev) => {
      // Only update if the value is actually changing
      if (prev[modalType] === value) {
        return prev;
      }
      return { ...prev, [modalType]: value };
    });
    if (!value) {
      setSelectedDocument(null);
    }
  };

  const handleView = () => {
    toggleModal("view", true);
  };

  const handleViewDocument = () => {
    router.push(`/documents/${document.id}/view-documents`);
  };

  const handleOpenEditor = () => {
    const returnPath = getReturnPathForView(viewType);
    router.push(
      `/documents/${document.id}?mode=edit&returnTo=${encodeURIComponent(
        returnPath,
      )}`,
    );
  };

  const handleViewOcrData = () => {
    setViewOcrModalOpen(true);
  };

  const handleSign = () => {
    // Determine return path based on view type
    const returnPath = getReturnPathForView(viewType);

    // Redirect to the document page in signature mode with return path
    router.push(
      `/documents/${document.id}?mode=sign&returnTo=${encodeURIComponent(
        returnPath,
      )}`,
    );
  };

  const handleEdit = () => {
    setSelectedDocument(document);
    toggleModal("edit", true);
  };

  const handleCheckoutFile = () => {
    setSelectedDocument(document);
    setCheckoutAction("edit");
    toggleModal("checkoutFile", true);
  };

  const handleSignaturePlaceholder = () => {
    setSelectedDocument(document);
    setCheckoutAction("signature");
    toggleModal("checkoutFile", true);
  };

  const handleRelease = () => {
    console.log("🔄 Release button clicked for document:", document);
    setSelectedDocument(document);
    toggleModal("release", true);
  };

  const handleCompleteConfirm = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/documents/${document.id}/complete`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to complete document",
        );
      }

      toast.success("Document completed successfully.");
      setShowCompleteAlert(false);
      
      // Refresh data to maintain assigned action buttons
      if (onActionSuccess) {
        onActionSuccess();
      }
    } catch (error: any) {
      console.error("Error completing document:", error);
      toast.error(error.message || "Failed to complete document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    setShowCompleteAlert(true);
  };

  const handleUncompleteConfirm = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/documents/${document.id}/uncomplete`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to uncomplete document",
        );
      }

      toast.success("Document status reverted successfully.");
      setShowUncompleteAlert(false);
      
      // Refresh data to maintain assigned action buttons
      if (onActionSuccess) {
        onActionSuccess();
      }
    } catch (error: any) {
      console.error("Error uncompleting document:", error);
      toast.error(error.message || "Failed to uncomplete document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUncomplete = () => {
    setShowUncompleteAlert(true);
  };

  const handleCancel = () => {
    setShowCancelAlert(true);
  };

  const handleCancelConfirm = async () => {
    try {
      setIsLoading(true);

      // Check if document is in 'intransit' status to use the appropriate endpoint
      const statusValue = document.status?.toLowerCase();
      const isDocumentInTransit =
        statusValue === "intransit" || statusValue === "intransit_signature";

      let response;
      if (isDocumentInTransit) {
        // Use the intransit cancel endpoint for in-transit documents to revert status back to pending
        response = await fetch(`/api/intransit/${document.id}/cancel`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } else {
        // Use the regular cancel endpoint for other statuses
        response = await fetch(`/api/documents/${document.id}/cancel`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to cancel document",
        );
      }

      const result = await response.json();
      toast.success(result.message || "Document cancelled successfully.");
      setShowCancelAlert(false);
      
      // Refresh data to maintain assigned action buttons
      if (onActionSuccess) {
        onActionSuccess();
      }
    } catch (error: any) {
      console.error("Error cancelling document:", error);
      toast.error(error.message || "Failed to cancel document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);

      // Use different API endpoints based on view type
      // In recycle-bin view, we want to permanently delete
      if (viewType === "recycle-bin") {
        // Permanently delete from recycle bin - use bulk delete endpoint with single ID
        const response = await fetch("/api/documents/bulk-delete", {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentIds: [document.id],
          }),
        });

        if (!response.ok) {
          let errorMessage = "Failed to permanently delete document";
          try {
            const errorData = await response.json();
            errorMessage =
              errorData.error?.message || errorData.message || errorMessage;
          } catch (parseError) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        toast.success("Document permanently deleted.");
      } else {
        // Regular delete to recycle bin
        const response = await fetch(`/api/documents/${document.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          let errorMessage = "Failed to delete document";
          try {
            const errorData = await response.json();
            errorMessage =
              errorData.error?.message || errorData.message || errorMessage;
          } catch (parseError) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        toast.success("Document successfully deleted.");
      }
      
      // Refresh data to maintain assigned action buttons
      if (onActionSuccess) {
        onActionSuccess();
      }
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error(error.message || "Failed to delete document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/archive/${document.id}/archive`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to archive document";
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.error?.message || errorData.message || errorMessage;
          console.error("Archive error response:", errorData);
        } catch (parseError) {
          const responseText = await response.text().catch(() => "Unable to read response");
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
          console.error("Archive error status:", response.status, "Response:", responseText);
        }
        throw new Error(errorMessage);
      }

      toast.success("Document successfully archived.");
      
      // Refresh data to maintain assigned action buttons
      if (onActionSuccess) {
        onActionSuccess();
      }
    } catch (error: any) {
      console.error("Error archiving document:", error);
      toast.error(error.message || "Failed to archive document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsLoading(true);

      // Use different API endpoints based on view type
      // For recycle-bin: restore from deleted state using recycle-bin endpoint
      // For archive: restore from archived state using archive endpoint
      let endpoint, method;
      if (viewType === "recycle-bin") {
        endpoint = `/api/recycle-bin/${document.id}/restore`; // Use correct recycle-bin endpoint
        method = "PUT"; // Recycle bin restore uses PUT method
      } else {
        endpoint = `/api/archive/${document.id}/restore`; // Archive restore uses archive endpoint
        method = "POST"; // Archive restoration uses POST method
      }

      const response = await fetch(endpoint, {
        method: method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Failed to restore document";
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.error?.message || errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast.success("Document successfully restored.");
      
      // Refresh data to maintain assigned action buttons
      if (onActionSuccess) {
        onActionSuccess();
      }
    } catch (error: any) {
      console.error("Error restoring document:", error);
      toast.error(error.message || "Failed to restore document.");
    } finally {
      setIsLoading(false);
    }
  };

  // Permission checks
  const canViewDetails = canViewDocuments(currentUser);
  const canViewDoc = canViewDocument(currentUser);

  // For owned view, documents should be treated as owned by the user
  const effectiveDocument =
    viewType === "owned" ? { ...document, isOwned: true } : document;

  const canEditDetails = canEditDocumentDetails(currentUser, effectiveDocument);
  const canEditDoc = canEditDocument(currentUser, effectiveDocument);
  const canSignDoc = canSignDocument(currentUser, effectiveDocument);
  const canRelease = canReleaseDocument(currentUser, effectiveDocument);
  const canComplete = canCompleteDocument(currentUser, effectiveDocument);
  const canCancel = canCancelDocument(currentUser, effectiveDocument);
  const canArchive = canArchiveDocument(currentUser, effectiveDocument);
  const canDelete = canDeleteDocument(currentUser, effectiveDocument);

  // Status-based checks
  const isDispatch = document.status?.toLowerCase().includes("pending");
  const isInTransit = document.status?.toLowerCase() === "intransit";
  const isCompleted = document.status?.toLowerCase() === "completed";

  // Check if document is already in transit (released) - in which case release should be disabled
  const isAlreadyReleased = isInTransit;

  // Check if user has signature placeholders assigned (for shared documents)
  const hasAssignedSignature = (document as any).hasAssignedSignature || false;
  
  // Check if user has an assigned action type (for shared documents)
  const assignedActionType = (document as any).assignedActionType || null;
  
  // Debug logging for shared documents
  if (viewType === "shared") {
    console.log('🔍 [DataTableRowActions] Document:', document.documentId, {
      hasAssignedSignature,
      assignedActionType,
      assignedActionTypeUpper: assignedActionType?.toUpperCase(),
      canSignDoc,
      canEditDoc,
      canRelease,
      fullDocument: document
    });
  }

  // Determine which actions to show based on view type
  const showCopyCode = viewType === "document" ? "copy_code" : "copy";
  const showViewDetails = canViewDetails;
  const showViewDocument = canViewDoc;
  
  // Helper function to check if action type includes a specific action
  // Handles both single strings and arrays of actions
  const hasActionType = (action: string): boolean => {
    if (!assignedActionType) return false;
    
    // If it's an array, check if any item includes the action
    if (Array.isArray(assignedActionType)) {
      return assignedActionType.some(type => 
        String(type).toUpperCase().includes(action.toUpperCase())
      );
    }
    
    // If it's a string, check if it includes the action (handles comma-separated too)
    return String(assignedActionType).toUpperCase().includes(action.toUpperCase());
  };
  
  // For shared documents with "FOR APPROVAL" action, show specific buttons
  const isForApproval = viewType === "shared" && hasActionType("APPROVAL");
  
  // For shared documents with "FOR REVIEW" action, show specific buttons
  const isForReview = viewType === "shared" && hasActionType("REVIEW");
  
  // For shared documents with "FOR CANCELLATION" action, show specific buttons
  const isForCancellation = viewType === "shared" && hasActionType("CANCELLATION");
  
  // For shared documents with "FOR SIGNATURE" action, show specific buttons
  const isForSignature = viewType === "shared" && hasActionType("SIGNATURE");
  
  // For shared documents with "FOR COMPLETE" action, show specific buttons
  const isForComplete = viewType === "shared" && hasActionType("COMPLETE");
  
  // For shared documents with "APPROVED" action, show all buttons except archive
  const isApproved = viewType === "shared" && hasActionType("APPROVED");
  
  // For shared documents with "REVIEWED" action, show all buttons except archive (same as APPROVED)
  const isReviewed = viewType === "shared" && hasActionType("REVIEWED");
  
  console.log('🔍 [DataTableRowActions] Action type checks:', {
    viewType,
    assignedActionType,
    isForApproval,
    isForReview,
    isForCancellation,
    isForSignature,
    isForComplete,
    isApproved,
    isReviewed
  });
  
  // For shared documents, adjust permissions based on assigned action
  // When multiple actions are assigned, combine the permissions
  const showSignDocument = viewType === "shared" 
    ? (isForApproval || isForSignature || isApproved || isReviewed ? true : (canSignDoc && hasAssignedSignature))
    : canSignDoc;
  
  // Edit Details: FOR APPROVAL OR APPROVED OR REVIEWED
  const showEditDetails = viewType === "shared" ? (isForApproval || isApproved || isReviewed) : canEditDetails;
  
  // Edit Document: FOR APPROVAL OR FOR CANCELLATION OR APPROVED OR REVIEWED
  const showEditDocument = viewType === "shared" 
    ? (isForApproval || isForCancellation || isApproved || isReviewed)
    : canEditDoc;
  
  // Signature Placeholder: FOR APPROVAL OR FOR REVIEW OR FOR SIGNATURE OR APPROVED OR REVIEWED or if user has signature placeholders assigned
  const showSignaturePlaceholder = viewType === "shared" 
    ? (isForApproval || isForReview || isForSignature || isApproved || isReviewed ? true : (canEditDoc && hasAssignedSignature))
    : canEditDoc;
  
  // Release: FOR APPROVAL OR FOR REVIEW OR FOR CANCELLATION OR FOR SIGNATURE OR FOR COMPLETE OR APPROVED OR REVIEWED (but not for completed documents)
  const showRelease = ((isForApproval || isForReview || isForCancellation || isForSignature || isForComplete || isApproved || isReviewed) && !isCompleted)
    ? true 
    : (canRelease && !isAlreadyReleased && !isCompleted); // Release is hidden when document is already in-transit or completed
  
  // Complete/Uncomplete: FOR APPROVAL OR FOR COMPLETE OR APPROVED OR REVIEWED
  const showComplete = viewType === "shared"
    ? (isForApproval || isForComplete || isApproved || isReviewed) && !isCompleted  // Show Complete for FOR APPROVAL or FOR COMPLETE or APPROVED or REVIEWED in shared view, but not if already completed
    : (canComplete && !isDispatch && !isCompleted); // Normal logic for other views
  
  const showUncomplete = viewType === "shared"
    ? (isForApproval || isForComplete || isApproved || isReviewed) && isCompleted  // Show Uncomplete if document is completed
    : (canComplete && isCompleted); // Show Uncomplete for completed documents
  
  const showCancel = viewType === "shared" 
    ? false // No cancel button for shared documents
    : (canCancel && isInTransit); // Cancel only shows for in-transit status in other views
  const showArchive = viewType === "shared" ? ((isApproved || isReviewed) ? false : canArchive) : canArchive; // Hide archive for APPROVED or REVIEWED
  const showDelete = viewType === "shared" ? ((isApproved || isReviewed) ? true : canDelete) : canDelete; // Show delete for APPROVED or REVIEWED
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            onClick={(e) => e.stopPropagation()}
            disabled={isLoading}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="min-w-60 max-w-87.5 max-h-[3f00px] overflow-y-auto"
        >
          {/* Document View Actions */}
          {viewType === "document" && (
            <>
              {/* Copy - for document view */}
              <DropdownMenuItem
                onClick={(e) => handleAction(e, handleCopyCode)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </DropdownMenuItem>

              {/* View Details - for users with document read permissions */}
              {showViewDetails && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleView)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}

              {/* View Document - for users with document read permissions */}
              {showViewDocument && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleViewDocument)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Document
                </DropdownMenuItem>
              )}

              {/* View Document OCR - for users with document read permissions */}
              {showViewDocument && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleViewOcrData)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Document OCR
                </DropdownMenuItem>
              )}

              {/* Sign Document - for users with signing permissions */}
              {showSignDocument && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleSign)}>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign Document
                </DropdownMenuItem>
              )}

              {/* Edit Details - for users with edit permissions */}
              {showEditDetails && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleEdit)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
              )}

              {/* Edit Document - for users with edit permissions */}
              {showEditDocument && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleCheckoutFile)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Document
                </DropdownMenuItem>
              )}

              {showSignaturePlaceholder && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleSignaturePlaceholder)}
                >
                  <FilePenLine className="mr-2 h-4 w-4" />
                  Signature Placeholder
                </DropdownMenuItem>
              )}

              {(showSignDocument ||
                showEditDetails ||
                showEditDocument ||
                showSignaturePlaceholder) && <DropdownMenuSeparator />}

              {/* Release - for users with transfer permissions */}
              {showRelease && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleRelease)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Release
                </DropdownMenuItem>
              )}

              {/* Complete - for users with document receive permissions and pending status */}
              {showComplete && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleComplete)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete
                </DropdownMenuItem>
              )}

              {/* Uncomplete - for completed documents */}
              {showUncomplete && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleUncomplete)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Uncomplete
                </DropdownMenuItem>
              )}

              {/* Cancel - for users with transfer reject permissions and in-transit status */}
              {showCancel && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleCancel)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}

              {(showRelease || showComplete || showCancel) && (
                <DropdownMenuSeparator />
              )}

              {/* Archive - for users with archive permissions */}
              {showArchive && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleArchive)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}

              {/* Delete - for users with delete permissions */}
              {showDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      disabled={isLoading}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you sure you want to delete this document?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the document and remove its data from our
                        servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isLoading}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}

          {/* Owned View Actions */}
          {viewType === "owned" && (
            <>
              {/* Copy Code - for owned documents view */}
              <DropdownMenuItem
                onClick={(e) => handleAction(e, handleCopyCode)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </DropdownMenuItem>

              {/* View Details - for users with document read permissions */}
              {showViewDetails && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleView)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}

              {/* View Document - for users with document read permissions */}
              {showViewDocument && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleViewDocument)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Document
                </DropdownMenuItem>
              )}

              {/* View Document OCR - for users with document read permissions */}
              {showViewDocument && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleViewOcrData)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Document OCR
                </DropdownMenuItem>
              )}

              {/* Sign Document - for users with signing permissions */}
              {showSignDocument && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleSign)}>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign Document
                </DropdownMenuItem>
              )}

              {/* Edit Details - for users with edit permissions */}
              {showEditDetails && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleEdit)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
              )}

              {/* Edit Document - for users with edit permissions */}
              {showEditDocument && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleCheckoutFile)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Document
                </DropdownMenuItem>
              )}

              {showSignaturePlaceholder && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleSignaturePlaceholder)}
                >
                  <FilePenLine className="mr-2 h-4 w-4" />
                  Signature Placeholder
                </DropdownMenuItem>
              )}

              {(showSignDocument ||
                showEditDetails ||
                showEditDocument ||
                showSignaturePlaceholder) && <DropdownMenuSeparator />}

              {/* Archive - for users with archive permissions */}
              {showArchive && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleArchive)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}

              {/* Delete - for users with delete permissions */}
              {showDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      disabled={isLoading}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you sure you want to delete this document?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the document and remove its data from our
                        servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isLoading}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}

          {/* Shared View Actions - Show only the allowed actions for shared documents */}
          {viewType === "shared" && (
            <>
              {/* Copy Code - always available in shared view */}
              <DropdownMenuItem
                onClick={(e) => handleAction(e, handleCopyCode)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </DropdownMenuItem>

              {/* View Details - always available in shared view */}
              {showViewDetails && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleView)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}

              {/* View Documents - always available in shared view */}
              {showViewDocument && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleViewDocument)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Documents
                </DropdownMenuItem>
              )}

              {/* View Document OCR - always available in shared view */}
              {showViewDocument && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleViewOcrData)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Document OCR
                </DropdownMenuItem>
              )}

              {/* Sign Document - show based on FOR APPROVAL or signature placeholders */}
              {showSignDocument && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleSign)}>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign Document
                </DropdownMenuItem>
              )}

              {/* Edit Details - show when FOR APPROVAL */}
              {showEditDetails && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleEdit)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
              )}

              {/* Edit Documents - show based on FOR APPROVAL or existing permissions */}
              {showEditDocument && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleCheckoutFile)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Documents
                </DropdownMenuItem>
              )}

              {/* Signature Placeholder - show based on FOR APPROVAL or signature placeholders */}
              {showSignaturePlaceholder && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleSignaturePlaceholder)}
                >
                  <FilePenLine className="mr-2 h-4 w-4" />
                  Signature Placeholder
                </DropdownMenuItem>
              )}

              {/* Release - show based on FOR APPROVAL or existing permissions */}
              {showRelease && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleRelease)}>
                  <Send className="mr-2 h-4 w-4" />
                  Release
                </DropdownMenuItem>
              )}

              {/* Complete - show for FOR APPROVAL documents */}
              {showComplete && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleComplete)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete
                </DropdownMenuItem>
              )}

              {/* Uncomplete - for completed documents */}
              {showUncomplete && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleUncomplete)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Uncomplete
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Outgoing View Actions - Cancel and Archive for in-transit documents */}
          {viewType === "outgoing" && (
            <>
              {/* Cancel - for users with transfer reject permissions and in-transit status */}
              {showCancel && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleCancel)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}
              {/* Archive - for users with archive permissions */}
              {showArchive && (
                <DropdownMenuItem
                  onClick={(e) => handleAction(e, handleArchive)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Archive View Actions - Restore and Delete for archived documents */}
          {viewType === "archive" && (
            <>
              {/* Restore - for users with archive permissions */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleRestore)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>

              {/* Delete - for users with delete permissions */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    disabled={isLoading}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to delete this document permanently?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the document and remove its data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isLoading}
                    >
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {/* Recycle Bin View Actions - Restore and Delete for archived documents */}
          {viewType === "recycle-bin" && (
            <>
              {/* Restore - for users with archive permissions */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleRestore)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>

              {/* Delete - for users with delete permissions - permanent delete in recycle bin */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    disabled={isLoading}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Permanently
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to permanently delete this document?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the document and remove its data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isLoading}
                    >
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Modal */}
      <ViewDocumentsModal
        open={modalState.view || viewDocumentModalOpen}
        onOpenChange={(open) => {
          if (modalState.view) {
            toggleModal("view", open);
          } else if (viewDocumentModalOpen) {
            setViewDocumentModalOpen(open);
            if (!open) {
              setActiveSignatureData(null); // Clear active signature if modal is closed
            }
          }
        }}
        documentId={document.id}
        activeSignatureData={activeSignatureData}
        onConfirmSignaturePlacement={async (coords) => {
          if (!selectedDocument) return;

          try {
            setIsLoading(true); // Set loading state for the request

            const response = await fetch(
              `/api/documents/${selectedDocument.id}/sign-manual`,
              {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  signatureData: coords.signatureData,
                  x_position: coords.x_position,
                  y_position: coords.y_position,
                  width: coords.width,
                  height: coords.height,
                  page_number: coords.page_number,
                }),
              },
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.error?.message || "Failed to sign document manually",
              );
            }

            toast.success("Document signed successfully!");
            setViewDocumentModalOpen(false); // Close the modal on success
            setActiveSignatureData(null); // Clear active signature
            // Optionally, trigger a refetch of document data if needed
          } catch (err: any) {
            toast.error("Failed to sign document", {
              description: err.message,
            });
          } finally {
            setIsLoading(false); // Reset loading state
          }
        }}
      />

      {/* Release Modal */}
      <ReleaseDocumentModal
        isOpen={modalState.release}
        onClose={() => toggleModal("release", false)}
        document={selectedDocument}
        onSuccess={() => {
          // Refresh data to maintain assigned action buttons
          if (onActionSuccess) {
            onActionSuccess();
          }
        }}
      />

      {/* Edit Modal */}
      {selectedDocument && (
        <EditDocumentModal
          open={modalState.edit}
          onOpenChange={(open) => toggleModal("edit", open)}
          documentId={selectedDocument.id}
          onSuccess={() => {
            // Refresh data to maintain assigned action buttons
            if (onActionSuccess) {
              onActionSuccess();
            }
          }}
        />
      )}

      {/* Checkout File Modal */}
      {selectedDocument && (
        <CheckoutFileModal
          open={modalState.checkoutFile}
          onOpenChange={(open) => toggleModal("checkoutFile", open)}
          documentId={selectedDocument.id}
          action={checkoutAction}
          onSuccess={() => {
            // Refresh data to maintain assigned action buttons
            if (onActionSuccess) {
              onActionSuccess();
            }
          }}
        />
      )}

      {/* View OCR Data Modal */}
      <ViewOcrDataModal
        open={viewOcrModalOpen}
        onOpenChange={setViewOcrModalOpen}
        documentId={document.id}
      />

      {/* Complete Confirmation Alert Dialog */}
      <AlertDialog open={showCompleteAlert} onOpenChange={setShowCompleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this document as completed? This action will update the document status to completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteConfirm} disabled={isLoading}>
              {isLoading ? "Completing..." : "Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Uncomplete Confirmation Alert Dialog */}
      <AlertDialog open={showUncompleteAlert} onOpenChange={setShowUncompleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Completed Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revert this document from completed status? This action will change the document status back to pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUncompleteConfirm} disabled={isLoading}>
              {isLoading ? "Reverting..." : "Revert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Alert Dialog */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this document? This action will revert the document status back to pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>No, Keep It</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} disabled={isLoading}>
              {isLoading ? "Cancelling..." : "Yes, Cancel Document"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Signature Capture Modal */}
    </>
  );
}
