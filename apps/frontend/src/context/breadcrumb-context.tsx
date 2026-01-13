"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface BreadcrumbOverride {
  [key: string]: string;
}

interface BreadcrumbContextType {
  overrides: BreadcrumbOverride;
  setOverride: (segment: string, label: string) => void;
  clearOverride: (segment: string) => void;
  clearAllOverrides: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<BreadcrumbOverride>({});

  const setOverride = useCallback((segment: string, label: string) => {
    setOverrides((prev) => ({ ...prev, [segment]: label }));
  }, []);

  const clearOverride = useCallback((segment: string) => {
    setOverrides((prev) => {
      const newOverrides = { ...prev };
      delete newOverrides[segment];
      return newOverrides;
    });
  }, []);

  const clearAllOverrides = useCallback(() => {
    setOverrides({});
  }, []);

  return (
    <BreadcrumbContext.Provider
      value={{ overrides, setOverride, clearOverride, clearAllOverrides }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error("useBreadcrumb must be used within BreadcrumbProvider");
  }
  return context;
}
