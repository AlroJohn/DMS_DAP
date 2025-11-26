import { useState, useCallback } from "react";
import { toast } from "sonner";

export type LockStatus = "locked" | "available" | "locked_by_you";

interface DocumentLock {
  id: string;
  documentId: string;
  status: LockStatus;
  lockedBy?: {
    id: string;
    name: string;
  };
  lockedAt?: Date;
}

interface UseDocumentLockOptions {
  documentId: string | null;
  currentUserId?: string;
  onLockChange?: (lock: DocumentLock) => void;
}

export function useDocumentLock({
  documentId,
  currentUserId,
  onLockChange,
}: UseDocumentLockOptions) {
  const [lock, setLock] = useState<DocumentLock>({
    id: "",
    documentId,
    status: "available",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check lock status
  const checkLock = useCallback(async () => {
    if (!documentId) return null;
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/documents/${documentId}/lock`);
      if (response.ok) {
        const data = await response.json();
        const lockData: DocumentLock = {
          ...data,
          status: data.lockedBy
            ? data.lockedBy.id === currentUserId
              ? "locked_by_you"
              : "locked"
            : "available",
        };
        setLock(lockData);
        onLockChange?.(lockData);
        return lockData;
      }
    } catch (error) {
      console.error("Failed to check lock status:", error);
    }
    return null;
  }, [documentId, currentUserId, onLockChange]);

  // Checkout document (acquire lock)
  const checkout = useCallback(async () => {
    if (!documentId) return false;
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/documents/${documentId}/checkout`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        const lockData: DocumentLock = {
          ...data,
          status: "locked_by_you",
        };
        setLock(lockData);
        onLockChange?.(lockData);
        toast.success("Document checked out successfully");
        return true;
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to checkout document");
        return false;
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Failed to checkout document");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [documentId, onLockChange]);

  // Checkin document (release lock)
  const checkin = useCallback(async () => {
    if (!documentId) return false;
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/documents/${documentId}/checkin`, {
        method: "POST",
      });

      if (response.ok) {
        const lockData: DocumentLock = {
          id: "",
          documentId,
          status: "available",
        };
        setLock(lockData);
        onLockChange?.(lockData);
        toast.success("Document checked in successfully");
        return true;
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to checkin document");
        return false;
      }
    } catch (error) {
      console.error("Checkin failed:", error);
      toast.error("Failed to checkin document");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [documentId, onLockChange]);

  // Override lock (force unlock)
  const override = useCallback(async () => {
    if (!documentId) return false;
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/documents/${documentId}/override-lock`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        const lockData: DocumentLock = {
          ...data,
          status: "locked_by_you",
        };
        setLock(lockData);
        onLockChange?.(lockData);
        toast.success("Lock overridden successfully");
        return true;
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to override lock");
        return false;
      }
    } catch (error) {
      console.error("Override failed:", error);
      toast.error("Failed to override lock");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [documentId, onLockChange]);

  // Check if current user can edit
  const canEdit = useCallback(() => {
    return lock.status === "available" || lock.status === "locked_by_you";
  }, [lock.status]);

  // Check if user can override lock
  const canOverride = useCallback(() => {
    // TODO: Check user permissions (e.g., admin role)
    return lock.status === "locked";
  }, [lock.status]);

  return {
    lock,
    isLoading,
    checkLock,
    checkout,
    checkin,
    override,
    canEdit: canEdit(),
    canOverride: canOverride(),
  };
}
