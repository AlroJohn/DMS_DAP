export interface SharedDocument {
  id: string;
  qrCode?: string;
  barcode?: string;
  document: string;  // Now includes both title and document_code
  documentTitle?: string;
  documentId?: string;
  contactPerson?: string;  // Now contains the root owner's name instead of 'N/A'
  contactOrganization?: string;  // Department code
  contactOrganizationName?: string;  // Department full name (for tooltip)
  type: string;  // Now contains DocumentType name instead of UUID
  process_type_id?: string | null;
  process_timer_start_at?: string | null;
  process_timer_complete_at?: string | null;
  process_status?: 'ongoing' | 'delayed' | 'completed' | null;
  process_delayed_at?: string | null;
  process_delay_seconds?: number | null;
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
  contactOrganization?: string;  // Department code
  contactOrganizationName?: string;  // Department full name (for tooltip)
  type: string;
  process_type_id?: string | null;
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
