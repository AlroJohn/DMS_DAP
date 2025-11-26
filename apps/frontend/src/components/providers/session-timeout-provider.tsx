"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { SessionTimeoutModal } from "@/components/modals/session-timeout-modal";
import { toast } from "sonner";

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  /**
   * Timeout in milliseconds (default: 20 minutes)
   */
  timeout?: number;
  /**
   * Warning time in milliseconds (default: 2 minutes)
   */
  warningTime?: number;
  /**
   * Whether to enable session timeout
   */
  enabled?: boolean;
}

export function SessionTimeoutProvider({
  children,
  timeout = 20 * 60 * 1000, // 20 minutes
  warningTime = 2 * 60 * 1000, // 2 minutes
  enabled = true,
}: SessionTimeoutProviderProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      toast.info("Session expired. You have been logged out.");
      router.push("/login?session=expired");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    }
  };

  const { isWarning, remainingTime, reset } = useIdleTimer({
    timeout,
    warningTime,
    enabled,
    onIdle: () => {
      setShowModal(false);
      handleLogout();
    },
    onWarning: () => {
      setShowModal(true);
    },
    onActive: () => {
      if (showModal) {
        setShowModal(false);
        toast.success("Session extended. You're still logged in.");
      }
    },
  });

  const handleStayLoggedIn = () => {
    reset();
    setShowModal(false);
    toast.success("Session extended successfully");
  };

  useEffect(() => {
    // Show warning when modal appears
    if (showModal) {
      toast.warning("Your session is about to expire", {
        duration: 5000,
      });
    }
  }, [showModal]);

  return (
    <>
      {children}
      <SessionTimeoutModal
        open={showModal && isWarning}
        remainingTime={remainingTime}
        totalWarningTime={warningTime}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleLogout}
      />
    </>
  );
}
