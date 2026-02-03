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
  workflowSequenceEnabled?: boolean;
  nextDepartmentId?: string | null;
  nextDepartmentName?: string | null;
  originDepartmentId?: string | null;
  originDepartmentName?: string | null;
  isLastInSequence?: boolean;
  isInSequence?: boolean;
  checkedOutBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  checkedOutAt?: string | null;
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
