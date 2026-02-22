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
import { Loader2, Shield, Mail } from "lucide-react";
import { toast } from "sonner";

interface TwoFactorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  tempToken: string;
  onVerifySuccess: () => void;
}

export function TwoFactorAuthModal({
  isOpen,
  onClose,
  email,
  tempToken,
  onVerifySuccess,
}: TwoFactorAuthModalProps) {
  const [code, setCode] = React.useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSendingCode, setIsSendingCode] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend code
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send code when modal opens
  React.useEffect(() => {
    if (isOpen && email && tempToken) {
      handleSendCode();
    }
  }, [isOpen, email, tempToken]);

  const handleSendCode = async () => {
    setIsSendingCode(true);
    try {
      const response = await fetch("/api/auth/2fa/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, tempToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send verification code");
      }

      toast.success("Verification code sent to your email");
      setCountdown(60); // 60 seconds cooldown
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: fullCode,
          tempToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Invalid verification code");
      }

      const data = await response.json();
      toast.success("Two-factor authentication successful!");
      onVerifySuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to verify code");
      // Clear the code on error
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take the last character
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (index === 5 && value) {
      const fullCode = [...newCode.slice(0, 5), value].join("");
      if (fullCode.length === 6) {
        setTimeout(() => handleVerify(), 100);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) {
        newCode[i] = pastedData[i];
      }
    }
    
    setCode(newCode);
    
    // Focus the appropriate input
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if complete
    if (pastedData.length === 6) {
      setTimeout(() => handleVerify(), 100);
    }
  };

  return (
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
            Enter the 6-digit code sent to your email
          </DialogDescription>
          <p className="text-center text-sm text-muted-foreground mt-1">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {email}
            </span>
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Code Input */}
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-2xl font-bold"
                disabled={isLoading}
              />
            ))}
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={isLoading || code.join("").length !== 6}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>

          {/* Resend Code */}
          <div className="text-center">
            <button
              onClick={handleSendCode}
              disabled={isSendingCode || countdown > 0}
              className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              {isSendingCode ? (
                "Sending..."
              ) : countdown > 0 ? (
                `Resend code in ${countdown}s`
              ) : (
                "Didn't receive it? Resend code"
              )}
            </button>
          </div>

          {/* Security Note */}
          <p className="text-xs text-center text-muted-foreground">
            The verification code will expire in 10 minutes. Never share this code with anyone.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
