import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export type IntegrityStatus = "verified" | "corrupted" | "unknown" | "checking";

interface FileIntegrity {
  status: IntegrityStatus;
  checksum?: string;
  algorithm?: "MD5" | "SHA256" | "SHA512";
  error?: string;
  checkedAt?: Date;
}

interface UseFileIntegrityOptions {
  fileId?: string;
  documentId?: string;
  autoCheck?: boolean;
  onIntegrityChange?: (integrity: FileIntegrity) => void;
}

export function useFileIntegrity({
  fileId,
  documentId,
  autoCheck = false,
  onIntegrityChange,
}: UseFileIntegrityOptions) {
  const [integrity, setIntegrity] = useState<FileIntegrity>({
    status: "unknown",
  });
  const [isChecking, setIsChecking] = useState(false);

  // Check file integrity
  const checkIntegrity = useCallback(async () => {
    if (!fileId && !documentId) {
      console.warn("No fileId or documentId provided for integrity check");
      return null;
    }

    setIsChecking(true);
    setIntegrity((prev) => ({ ...prev, status: "checking" }));

    try {
      // TODO: Replace with actual API call
      const endpoint = fileId
        ? `/api/files/${fileId}/integrity`
        : `/api/documents/${documentId}/integrity`;

      const response = await fetch(endpoint);

      if (response.ok) {
        const data = await response.json();
        const integrityData: FileIntegrity = {
          status: data.isValid ? "verified" : "corrupted",
          checksum: data.checksum,
          algorithm: data.algorithm || "SHA256",
          error: data.error,
          checkedAt: new Date(),
        };

        setIntegrity(integrityData);
        onIntegrityChange?.(integrityData);

        if (integrityData.status === "corrupted") {
          toast.error("File integrity check failed - file may be corrupted");
        }

        return integrityData;
      } else {
        const error = await response.json();
        const integrityData: FileIntegrity = {
          status: "unknown",
          error: error.message || "Failed to check file integrity",
        };
        setIntegrity(integrityData);
        return integrityData;
      }
    } catch (error) {
      console.error("Integrity check failed:", error);
      const integrityData: FileIntegrity = {
        status: "unknown",
        error: "Network error during integrity check",
      };
      setIntegrity(integrityData);
      return integrityData;
    } finally {
      setIsChecking(false);
    }
  }, [fileId, documentId, onIntegrityChange]);

  // Verify file during upload
  const verifyFile = useCallback(async (file: File): Promise<FileIntegrity> => {
    setIsChecking(true);
    setIntegrity((prev) => ({ ...prev, status: "checking" }));

    try {
      // Calculate checksum on client side
      const checksum = await calculateFileChecksum(file);

      // TODO: You can also send to server for additional verification
      const integrityData: FileIntegrity = {
        status: "verified",
        checksum,
        algorithm: "SHA256",
        checkedAt: new Date(),
      };

      setIntegrity(integrityData);
      onIntegrityChange?.(integrityData);

      return integrityData;
    } catch (error) {
      console.error("File verification failed:", error);
      const integrityData: FileIntegrity = {
        status: "unknown",
        error: "Failed to verify file",
      };
      setIntegrity(integrityData);
      return integrityData;
    } finally {
      setIsChecking(false);
    }
  }, [onIntegrityChange]);

  // Auto-check on mount if enabled
  useEffect(() => {
    if (autoCheck && (fileId || documentId)) {
      checkIntegrity();
    }
  }, [autoCheck, fileId, documentId, checkIntegrity]);

  return {
    integrity,
    isChecking,
    checkIntegrity,
    verifyFile,
    isVerified: integrity.status === "verified",
    isCorrupted: integrity.status === "corrupted",
  };
}

// Helper function to calculate file checksum (SHA-256)
async function calculateFileChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// Validate file size
export function validateFileSize(file: File, maxSizeMB: number = 50): boolean {
  const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  return file.size <= maxSize;
}

// Validate file type
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  const fileExtension = file.name.split(".").pop()?.toLowerCase();
  return allowedTypes.some((type) => {
    if (type.startsWith(".")) {
      return fileExtension === type.slice(1);
    }
    return file.type === type;
  });
}

// Check if file might be corrupted based on size and type
export function detectPotentialCorruption(file: File): {
  isCorrupted: boolean;
  reason?: string;
} {
  // Empty file
  if (file.size === 0) {
    return { isCorrupted: true, reason: "File is empty" };
  }

  // Suspicious file extension mismatch
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && file.type) {
    const expectedMimeTypes: Record<string, string[]> = {
      pdf: ["application/pdf"],
      doc: ["application/msword"],
      docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      jpg: ["image/jpeg"],
      jpeg: ["image/jpeg"],
      png: ["image/png"],
    };

    const expected = expectedMimeTypes[extension];
    if (expected && !expected.includes(file.type)) {
      return {
        isCorrupted: true,
        reason: `File extension .${extension} does not match file type ${file.type}`,
      };
    }
  }

  return { isCorrupted: false };
}
