"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface RecycleBinContextType {
  showWarning: boolean;
  toggleWarning: () => void;
}

const RecycleBinContext = createContext<RecycleBinContextType | undefined>(
  undefined
);

export const RecycleBinProvider = ({ children }: { children: ReactNode }) => {
  const [showWarning, setShowWarning] = useState(true);

  // Check localStorage on mount to determine if warning should be shown
  useEffect(() => {
    const hidden = localStorage.getItem("recycleBinWarningHidden");
    if (hidden === "true") {
      setShowWarning(false);
    }
  }, []);

  // Listen for changes to localStorage from other components/tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "recycleBinWarningHidden") {
        const hidden = localStorage.getItem("recycleBinWarningHidden");
        setShowWarning(hidden !== "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Listen for custom events for same-tab updates
  useEffect(() => {
    const handleCustomStorageChange = () => {
      const hidden = localStorage.getItem("recycleBinWarningHidden");
      setShowWarning(hidden !== "true");
    };

    window.addEventListener(
      "recycleBinWarningChange",
      handleCustomStorageChange
    );

    return () => {
      window.removeEventListener(
        "recycleBinWarningChange",
        handleCustomStorageChange
      );
    };
  }, []);

  const toggleWarning = () => {
    const newShowWarning = !showWarning;
    setShowWarning(newShowWarning);
    localStorage.setItem("recycleBinWarningHidden", String(!newShowWarning));
    // Dispatch custom event to notify other components in the same tab
    window.pendingEvent(new CustomEvent("recycleBinWarningChange"));
  };

  return (
    <RecycleBinContext.Provider value={{ showWarning, toggleWarning }}>
      {children}
    </RecycleBinContext.Provider>
  );
};

export const useRecycleBin = () => {
  const context = useContext(RecycleBinContext);
  if (context === undefined) {
    throw new Error("useRecycleBin must be used within a RecycleBinProvider");
  }
  return context;
};
