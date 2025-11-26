// Define permissions based on the database schema
export type Permission =
  // Document permissions
  | "document_read"
  | "document_write"
  | "document_edit"
  | "document_delete"
  | "document_create"
  | "document_upload"
  | "document_download"
  | "document_share"
  | "document_archive"
  | "document_restore"
  | "document_move"
  | "document_copy"
  // Document metadata permissions
  | "document_metadata_read"
  | "document_metadata_write"
  | "document_metadata_edit"
  // Document routing permissions
  | "document_routing_read"
  | "document_routing_create"
  | "document_routing_edit"
  | "document_routing_delete"
  | "document_routing_approve"
  // Document transfer permissions
  | "document_transfer_initiate"
  | "document_transfer_approve"
  | "document_transfer_receive"
  | "document_transfer_reject"
  | "document_transfer_track"
  // Document custody permissions
  | "document_custody_view"
  | "document_custody_transfer"
  | "document_custody_receive"
  | "document_custody_witness"
  // Document audit permissions
  | "document_audit_read"
  | "document_audit_export"
  | "document_audit_verify"
  // Document recycle bin permissions
  | "document_recycle_view"
  | "document_recycle_restore"
  | "document_recycle_permanent_delete"
  | "document_recycle_bulk_restore"
  | "document_recycle_bulk_delete"
  // Document type permissions
  | "document_type_read"
  | "document_type_create"
  | "document_type_edit"
  | "document_type_delete"
  // Department permissions
  | "department_read"
  | "department_create"
  | "department_edit"
  | "department_delete"
  | "department_users_manage"
  // User management permissions
  | "user_read"
  | "user_create"
  | "user_edit"
  | "user_delete"
  | "user_activate"
  | "user_deactivate"
  // Role management permissions
  | "role_read"
  | "role_create"
  | "role_edit"
  | "role_delete"
  | "role_assign"
  // Permission management
  | "permission_edit"
  | "permission_create"
  | "permission_delete"
  | "permission_read"
  | "permission_assign"
  | "permission_revoke"
  // System administration
  | "system_settings_read"
  | "system_settings_write"
  | "system_logs_read"
  | "system_backup"
  | "system_restore"
  | "system_maintenance"
  // Notification permissions
  | "notification_read"
  | "notification_send"
  | "notification_manage"
  // Report permissions
  | "report_read"
  | "report_generate"
  | "report_export"
  | "report_schedule"
  // API permissions
  | "api_read"
  | "api_write"
  | "api_delete"
  | "api_admin"
  // Legacy permissions (for backward compatibility)
  | "DOCUMENT_CREATE"
  | "DOCUMENT_VIEW"
  | "DOCUMENT_EDIT"
  | "DOCUMENT_DELETE";

// Permission scope types
export type PermissionScope = 'global' | 'department' | 'user' | 'custom';

// Role interface
export interface Role {
  role_id: string;
  name: string;
  code: string;
  description?: string | null;
  is_system_role: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string | null;
}

// User role assignment interface
export interface UserRole {
  user_role_id: string;
  user_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: Date;
  is_active: boolean;
  expires_at?: Date;
}

// Role permission interface
export interface RolePermission {
  role_permission_id: string;
  role_id: string;
  permission_id: string;
  scope: PermissionScope;
  granted_by: string;
  granted_at: Date;
  is_active: boolean;
}

// Updated User interface to work with role-based system
export interface User {
  id: string;
  accountId: string;
  email: string;
  name?: string;
  password: string;
  permissions: Permission[]; // Computed from roles
  roles: Role[]; // User's assigned roles
  department_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  user_name?: string | null;
  title?: string | null;
  type?: string | null;
  avatar?: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  permissions: Permission[];
  roles: string[]; // Role codes for quick access
  iat?: number;
  exp?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Document types
export interface Document {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateDocumentRequest {
  name: string;
  content: string;
}

export interface UpdateDocumentRequest {
  name?: string;
  content?: string;
}

// Pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
