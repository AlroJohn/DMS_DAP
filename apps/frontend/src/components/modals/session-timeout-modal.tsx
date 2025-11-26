"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatRemainingTime } from "@/hooks/useIdleTimer";

interface SessionTimeoutModalProps {
  open: boolean;
  remainingTime: number; // in milliseconds
  totalWarningTime: number; // in milliseconds
  onStayLoggedIn: () => void;
  onLogout?: () => void;
}

export function SessionTimeoutModal({
  open,
  remainingTime,
  totalWarningTime,
  onStayLoggedIn,
  onLogout,
}: SessionTimeoutModalProps) {
  const progressPercentage = (remainingTime / totalWarningTime) * 100;
  const formattedTime = formatRemainingTime(remainingTime);

  // Play sound when modal opens (optional)
  useEffect(() => {
    if (open) {
      // You can add a notification sound here
      console.log("Session timeout warning!");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            <DialogTitle>Session Timeout Warning</DialogTitle>
          </div>
          <DialogDescription className="space-y-4 pt-4">
            <div className="text-center">
              <p className="text-base mb-2">
                Your session will expire due to inactivity
              </p>
              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                <Clock className="h-6 w-6" />
                <span>{formattedTime}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                You will be automatically logged out when the timer reaches zero
              </p>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                <strong>To continue your session:</strong> Click the button below or move your mouse to stay logged in.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onLogout && (
            <Button
              type="button"
              variant="outline"
              onClick={onLogout}
              className="w-full sm:w-auto"
            >
              Logout Now
            </Button>
          )}
          <Button
            type="button"
            onClick={onStayLoggedIn}
            className="w-full sm:w-auto"
          >
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
