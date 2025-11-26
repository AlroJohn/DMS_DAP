'use client';

import { useState } from 'react';

export interface SignerInput {
  email: string;
  firstName: string;
  lastName: string;
  signerRole?: string;
  type?: 'GUEST' | 'USER';
  sequence?: number;
  company?: string;
  jobTitle?: string;
  country?: string;
}

export interface SignerMarkInput {
  signerEmail?: string;
  signerId?: number | string;
  type: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  pageNo: number;
  value?: string;
  fontStyle?: string;
  fontSize?: number;
  attach?: number;
}

export interface SignDocumentPayload {
  signature?: string;
  primarySigner?: Partial<SignerInput>;
  additionalSigners?: SignerInput[];
  marks?: SignerMarkInput[];
  sendEmail?: boolean;
}

export interface SignDocumentResponse {
  message?: string;
  projectUuid: string;
  transactionHash: string | null;
  redirectUrl?: string | null;
  status: 'draft' | 'processing' | 'signed' | 'failed';
  signers?: Array<{ email: string; id: number | string | null }>;
}

interface UseSignDocumentResult {
  signDocument: (documentId: string, payload?: SignDocumentPayload | string) => Promise<SignDocumentResponse | null>;
  isLoading: boolean;
  error: string | null;
  data: SignDocumentResponse | null;
  reset: () => void;
}

export function useSignDocument(): UseSignDocumentResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SignDocumentResponse | null>(null);

  const signDocument = async (documentId: string, payload?: SignDocumentPayload | string): Promise<SignDocumentResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);
      setData(null);

      const requestBody: SignDocumentPayload =
        typeof payload === 'string'
          ? { signature: payload }
          : (payload ?? {});

      const hasBody = Object.keys(requestBody).length > 0;

      const response = await fetch(`/api/documents/${documentId}/sign`, {
        method: 'POST',
        credentials: 'include', // Include HttpOnly cookies with the request
        headers: {
          ...(hasBody && { 'Content-Type': 'application/json' }),
        },
        body: hasBody ? JSON.stringify(requestBody) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || 'Failed to sign document');
      }

      const result = await response.json().catch(() => ({}));
      const success = result.success ?? response.ok;
      const payloadData = (result.data ?? result) as SignDocumentResponse | undefined;

      if (success && payloadData) {
        setData(payloadData);
        return payloadData;
      } else {
        throw new Error(result.error?.message || result.message || 'Failed to sign document');
      }
    } catch (err: any) {
      console.error('Error signing document:', err);
      const errorMessage = err.message || 'An error occurred while signing the document';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setIsLoading(false);
    setError(null);
    setData(null);
  };

  return {
    signDocument,
    isLoading,
    error,
    data,
    reset,
  };
}
