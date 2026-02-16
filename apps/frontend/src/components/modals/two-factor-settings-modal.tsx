"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TwoFactorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  twoFactorEnabled: boolean;
  onStatusChange: (enabled: boolean) => void;
}

export function TwoFactorSettingsModal({
  isOpen,
  onClose,
  twoFactorEnabled,
  onStatusChange,
}: TwoFactorSettingsModalProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [showDisableDialog, setShowDisableDialog] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [localEnabled, setLocalEnabled] = React.useState(twoFactorEnabled);

  React.useEffect(() => {
    setLocalEnabled(twoFactorEnabled);
  }, [twoFactorEnabled]);

  const handleEnable2FA = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to enable 2FA");
      }

      const data = await response.json();
      toast.success("Two-factor authentication enabled successfully!");
      setLocalEnabled(true);
      onStatusChange(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to enable 2FA");
      setLocalEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to disable 2FA");
      }

      const data = await response.json();
      toast.success("Two-factor authentication disabled successfully!");
      setLocalEnabled(false);
      onStatusChange(false);
      setShowDisableDialog(false);
      setPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to disable 2FA");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="text-center">
              Add an extra layer of security to your account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status Card */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">
                    {localEnabled ? "2FA is Enabled" : "2FA is Disabled"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {localEnabled
                      ? "Your account is protected with an additional verification step"
                      : "Enable 2FA to add an extra layer of security"}
                  </p>
                </div>
                <Switch
                  checked={localEnabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleEnable2FA();
                    } else {
                      setShowDisableDialog(true);
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Info Section */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg mt-1">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Enhanced Security</h4>
                  <p className="text-sm text-muted-foreground">
                    Even if your password is compromised, your account stays protected
                    with a verification code sent to your email.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg mt-1">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">How it Works</h4>
                  <p className="text-sm text-muted-foreground">
                    After entering your password, you'll receive a 6-digit code via
                    email that you'll need to enter to complete the login process.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra layer of security from your account. You'll
              only need your password to sign in. Please enter your password to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPassword("");
              setLocalEnabled(true);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              disabled={isLoading || !password}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable 2FA"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
