"use client";

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";

type DocumentSidebarCounts = {
  pendingDocuments: number;
  ownedPendingDocuments: number;
  incomingInTransitDocuments: number;
  sharedDocuments: number;
  received: number;
  intransit: number;
  intransit_signature: number;
  signed: number;
  completed: number;
  cancelled: number;
  deleted: number;
  archive: number;
  checkout: number;
  checkin: number;
  totalOwnedDocuments: number;
  outgoingInTransitDocuments: number;
};

type DocumentSidebarCountsContextValue = {
  counts: DocumentSidebarCounts;
  setCounts: (next: Partial<DocumentSidebarCounts>) => void;
  resetCounts: () => void;
  refetchCounts: () => Promise<void>;
};

const defaultCounts: DocumentSidebarCounts = {
  pendingDocuments: 0,
  ownedPendingDocuments: 0,
  incomingInTransitDocuments: 0,
  sharedDocuments: 0,
  received: 0,
  intransit: 0,
  intransit_signature: 0,
  signed: 0,
  completed: 0,
  cancelled: 0,
  deleted: 0,
  archive: 0,
  checkout: 0,
  checkin: 0,
  totalOwnedDocuments: 0,
  outgoingInTransitDocuments: 0,
};

const DocumentSidebarCountsContext = React.createContext<
  DocumentSidebarCountsContextValue | undefined
>(undefined);

export function DocumentSidebarCountsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [counts, setCountsState] =
    useState<DocumentSidebarCounts>(defaultCounts);

  const apiBaseUrl =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : process.env.NEXT_PUBLIC_API_BASE_URL || "";

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/documents/sidebar-counts`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCountsState({
            pendingDocuments: data.data.pendingDocuments ?? 0,
            ownedPendingDocuments: data.data.ownedPendingDocuments ?? 0,
            incomingInTransitDocuments: data.data.incomingInTransitDocuments ?? 0,
            sharedDocuments: data.data.sharedDocuments ?? 0,
            received: data.data.received ?? 0,
            intransit: data.data.intransit ?? 0,
            intransit_signature: data.data.intransit_signature ?? 0,
            signed: data.data.signed ?? 0,
            completed: data.data.completed ?? 0,
            cancelled: data.data.cancelled ?? 0,
            deleted: data.data.deleted ?? 0,
            archive: data.data.archive ?? 0,
            checkout: data.data.checkout ?? 0,
            checkin: data.data.checkin ?? 0,
            totalOwnedDocuments: data.data.totalOwnedDocuments ?? 0,
            outgoingInTransitDocuments: data.data.outgoingInTransitDocuments ?? 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching sidebar counts:", error);
    }
  }, [apiBaseUrl]);

  // Fetch counts on mount and poll every 30 seconds
  useEffect(() => {
    fetchCounts();
    
    const intervalId = setInterval(() => {
      fetchCounts();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(intervalId);
  }, [fetchCounts]);

  const setCounts = useCallback((next: Partial<DocumentSidebarCounts>) => {
    setCountsState((prev) => ({ ...prev, ...next }));
  }, []);

  const resetCounts = useCallback(() => {
    setCountsState(defaultCounts);
  }, []);

  const value = useMemo(
    () => ({
      counts,
      setCounts,
      resetCounts,
      refetchCounts: fetchCounts,
    }),
    [counts, setCounts, resetCounts, fetchCounts],
  );

  return (
    <DocumentSidebarCountsContext.Provider value={value}>
      {children}
    </DocumentSidebarCountsContext.Provider>
  );
}

export function useDocumentSidebarCounts() {
  const context = useContext(DocumentSidebarCountsContext);
  if (!context) {
    throw new Error(
      "useDocumentSidebarCounts must be used within DocumentSidebarCountsProvider",
    );
  }
  return context;
}
