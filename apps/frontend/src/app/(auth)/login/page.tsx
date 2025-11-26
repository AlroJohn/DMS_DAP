import { GalleryVerticalEnd } from "lucide-react";

import { LoginForm } from "@/components/auth/login/login-form";
import Threads from "@/components/react-bits/Threads";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <div className="relative bg-muted h-svh w-full overflow-hidden flex flex-col items-center justify-center gap-6 p-6 md:p-10">
      <Threads
        className="absolute inset-0 z-0 pointer-events-none w-full h-full opacity-60"
        amplitude={1.2}
        distance={0.2}
      />
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
        {/* <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Document Management System Feat Q-Sign.
        </a> */}
        <LoginForm />
      </div>
    </div>
  );
}
