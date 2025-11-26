"use client";

import * as React from "react";
import {
  AudioWaveform,
  Command,
  DraftingCompass,
  Frame,
  GalleryVerticalEnd,
  HomeIcon,
  LayoutDashboard,
  LibraryBig,
  LineChart,
  LogsIcon,
  Map,
  PieChart,
  Settings,
  FileText,
  Shield,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { title } from "process";
import { TeamSwitcher } from "./team-switcher";

// Navigation and team data
const data = {
  teams: [
    {
      name: "Quanby Solutions Inc.",
      logo: GalleryVerticalEnd,
      plan: "",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/home",
      icon: HomeIcon,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      title: "Documents",
      url: "/documents",
      icon: LibraryBig,
      isActive: true,
      items: [
        // {
        //   title: "Upload Documents",
        //   url: "/documents/upload",
        // },
        {
          title: "Owned",
          url: "/documents/owned",
        },
        {
          title: "In-transit",
          url: "/documents/in-transit",
        },
        {
          title: "Shared",
          url: "/documents/shared",
        },
        {
          title: "Archive",
          url: "/documents/archive",
        },
        {
          title: "Recycle Bin",
          url: "/documents/recycle-bin",
        },
      ],
    },
    {
      title: "Management",
      url: "/management",
      icon: DraftingCompass,
      isActive: true,
      items: [
        {
          title: "Document Types",
          url: "/management/document-type",
        },
        {
          title: "Document Actions",
          url: "/management/document-action",
        },
        {
          title: "Departments",
          url: "/management/department",
        },
        {
          title: "Users",
          url: "/management/user-management",
        },
        {
          title: "Roles",
          url: "/management/role-management",
        },
      ],
    },
    // Contracts section removed
    {
      title: "Search",
      url: "/search",
      icon: Command,
      items: [
        {
          title: "Search Documents",
          url: "/search",
        },
        {
          title: "Saved Searches",
          url: "/search/saved",
        },
      ],
    },
    // {
    //   title: "Workflows",
    //   url: "/workflows",
    //   icon: DraftingCompass,
    //   items: [
    //     {
    //       title: "Workflow Builder",
    //       url: "/workflows/builder",
    //     },
    //     {
    //       title: "Templates",
    //       url: "/workflows/templates",
    //     },
    //     {
    //       title: "My Approvals",
    //       url: "/approvals",
    //     },
    //     {
    //       title: "Pending Signatures",
    //       url: "/workflows/pending-signatures",
    //     },
    //     {
    //       title: "Performance",
    //       url: "/workflows/performance",
    //     },
    //     {
    //       title: "Email Settings",
    //       url: "/workflows/email-settings",
    //     },
    //     {
    //       title: "Notification Settings",
    //       url: "/workflows/notifications-settings",
    //     },
    //   ],
    // },
    {
      title: "Notifications",
      url: "/notifications",
      icon: LogsIcon,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: LineChart,
      items: [
        {
          title: "Audit Trail",
          url: "/reports/audit-trail",
        },
        {
          title: "Usage Reports",
          url: "/reports/usage",
        },
        {
          title: "Compliance Reports",
          url: "/reports/compliance",
        },
        {
          title: "Data Migration",
          url: "/reports/data-migration",
        },
        {
          title: "Signing History",
          url: "/reports/signing-history",
        },
        {
          title: "Activity Logs",
          url: "/reports/activity",
        },
        {
          title: "Access History",
          url: "/reports/access-history",
        },
        {
          title: "Query Reports",
          url: "/reports/queries",
        },
        {
          title: "Version History",
          url: "/reports/versions",
        },
        {
          title: "Chain of Custody",
          url: "/reports/chain-of-custody",
        },
        {
          title: "Report Builder",
          url: "/reports/builder",
        },
        {
          title: "Scheduled Reports",
          url: "/reports/scheduled",
        },
      ],
    },
    {
      title: "Admin",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "Security Settings",
          url: "/admin/security",
        },
        {
          title: "Session Management",
          url: "/admin/session-management",
        },
        {
          title: "Security Alerts",
          url: "/admin/security-alerts",
        },
        {
          title: "System Health",
          url: "/admin/system-health",
        },
        {
          title: "Integrations",
          url: "/admin/integrations",
        },
        {
          title: "DocOnChain Config",
          url: "/admin/doconchain",
        },
        {
          title: "API Management",
          url: "/admin/api",
        },
        {
          title: "Connection Monitor",
          url: "/admin/connection-monitor",
        },
        {
          title: "Usage & Billing",
          url: "/admin/usage-billing",
        },
        {
          title: "SSO Settings",
          url: "/admin/sso",
        },
        {
          title: "LDAP Configuration",
          url: "/admin/ldap",
        },
        {
          title: "Webhooks",
          url: "/admin/webhooks",
        },
        {
          title: "API Documentation",
          url: "/admin/api-docs",
        },
        {
          title: "File Management",
          url: "/admin/file-management",
        },
        {
          title: "Retention Policies",
          url: "/admin/retention-policies",
        },
        {
          title: "Remote Access",
          url: "/admin/remote-access",
        },
        {
          title: "Approval Hierarchy",
          url: "/admin/approval-hierarchy",
        },
        {
          title: "Routing Rules",
          url: "/admin/routing-rules",
        },
        {
          title: "Data Migration",
          url: "/admin/migration",
        },
        {
          title: "Backup & Recovery",
          url: "/admin/backup",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isLoading } = useAuth();

  // Construct user data from authenticated user
  const getUserName = () => {
    if (!user) return "Guest User";
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || user.email?.split("@")[0] || "User";
  };

  const userData = {
    name: getUserName(),
    email: user?.email || "guest@example.com",
    avatar: user?.avatar || "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
