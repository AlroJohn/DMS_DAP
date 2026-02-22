"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import BlurText from "@/components/react-bits/BlurText";
import ShinyText from "@/components/react-bits/ShinyText";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TwoFactorAuthModal } from "@/components/modals/two-factor-auth-modal";

export function LoginFormClient({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth(); // Use the login function
  const error = searchParams.get("error");
  const isInvitation = error === "invitation_required";

  useEffect(() => {
    // Check if redirected from invitation acceptance
    const message = searchParams.get("message");
    if (message === "account_created") {
      // Clear the message from URL
      router.replace("/login");
    }
  }, [searchParams, router]);

  const handleGoogleLogin = () => {
    // Set loading to true to show loading animation during redirect
    setIsLoading(true);

    // Redirect to backend Google OAuth endpoint
    window.location.href = `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    }/api/auth/google`;
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call the frontend API route instead of backend directly
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();

        // Check if 2FA is required
        if (data.data?.requires2FA && data.data?.tempToken) {
          setIsLoading(false);
          setTempToken(data.data.tempToken);
          setShow2FAModal(true);
          return;
        }

        // Trigger the login function from useAuth to re-fetch user data and update state
        await login();

        // Show success toast
        toast.success("Login successful", {
          description: "Welcome back! Redirecting to home...",
        });

        // Redirect to home after auth state is refreshed
        router.push("/home");
      } else {
        // Handle error response - stay on login page
        setIsLoading(false);
        // Clear password field
        setPassword("");
        
        // Parse error response and show toast notification
        try {
          const errorData = await response.json();
          // Backend sends errors in format: { success: false, error: { message: "..." } }
          const errorMessage = errorData.error?.message || errorData.message || errorData.error || "Login failed";
          
          // Show specific toast messages based on error type
          if (errorMessage.includes("Invalid email or password")) {
            toast.error("Invalid credentials", {
              description: "The email or password you entered is incorrect. Please try again.",
            });
          } else if (errorMessage.includes("social login") || errorMessage.includes("Google")) {
            toast.error("Social login required", {
              description: "This account uses Google sign-in. Please click 'Login with Google' button.",
            });
          } else if (errorMessage.includes("User profile not found")) {
            toast.error("Account error", {
              description: "User profile not found. Please contact your administrator.",
            });
          } else if (errorMessage.includes("already in use") || errorMessage.includes("another device")) {
            toast.error("Account in use", {
              description: "This account is already logged in on another device or browser. Please log out from other devices first.",
            });
          } else {
            toast.error("Login failed", {
              description: errorMessage,
            });
          }
        } catch (parseError) {
          // If we can't parse the error response, show the status text or a generic message
          toast.error("Login failed", {
            description: response.statusText || "An unexpected error occurred. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
      setPassword("");
      toast.error("Network error", {
        description: "Unable to connect to the server. Please check your connection and try again.",
      });
    }
  };

  const handle2FAVerifySuccess = async () => {
    setShow2FAModal(false);
    setTempToken("");
    
    // Trigger the login function from useAuth to re-fetch user data and update state
    await login();

    // Show success toast
    toast.success("Login successful", {
      description: "Welcome back! Redirecting to home...",
    });

    // Redirect to home after auth state is refreshed
    router.push("/home");
  };

  return (
    <div className={cn("flex flex-col gap-6 relative", className)} {...props}>
      <Dialog open={error === 'invitation_required' || error === 'oauth_failed' || error === 'oauth_error'} onOpenChange={() => router.replace('/login')}>
        <DialogContent className="sm:max-w-md w-[92vw] p-5">
          <DialogHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle
                className={`h-5 w-5 ${
                  isInvitation ? "text-amber-500" : "text-red-500"
                }`}
              />
              <DialogTitle className="text-lg">
                {isInvitation
                  ? "Access requires an invitation"
                  : "Sign-in failed"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-balance">
              {isInvitation
                ? "Your Google account isn't invited yet. Request access from an administrator to continue."
                : "We could not complete Google sign-in. Please try again. If the problem persists, contact your administrator."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            {isInvitation ? (
              <Button size="sm" asChild>
                <a
                  href={`mailto:${
                    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "admin@example.com"
                  }?subject=Request%20access%20to%20DMS`}
                >
                  Request access
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="default" onClick={handleGoogleLogin}>
                Try Google again
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.replace("/login")}
            >
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="p-0 overflow-hidden min-h-142.5 md:min-h-170 h-full border border-primary">
        <CardContent className="p-0 h-full relative border-0">
          <div className="relative h-full">
            <div className="px-10 flex flex-col justify-center h-full md:w-1/2 z-10">
              <CardHeader className="text-center">
                <img src="/image/LOGO_BLUE.png" alt="Logo" className="mx-auto w-48 md:w-72 -mt-4 md:-mt-6" />
                <CardDescription className="p-2">Login with your Google account or email</CardDescription>
              </CardHeader>
              <form onSubmit={handleManualLogin}>
                <FieldGroup>
                  <Field>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      Login with Google
                    </Button>
                  </Field>
                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Or continue with
                  </FieldSeparator>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <a
                        href="#"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </a>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </Field>
                  <Field>
                    <Button type="submit" disabled={isLoading}>
                      <ShinyText
                        text={isLoading ? "Logging in..." : "Login"}
                        className="text-md md:text-lg font-bold"
                      />
                    </Button>
                    <FieldDescription className="text-center">
                      Don&apos;t have an account? Contact your administrator
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            </div>
            <div className="hidden md:block p-0 w-1/2 absolute top-0 bottom-0 right-0 overflow-hidden">
              <img
                src="/image/dap_bg.png"
                alt="Login image"
                className="absolute w-full h-full object-cover"
                style={{ 
                  objectPosition: "-360px center", 
                  transform: "scale(1.5)", 
                  transformOrigin: "center",
                  minHeight: "100%",
                  minWidth: "100%"
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Modal */}
      <TwoFactorAuthModal
        isOpen={show2FAModal}
        onClose={() => {
          setShow2FAModal(false);
          setTempToken("");
          setPassword("");
        }}
        email={email}
        tempToken={tempToken}
        onVerifySuccess={handle2FAVerifySuccess}
      />
    </div>
  );
}
