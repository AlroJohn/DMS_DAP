import { Document } from '@/types/document';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Fetch a document by ID
 */
export const getDocumentById = async (id: string): Promise<Document> => {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      // Include authorization header if needed
      // 'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Fetch document files
 */
export const getDocumentFiles = async (documentId: string) => {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/files`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch document files: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Create a signature placeholder
 */
export const createSignaturePlaceholder = async (
  documentId: string,
  data: {
    document_file_id: string;
    page_number: number;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
  }
) => {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/signatures`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create signature placeholder: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Place signature on document
 */
export const placeSignatureOnDocument = async (
  documentId: string,
  data: {
    signee_id: string;
    document_file_id: string;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
    page_number: number;
    signature_data?: string;
  }
) => {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to place signature: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Create signature placeholders for document
 */
export const createSignaturePlaceholders = async (
  documentId: string,
  placeholders: Array<{
    document_file_id: string;
    page_number: number;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
  }>
) => {
  const response = await fetch(`${API_BASE_URL}/document-signatures/documents/${documentId}/signature-placeholders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ placeholders }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create signature placeholders: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get signature placeholders for document
 */
export const getSignaturePlaceholders = async (documentId: string) => {
  const response = await fetch(`${API_BASE_URL}/document-signatures/documents/${documentId}/signature-placeholders`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch signature placeholders: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Place signature at a specific placeholder
 */
export const placeSignatureAtPlaceholder = async (
  documentId: string,
  data: {
    signee_id: string;
    document_file_id: string;
    page_number: number;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
    signature_data?: string;
  }
) => {
  const response = await fetch(`${API_BASE_URL}/document-signatures/documents/${documentId}/place-signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to place signature at placeholder: ${response.status} ${response.statusText}`);
  }

  return response.json();
};