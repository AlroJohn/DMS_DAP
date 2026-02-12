"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    badgeCount?: number;
    outgoingCount?: number;
    incomingCount?: number;
    items?: {
      title: string;
      url: string;
      badgeCount?: number;
      outgoingCount?: number;
      incomingCount?: number;
    }[];
  }[];
}) {
  const pathname = usePathname();
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    if (count >= 100) {
      return (count / 100).toFixed(1).replace(/\.0$/, "") + "h";
    }
    return count.toString();
  };

  const renderBadge = (
    count?: number,
    outgoing?: number,
    incoming?: number,
  ) => {
    // If both outgoing and incoming counts are provided, show them in the format "incoming/outgoing"
    if (
      outgoing !== undefined &&
      incoming !== undefined &&
      outgoing >= 0 &&
      incoming >= 0
    ) {
      if (outgoing > 0 || incoming > 0) {
        return (
          <span className="ml-auto rounded-full bg-secondary/20 px-2 py-0.5 font-bold text-secondary text-xs">
            {formatCount(incoming)}/{formatCount(outgoing)}
          </span>
        );
      }
    }

    // Otherwise, use the single count if provided
    if (count && count > 0) {
      return (
        <span className="ml-auto rounded-full bg-secondary/20 px-2 py-0.5 font-bold text-secondary">
          {formatCount(count)}
        </span>
      );
    }

    return null;
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;
          const isItemActive =
            (item.url === "/home" && pathname === "/") ||
            pathname === item.url ||
            pathname?.startsWith(item.url + "/");
          const isSubItemActive =
            hasSubItems &&
            item.items?.some((subItem) => pathname === subItem.url);

          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive || isItemActive || isSubItemActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <div className="flex items-center">
                    <SidebarMenuButton
                      tooltip={item.title}
                      asChild
                      className="flex-1"
                      isActive={isItemActive && !isSubItemActive}
                    >
                      <Link
                        href={item.url}
                        className="flex w-full items-center gap-2"
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        {renderBadge(
                          item.badgeCount,
                          item.outgoingCount,
                          item.incomingCount,
                        )}
                      </Link>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === subItem.url}
                          >
                            <Link
                              href={subItem.url}
                              className="flex w-full items-center justify-between"
                            >
                              <span>{subItem.title}</span>
                              {/* {renderBadge(subItem.badgeCount, subItem.outgoingCount, subItem.incomingCount)} */}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          } else {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={isItemActive}
                >
                  <Link
                    href={item.url}
                    className="flex w-full items-center gap-2"
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {renderBadge(
                      item.badgeCount,
                      item.outgoingCount,
                      item.incomingCount,
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
