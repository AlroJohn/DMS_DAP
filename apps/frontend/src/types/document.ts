export interface DocumentFile {
  file_id: string;
  document_id: string;
  original_name: string;
  stored_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  checksum?: string;
  version: string;
  is_primary: boolean;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
  version_group_id?: string;
}

export interface Document {
  document_id: string;
  title: string;
  description?: string;
  document_code: string;
  document_type: string;
  classification: string;
  origin: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  restored_at?: string;
  restored_by?: string;
  files: DocumentFile[];
}