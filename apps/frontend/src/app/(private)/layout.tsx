"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Header from "@/components/header";
import { GuardProvider } from "@/components/providers/GuardProvider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <GuardProvider>
      <SidebarProvider>
        <TooltipProvider delayDuration={0}>
          <AppSidebar />
          <SidebarInset>
            <Header />
            <div className="p-4 max-w-dvw flex flex-1 flex-col">{children}</div>
          </SidebarInset>
        </TooltipProvider>
      </SidebarProvider>
    </GuardProvider>
  );
}
