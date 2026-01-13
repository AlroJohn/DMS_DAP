"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Header from "@/components/header";
import { GuardProvider } from "@/components/providers/GuardProvider";
import { SessionTimeoutProvider } from "@/components/providers/session-timeout-provider";
import { BreadcrumbProvider } from "@/context/breadcrumb-context";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <GuardProvider>
      <SessionTimeoutProvider>
        <BreadcrumbProvider>
          <SidebarProvider>
            <TooltipProvider delayDuration={0}>
              <AppSidebar />
              <SidebarInset>
                <Header />
                <div className=" max-w-dvw flex flex-1 flex-col">{children}</div>
              </SidebarInset>
            </TooltipProvider>
          </SidebarProvider>
        </BreadcrumbProvider>
      </SessionTimeoutProvider>
    </GuardProvider>
  );
}
