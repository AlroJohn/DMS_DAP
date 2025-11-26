export type Permission =
  | "DOCUMENT_CREATE"
  | "DOCUMENT_VIEW"
  | "DOCUMENT_EDIT"
  | "DOCUMENT_DELETE";

export interface PermissionDefinition {
  permission_id: string;
  permission: string;
  description: string;
  resource_type?: string;
}