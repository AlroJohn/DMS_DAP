"use client";

import { GalleryVerticalEnd } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LoginForm } from "@/components/auth/login/login-form";
import Threads from "@/components/react-bits/Threads";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      toast.info("Already logged in", {
        description: "Login Successfully. Redirecting to dashboard...",
      });
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show a loading state while checking authentication
  if (isLoading) {
    return (
      <div className="relative bg-background h-svh w-full overflow-hidden flex flex-col items-center justify-center gap-6 p-6 md:p-10">
        <Threads
          className="absolute inset-0 z-0 pointer-events-none w-full h-full opacity-60"
          amplitude={1.2}
          distance={0.2}
        />
        <div className="absolute right-4 top-4 z-20">
          <ThemeToggle />
        </div>
        <div className="relative z-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-background h-svh w-full overflow-hidden flex flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Threads
        className="absolute inset-0 z-0 pointer-events-none w-full h-full opacity-60"
        amplitude={1.2}
        distance={0.2}
      />
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="relative z-10 flex w-full max-w-6xl flex-col gap-6">
        <LoginForm />
      </div>
    </div>
  );
}
