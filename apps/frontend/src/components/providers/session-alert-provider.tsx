"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionExpiredModal } from "@/components/modals/session-expired-modal";

type SessionAlertReason = "expired" | "refresh";

interface SessionAlertProviderProps {
  children: ReactNode;
}

const IGNORED_PATHS = ["/api/auth/login", "/api/auth/logout"];
const AUTH_PATH_HINTS = [
  "/api/auth/me",
  "/api/auth/refresh",
  "/api/auth/socket-token",
];
const AUTH_ERROR_HINTS = [
  "invalid or expired token",
  "unauthorized",
  "user not authenticated",
  "authentication required",
  "refresh token is required",
  "no access token found",
];

export function SessionAlertProvider({ children }: SessionAlertProviderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<SessionAlertReason>("expired");
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;

    const originalFetch = window.fetch.bind(window);

    const shouldIgnore = (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      return IGNORED_PATHS.some((path) => url.includes(path));
    };

    const shouldTriggerSessionAlert = async (
      input: RequestInfo | URL,
      response: Response,
    ) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (AUTH_PATH_HINTS.some((path) => url.includes(path))) {
        return true;
      }

      try {
        const cloned = response.clone();
        const data = await cloned.json();
        const message = (
          data?.error?.message ||
          data?.message ||
          ""
        )
          .toString()
          .toLowerCase();
        return AUTH_ERROR_HINTS.some((hint) => message.includes(hint));
      } catch {
        return false;
      }
    };

    const handleUnauthorized = (input: RequestInfo | URL) => {
      if (hasTriggeredRef.current || shouldIgnore(input)) return;

      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const nextReason: SessionAlertReason = url.includes("/api/auth/refresh")
        ? "refresh"
        : "expired";

      hasTriggeredRef.current = true;
      setReason(nextReason);
      setOpen(true);
    };

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 || response.status === 403) {
        const shouldAlert = await shouldTriggerSessionAlert(args[0], response);
        if (shouldAlert) {
          handleUnauthorized(args[0]);
        }
      }
      return response;
    };

    const onSessionExpired = (event: Event) => {
      if (hasTriggeredRef.current) return;
      const custom = event as CustomEvent<{ reason?: SessionAlertReason }>;
      hasTriggeredRef.current = true;
      setReason(custom.detail?.reason ?? "expired");
      setOpen(true);
    };

    window.addEventListener("session-expired", onSessionExpired as EventListener);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("session-expired", onSessionExpired as EventListener);
    };
  }, []);

  const handleLogin = () => {
    setOpen(false);
    router.push("/login?session=expired");
  };

  return (
    <>
      {children}
      <SessionExpiredModal open={open} reason={reason} onLogin={handleLogin} />
    </>
  );
}
