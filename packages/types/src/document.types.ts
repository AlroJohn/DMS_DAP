export interface SharedDocument {
  id: string;
  qrCode?: string;
  barcode?: string;
  document: string;  // Now includes both title and document_code
  documentTitle?: string;
  documentId?: string;
  contactPerson?: string;  // Now contains the root owner's name instead of 'N/A'
  contactOrganization?: string;
  type: string;  // Now contains DocumentType name instead of UUID
  classification?: string;
  status?: string;
  activity?: string;
  activityTime?: string;
  checkedOutBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  checkedOutAt?: string | null;
  hasAssignedSignature?: boolean;  // Indicates if user has signature placeholders assigned
  assignedActionType?: string | null;  // The action type assigned to the user (e.g., "FOR APPROVAL")
}

export interface Document {
  id: string;
  qrCode?: string;
  barcode?: string;
  document: string;
  documentTitle?: string;
  documentId?: string;
  contactPerson?: string;
  contactOrganization?: string;
  type: string;
  classification?: string;
  status?: string;
  activity?: string;
  activityTime?: string;
  checkedOutBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  checkedOutAt?: string | null;
  assignedActionType?: string | null;  // The action type assigned to the user (e.g., "FOR APPROVAL")
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UseSharedDocumentsResult {
  documents: SharedDocument[];
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}
