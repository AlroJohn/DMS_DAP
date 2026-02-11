"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface SessionExpiredModalProps {
  open: boolean;
  reason: "expired" | "refresh";
  onLogin: () => void;
}

export function SessionExpiredModal({
  open,
  reason,
  onLogin,
}: SessionExpiredModalProps) {
  const title =
    reason === "refresh"
      ? "Session refresh failed"
      : "Session expired";
  const message =
    reason === "refresh"
      ? "We could not refresh your session. Please sign in again."
      : "Your session has expired. Please sign in again.";

  const handleLogin = () => {
    onLogin();
    // Force full page refresh to login page
    window.location.href = "/login?session=expired";
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-3">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={handleLogin} className="w-full sm:w-auto">
            Go to login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
