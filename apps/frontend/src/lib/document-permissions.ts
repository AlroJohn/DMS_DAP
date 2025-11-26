/**
 * Utility functions for document permissions
 */

// Define the user type with permissions and roles
export interface User {
  id: string;
  email: string;
  name: string;
  permissions: string[];
  roles: Array<{
    role_id: string;
    name: string;
    code: string;
    description?: string;
  }>;
  department_id: string;
  [key: string]: any; // For other fields
}

// Define document type (generic to handle different document types across the app)
export interface Document {
  id: string;
  documentId: string;
  status?: string;
  isOwned?: boolean; // For shared documents
  currentLocation?: string; // For owned documents
  department_id?: string; // Department that owns the document
  checkout?: boolean; // Whether the document is checked out
  checkedOutBy?: { // Information about who checked out the document
    id: string;
    accountId?: string; // Account ID of the user who checked out the document
    name?: string; // Name of the user who checked out the document
    email?: string;
  } | null;
  [key: string]: any; // For other fields
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions?.includes(permission) || false;
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.some(permission => user.permissions?.includes(permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.every(permission => user.permissions?.includes(permission));
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: User | null, roleCode: string): boolean {
  if (!user) return false;
  return user.roles?.some(role => role.code === roleCode) || false;
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(user: User | null, roleCodes: string[]): boolean {
  if (!user) return false;
  return roleCodes.some(roleCode => user.roles?.some(role => role.code === roleCode));
}

/**
 * Determine if a user has a viewing only role
 */
export function hasViewOnlyRole(user: User | null): boolean {
  if (!user) return false;
  // Common role codes for view-only access
  return hasAnyRole(user, ['view_only', 'viewer', 'read_only']);
}

/**
 * Determine if a user has a basic user role (with editing capabilities)
 */
export function hasUserRole(user: User | null): boolean {
  if (!user) return false;
  // Common role codes for basic users with edit capabilities
  return hasAnyRole(user, ['user', 'basic_user', 'editor']);
}

/**
 * Determine if a user has an admin role
 */
export function hasAdminRole(user: User | null): boolean {
  if (!user) return false;
  // Common role codes for admin access
  return hasAnyRole(user, ['admin', 'administrator', 'super_user']);
}

/**
 * Determine if a user has a manager role
 */
export function hasManagerRole(user: User | null): boolean {
  if (!user) return false;
  // Common role codes for manager access
  return hasAnyRole(user, ['manager', 'supervisor', 'lead']);
}

/**
 * Determine if a user can view documents
 */
export function canViewDocuments(user: User | null): boolean {
  if (!user) return false;
  // Users with view-only roles can view documents
  if (hasViewOnlyRole(user)) return true;
  // Users with document read permissions
  return hasPermission(user, 'document_read');
}

/**
 * Determine if a document is owned by the user's department
 * This works for both shared and owned documents
 */
function isDocumentOwnedByUserDepartment(document: Document, user: User | null): boolean {
  if (!user || !document) return false;

  // For shared documents, the isOwned property indicates ownership
  if (typeof document.isOwned !== 'undefined') {
    return document.isOwned === true;
  }

  // For owned documents, all documents in the owned view are considered owned
  // In some cases, we can use department_id comparison if available
  if (document.department_id || document.currentLocation) {
    return document.department_id === user.department_id;
  }

  // Default to true for owned documents view
  return true;
}

/**
 * Determine if a user can edit document details
 */
export function canEditDocumentDetails(user: User | null, document: Document): boolean {
  if (!user || !document) return false;

  // Users with view-only roles cannot edit
  if (hasViewOnlyRole(user)) return false;

  // Check if document is owned by user's department
  const isDocumentOwned = isDocumentOwnedByUserDepartment(document, user);

  // If a user has explicit edit permissions, they can edit owned documents
  if (hasPermission(user, 'document_edit') && isDocumentOwned) return true;
  if (hasPermission(user, 'document_write') && isDocumentOwned) return true;

  // If a user doesn't have these specific permissions, they cannot edit regardless of role
  return false;
}

/**
 * Determine if a user can edit document files
 */
export function canEditDocument(user: User | null, document: Document): boolean {
  if (!user || !document) return false;

  // Users with view-only roles cannot edit
  if (hasViewOnlyRole(user)) return false;

  // Check if document is owned by user's department
  const isDocumentOwned = isDocumentOwnedByUserDepartment(document, user);

  // If a user has explicit edit permissions, they can edit owned documents
  if (hasPermission(user, 'document_edit') && isDocumentOwned) return true;
  if (hasPermission(user, 'document_write') && isDocumentOwned) return true;

  // If a user doesn't have these specific permissions, they cannot edit regardless of role
  return false;
}

/**
 * Determine if a user can view documents (full document view)
 */
export function canViewDocument(user: User | null): boolean {
  if (!user) return false;
  // Users with view-only roles can view documents (this aligns with the requirement that they can see view buttons)
  if (hasViewOnlyRole(user)) return true;
  // Users with document read permissions can view documents
  return hasPermission(user, 'document_read');
}

/**
 * Determine if a user can sign documents
 */
export function canSignDocument(user: User | null, document: Document): boolean {
  if (!user || !document) return false;

  // Users with view-only roles cannot sign
  if (hasViewOnlyRole(user)) return false;

  // Check if document is owned by user's department
  const isDocumentOwned = isDocumentOwnedByUserDepartment(document, user);

  // If a user has explicit signing permissions, they can sign owned documents
  if (hasAnyPermission(user, ['document_write', 'document_edit']) && isDocumentOwned) return true;

  // If a user doesn't have these specific permissions, they cannot sign regardless of role
  return false;
}

/**
 * Determine if a user can release documents
 */
export function canReleaseDocument(user: User | null, document: Document): boolean {
  if (!user || !document) return false;

  // Users with view-only roles cannot release
  if (hasViewOnlyRole(user)) return false;

  // Check if document is owned by user's department
  const isDocumentOwned = isDocumentOwnedByUserDepartment(document, user);

  // If a user has document write permissions and the document is owned by their department, they can release it
  // Also check for specific transfer permissions for more granular control
  if ((hasPermission(user, 'document_write') || hasAnyPermission(user, ['document_transfer_initiate', 'document_transfer_approve'])) && isDocumentOwned) return true;

  // If a user doesn't have these specific permissions, they cannot release regardless of role
  return false;
}

/**
 * Determine if a user can complete documents
 */
export function canCompleteDocument(user: User | null, document: Document): boolean {
  if (!user || !document) return false;

  // Users with view-only roles cannot complete
  if (hasViewOnlyRole(user)) return false;

  // If a user has explicit transfer receive permissions, they can complete documents
  if (hasPermission(user, 'document_transfer_receive')) return true;

  // If a user doesn't have this specific permission, they cannot complete regardless of role
  return false;
}

/**
 * Determine if a user can cancel documents (intransit/outgoing only)
 */
export function canCancelDocument(user: User | null, document: Document): boolean {
  if (!user || !document) return false;

  // Users with view-only roles cannot cancel
  if (hasViewOnlyRole(user)) return false;

  // Check if document status is intransit/outgoing
  const isIntransit = document.status?.toLowerCase().includes('intransit') ||
                     document.status?.toLowerCase() === 'dispatch' ||
                     document.status?.toLowerCase() === 'transit' ||
                     document.status?.toLowerCase() === 'outgoing';

  // If a user has explicit transfer reject/initiate permissions, they can cancel intransit documents
  if (hasAnyPermission(user, ['document_transfer_reject', 'document_transfer_initiate']) && isIntransit) return true;

  // If a user doesn't have these specific permissions, they cannot cancel regardless of role
  return false;
}

/**
 * Determine if a user can archive documents
 */
export function canArchiveDocument(user: User | null, document: Document): boolean {
  if (!user || !document) return false;

  // Users with view-only roles cannot archive
  if (hasViewOnlyRole(user)) return false;

  // Check if document is owned by user's department
  const isDocumentOwned = isDocumentOwnedByUserDepartment(document, user);

  // If a user has explicit archive permissions, they can archive owned documents
  if (hasPermission(user, 'document_archive') && isDocumentOwned) return true;

  // If a user doesn't have this specific permission, they cannot archive regardless of role
  return false;
}

/**
 * Determine if a user can delete documents
 */
export function canDeleteDocument(user: User | null, document: Document): boolean {
  if (!user || !document) return false;

  // Users with view-only roles cannot delete
  if (hasViewOnlyRole(user)) return false;

  // Check if document is owned by user's department
  const isDocumentOwned = isDocumentOwnedByUserDepartment(document, user);

  // If a user has explicit delete permissions, they can delete owned documents
  if (hasPermission(user, 'document_delete') && isDocumentOwned) return true;

  // If a user doesn't have this specific permission, they cannot delete regardless of role
  return false;
}

/**
 * Get all available actions for a user and document
 */
export function getAllowedActions(user: User | null, document: Document): string[] {
  if (!user) return [];
  
  const actions: string[] = [];
  
  // Always allow copy code for authenticated users
  actions.push('copy_code');
  
  // View actions
  if (canViewDocuments(user)) actions.push('view_details');
  if (canViewDocument(user)) actions.push('view_document');
  
  // Document management actions (for owned documents)
  if (canEditDocumentDetails(user, document)) {
    actions.push('edit_details');
  }
  
  if (canEditDocument(user, document)) {
    actions.push('edit_document');
  }
  
  if (canSignDocument(user, document)) {
    actions.push('sign_document');
  }
  
  // Document sharing/transfer actions
  if (canReleaseDocument(user, document)) {
    actions.push('release');
  }
  
  if (canCompleteDocument(user, document)) {
    actions.push('complete');
  }
  
  if (canCancelDocument(user, document)) {
    actions.push('cancel');
  }
  
  // Document lifecycle actions (for owned/managed documents)
  if (canArchiveDocument(user, document)) {
    actions.push('archive');
  }
  
  if (canDeleteDocument(user, document)) {
    actions.push('delete');
  }
  
  return actions;
}