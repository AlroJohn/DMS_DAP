"use client";

import React, { useCallback, useContext, useMemo, useState } from "react";

type DocumentSidebarCounts = {
  pendingDocuments: number;
  ownedPendingDocuments: number;
  incomingInTransitDocuments: number;
  sharedDocuments: number;
};

type DocumentSidebarCountsContextValue = {
  counts: DocumentSidebarCounts;
  setCounts: (next: Partial<DocumentSidebarCounts>) => void;
  resetCounts: () => void;
};

const defaultCounts: DocumentSidebarCounts = {
  pendingDocuments: 0,
  ownedPendingDocuments: 0,
  incomingInTransitDocuments: 0,
  sharedDocuments: 0,
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
    }),
    [counts, setCounts, resetCounts],
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
