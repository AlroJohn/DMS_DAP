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
} from "lucide-react";
import { ViewDocumentsModal } from "@/components/reuseable/view-details-documents/view-documents";
import { BlockchainSigningModal } from "@/components/modals/blockchain-signing-modal";

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
  hasPermission
} from "@/lib/document-permissions";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  viewType?: 'document' | 'owned' | 'shared' | 'outgoing' | 'archive'; // 'document' for general document view, 'owned' for owned documents view, 'shared' for shared documents view, 'outgoing' for outgoing documents, 'archive' for archive view
}

export function  DataTableRowActions<TData>({
  row,
  viewType = 'document', // Default to 'document' view, can also be 'owned', 'shared', 'outgoing', or 'archive'
}: DataTableRowActionsProps<TData>) {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [modalState, setModalState] = useState({
    view: false,
    edit: false,
    release: false,
    complete: false,
    sign: false,
    checkoutFile: false,
  });

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
    setModalState((prev) => ({ ...prev, [modalType]: value }));
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
    router.push(`/documents/${document.id}?mode=edit`);
  };

  const handleSign = () => {
    setSelectedDocument(document);
    toggleModal("sign", true);
  };

  const handleEdit = () => {
    setSelectedDocument(document);
    toggleModal("edit", true);
  };

  const handleCheckoutFile = () => {
    setSelectedDocument(document);
    toggleModal("checkoutFile", true);
  };

  const handleRelease = () => {
    console.log('🔄 Release button clicked for document:', document);
    setSelectedDocument(document);
    toggleModal("release", true);
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/documents/${document.id}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to complete document');
      }

      toast.success("Document completed successfully.");
    } catch (error: any) {
      console.error("Error completing document:", error);
      toast.error(error.message || "Failed to complete document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/documents/${document.id}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to cancel document');
      }

      toast.success("Document cancelled successfully.");
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
      if (viewType === 'recycle-bin') {
        // Permanently delete from recycle bin - use bulk delete endpoint with single ID
        const response = await fetch('/api/documents/bulk-delete', {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentIds: [document.id]
          })
        });

        if (!response.ok) {
          let errorMessage = 'Failed to permanently delete document';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorData.message || errorMessage;
          } catch (parseError) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        toast.success("Document permanently deleted.");
      } else {
        // Regular delete to recycle bin
        const response = await fetch(`/api/documents/${document.id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          let errorMessage = 'Failed to delete document';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorData.message || errorMessage;
          } catch (parseError) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        toast.success("Document successfully deleted.");
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
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to archive document';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast.success("Document successfully archived.");
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
      let endpoint;
      if (viewType === 'recycle-bin') {
        endpoint = `/api/documents/${document.id}/restore`;
      } else {
        endpoint = `/api/archive/${document.id}/restore`;
      }

      const response = await fetch(endpoint, {
        method: 'POST', // Changed to POST as most of the other endpoints use POST
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to restore document';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast.success("Document successfully restored.");
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
  const effectiveDocument = viewType === 'owned' ? { ...document, isOwned: true } : document;

  const canEditDetails = canEditDocumentDetails(currentUser, effectiveDocument);
  const canEditDoc = canEditDocument(currentUser, effectiveDocument);
  const canSignDoc = canSignDocument(currentUser, effectiveDocument);
  const canRelease = canReleaseDocument(currentUser, effectiveDocument);
  const canComplete = canCompleteDocument(currentUser, effectiveDocument);
  const canCancel = canCancelDocument(currentUser, effectiveDocument);
  const canArchive = canArchiveDocument(currentUser, effectiveDocument);
  const canDelete = canDeleteDocument(currentUser, effectiveDocument);

  // Status-based checks
  const isDispatch = document.status?.toLowerCase().includes('dispatch');
  const isInTransit = document.status?.toLowerCase().includes('intransit') ||
                     document.status?.toLowerCase().includes('transit') ||
                     document.status?.toLowerCase().includes('outgoing');

  // Determine which actions to show based on view type
  const showCopyCode = viewType === 'document' ? 'copy_code' : 'copy';
  const showViewDetails = canViewDetails;
  const showViewDocument = canViewDoc;
  const showSignDocument = canSignDoc;
  const showEditDetails = canEditDetails;
  const showEditDocument = canEditDoc;
  const showRelease = canRelease;
  const showComplete = canComplete && !isDispatch; // Complete shows when not dispatch status
  const showCancel = canCancel && isInTransit; // Cancel only shows for in-transit status
  const showArchive = canArchive;
  const showDelete = canDelete;

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

        <DropdownMenuContent align="end" className="w-[160px]">
          {/* Document View Actions */}
          {viewType === 'document' && (
            <>
              {/* Copy - for document view */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleCopyCode)}>
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
                <DropdownMenuItem onClick={(e) => handleAction(e, handleViewDocument)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Document
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
                <DropdownMenuItem onClick={(e) => handleAction(e, handleCheckoutFile)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Document
                </DropdownMenuItem>
              )}

              {(showSignDocument || showEditDetails || showEditDocument) && <DropdownMenuSeparator />}

              {/* Release - for users with transfer permissions */}
              {showRelease && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleRelease)}>
                  <Send className="mr-2 h-4 w-4" />
                  Release
                </DropdownMenuItem>
              )}

              {/* Complete - for users with document receive permissions and dispatch status */}
              {showComplete && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleComplete)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete
                </DropdownMenuItem>
              )}

              {/* Cancel - for users with transfer reject permissions and in-transit status */}
              {showCancel && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleCancel)}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}

              {(showRelease || showComplete || showCancel) && <DropdownMenuSeparator />}

              {/* Archive - for users with archive permissions */}
              {showArchive && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleArchive)}>
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
                        This action cannot be undone. This will permanently delete the
                        document and remove its data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}

          {/* Owned View Actions */}
          {viewType === 'owned' && (
            <>
              {/* Copy Code - for owned documents view */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleCopyCode)}>
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
                <DropdownMenuItem onClick={(e) => handleAction(e, handleViewDocument)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Document
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
                <DropdownMenuItem onClick={(e) => handleAction(e, handleCheckoutFile)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Document
                </DropdownMenuItem>
              )}

              {(showSignDocument || showEditDetails || showEditDocument) && <DropdownMenuSeparator />}

              {/* Archive - for users with archive permissions */}
              {showArchive && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleArchive)}>
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
                        This action cannot be undone. This will permanently delete the
                        document and remove its data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}

          {/* Shared View Actions - Show only the allowed actions for shared documents */}
          {viewType === 'shared' && (
            <>
              {/* Copy Code - always available in shared view */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleCopyCode)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </DropdownMenuItem>

              {/* View Details - always available in shared view */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleView)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>

              {/* View Documents - always available in shared view */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleViewDocument)}>
                <Eye className="mr-2 h-4 w-4" />
                View Documents
              </DropdownMenuItem>

              {/* Sign Document - always available in shared view */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleSign)}>
                <Shield className="mr-2 h-4 w-4" />
                Sign Document
              </DropdownMenuItem>

              {/* Edit Details - always available in shared view */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleEdit)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>

              {/* Edit Documents - always available in shared view */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleCheckoutFile)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Documents
              </DropdownMenuItem>

              {/* Complete - for users with document receive permissions */}
              {showComplete && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleComplete)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete
                </DropdownMenuItem>
              )}

              {/* Release - always available in shared view */}
              <DropdownMenuItem onClick={(e) => handleAction(e, handleRelease)}>
                <Send className="mr-2 h-4 w-4" />
                Release
              </DropdownMenuItem>
            </>
          )}

          {/* Outgoing View Actions - Cancel and Archive for in-transit documents */}
          {viewType === 'outgoing' && (
            <>
              {/* Cancel - for users with transfer reject permissions and in-transit status */}
              {showCancel && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleCancel)}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}
              {/* Archive - for users with archive permissions */}
              {showArchive && (
                <DropdownMenuItem onClick={(e) => handleAction(e, handleArchive)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Archive View Actions - Restore and Delete for archived documents */}
          {viewType === 'archive' && (
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
                      This action cannot be undone. This will permanently delete the
                      document and remove its data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {/* Recycle Bin View Actions - Restore and Delete for archived documents */}
          {viewType === 'recycle-bin' && (
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
                      This action cannot be undone. This will permanently delete the
                      document and remove its data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
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
        open={modalState.view}
        onOpenChange={(open) => toggleModal("view", open)}
        documentId={document.id}
      />

      {/* Release Modal */}
      <ReleaseDocumentModal
        isOpen={modalState.release}
        onClose={() => toggleModal("release", false)}
        document={selectedDocument}
      />

      {/* Blockchain Signing Modal */}
      {selectedDocument && (
        <BlockchainSigningModal
          open={modalState.sign}
          onOpenChange={(open) => toggleModal("sign", open)}
          document={{
            id: selectedDocument.id,
            title: selectedDocument.document,
            hash: (selectedDocument as any).blockchainTxHash,
            blockchainStatus: (selectedDocument as any).blockchainStatus ?? selectedDocument.status,
          }}
          onSigned={() => {
            // The real-time update will handle the UI update
          }}
        />
      )}

      {/* Edit Modal */}
      {selectedDocument && (
        <EditDocumentModal
          open={modalState.edit}
          onOpenChange={(open) => toggleModal("edit", open)}
          documentId={selectedDocument.id}
          onSuccess={() => {
            // The real-time update will handle the UI update
          }}
        />
      )}

      {/* Checkout File Modal */}
      {selectedDocument && (
        <CheckoutFileModal
          open={modalState.checkoutFile}
          onOpenChange={(open) => toggleModal("checkoutFile", open)}
          documentId={selectedDocument.id}
        />
      )}
    </>
  );
}
