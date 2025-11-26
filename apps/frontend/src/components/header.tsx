"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Separator } from "@radix-ui/react-separator";
import { Bell } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "./ui/breadcrumb";
import { SidebarTrigger } from "./ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { NotificationSheet } from "./shared/notification/notification";
import { useNotifications } from '@/context/notifications'

interface HeaderProps {}

const Header = ({}: HeaderProps) => {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { unreadCount } = useNotifications()

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split("/").filter((path) => path);
    
    // Capitalize and format path segments
    const formatSegment = (segment: string) => {
      return segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    return paths.map((path, index) => {
      const href = "/" + paths.slice(0, index + 1).join("/");
      const isLast = index === paths.length - 1;
      const label = formatSegment(path);

      return {
        href,
        label,
        isLast,
      };
    });
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="bg-muted/50 flex h-16 shrink-0 items-center border-b gap-2 transition-[width,height] ease-linear">
      <div className="flex items-center gap-2 px-4 w-full">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div className="w-full flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.length === 0 ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>Home</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                breadcrumbs.map((crumb, index) => (
                  <div key={crumb.href} className="flex items-center">
                    {index > 0 && (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                    <BreadcrumbItem className="hidden md:block">
                      {crumb.isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-4">
            {mounted && (
              <div className="hidden md:flex flex-col items-end text-sm">
                <span className="font-medium">
                  {currentTime.toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-muted-foreground">
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            )}
            
            {/* Notification Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setNotificationOpen(true)}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-semibold"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>

            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Notification Sheet */}
      <NotificationSheet
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
      />
    </header>
  );
};

export default Header;
