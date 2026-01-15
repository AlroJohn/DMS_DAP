import { toast } from "sonner";

// Define permission error messages
const PERMISSION_ERROR_MESSAGES: Record<string, string> = {
  'document_read': "You don't have permission to view this document.",
  'document_write': "You don't have permission to modify this document.",
  'document_edit': "You don't have permission to edit this document.",
  'document_delete': "You don't have permission to delete this document.",
  'document_archive': "You don't have permission to archive this document.",
  'document_sign': "You don't have permission to sign this document.",
  'document_transfer_initiate': "You don't have permission to initiate document transfer.",
  'document_transfer_approve': "You don't have permission to approve document transfer.",
  'document_transfer_receive': "You don't have permission to receive documents.",
  'document_transfer_reject': "You don't have permission to reject document transfer.",
  'user_create': "You don't have permission to create users.",
  'user_update': "You don't have permission to update users.",
  'user_delete': "You don't have permission to delete users.",
  'role_manage': "You don't have permission to manage roles.",
  'permission_manage': "You don't have permission to manage permissions.",
  'admin_access': "You don't have administrator access.",
  'report_view': "You don't have permission to view reports.",
  'workflow_manage': "You don't have permission to manage workflows.",
  'default': "You don't have permission to perform this action."
};

/**
 * Shows a permission error toast notification
 * @param permission The specific permission that was denied (optional)
 * @param customMessage Custom message to display (optional)
 */
export const showPermissionErrorToast = (permission?: string, customMessage?: string): void => {
  let message = customMessage || PERMISSION_ERROR_MESSAGES.default;
  
  if (permission && PERMISSION_ERROR_MESSAGES[permission]) {
    message = PERMISSION_ERROR_MESSAGES[permission];
  } else if (customMessage) {
    message = customMessage;
  }
  
  toast.error(message, {
    duration: 5000,
    position: "top-right",
  });
};

/**
 * Checks if a response indicates a permission error and shows appropriate toast
 * @param response The fetch response object
 * @param permission The specific permission related to the action (optional)
 * @returns boolean indicating if it was a permission error
 */
export const handlePermissionError = (response: Response, permission?: string): boolean => {
  if (response.status === 403) {
    showPermissionErrorToast(permission);
    return true;
  }
  return false;
};

/**
 * Generic handler for API errors that includes permission error handling
 * @param response The fetch response object
 * @param permission The specific permission related to the action (optional)
 * @param fallbackErrorMessage Fallback message for other errors (optional)
 * @returns Promise<boolean> indicating if it was a permission error
 */
export const handleApiError = async (
  response: Response, 
  permission?: string, 
  fallbackErrorMessage?: string
): Promise<boolean> => {
  if (response.status === 403) {
    showPermissionErrorToast(permission);
    return true;
  } else if (response.status === 401) {
    toast.error("Authentication required. Please log in.", {
      duration: 5000,
      position: "top-right",
    });
    return true;
  } else if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.message || fallbackErrorMessage || `Request failed with status ${response.status}`;
    
    toast.error(message, {
      duration: 5000,
      position: "top-right",
    });
    return false;
  }
  return false;
};