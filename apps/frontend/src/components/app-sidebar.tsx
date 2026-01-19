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
import { hasPermission, hasAnyPermission } from "@/lib/document-permissions";

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
      title: "Sidebar Settings",
      url: "/admin/sidebar-settings",
      icon: Settings,
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
          title: "Document Trail",
          url: "/reports/document-trailing",
        },
        {
          title: "Usage Reports",
          url: "/reports/usage",
        },
        {
          title: "Compliance Reports",
          url: "/reports/compliance",
        },
        // {
        //   title: "Data Migration",
        //   url: "/reports/data-migration",
        // },
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
        // {
        //   title: "Query Reports",
        //   url: "/reports/queries",
        // },
        {
          title: "Version History",
          url: "/reports/versions",
        },
        // {
        //   title: "Chain of Custody",
        //   url: "/reports/chain-of-custody",
        // },
        // {
        //   title: "Report Builder",
        //   url: "/reports/builder",
        // },
        // {
        //   title: "Scheduled Reports",
        //   url: "/reports/scheduled",
        // },
      ],
    },
    // {
    //   title: "Admin",
    //   url: "#",
    //   icon: Settings,
    //   items: [
    //     {
    //       title: "Security Settings",
    //       url: "/admin/security",
    //     },
    //     {
    //       title: "Session Management",
    //       url: "/admin/session-management",
    //     },
    //     {
    //       title: "Security Alerts",
    //       url: "/admin/security-alerts",
    //     },
    //     {
    //       title: "System Health",
    //       url: "/admin/system-health",
    //     },
    //     {
    //       title: "Integrations",
    //       url: "/admin/integrations",
    //     },
    //     {
    //       title: "DocOnChain Config",
    //       url: "/admin/doconchain",
    //     },
    //     {
    //       title: "API Management",
    //       url: "/admin/api",
    //     },
    //     {
    //       title: "Connection Monitor",
    //       url: "/admin/connection-monitor",
    //     },
    //     {
    //       title: "Usage & Billing",
    //       url: "/admin/usage-billing",
    //     },
    //     {
    //       title: "SSO Settings",
    //       url: "/admin/sso",
    //     },
    //     {
    //       title: "LDAP Configuration",
    //       url: "/admin/ldap",
    //     },
    //     {
    //       title: "Webhooks",
    //       url: "/admin/webhooks",
    //     },
    //     {
    //       title: "API Documentation",
    //       url: "/admin/api-docs",
    //     },
    //     {
    //       title: "File Management",
    //       url: "/admin/file-management",
    //     },
    //     {
    //       title: "Retention Policies",
    //       url: "/admin/retention-policies",
    //     },
    //     {
    //       title: "Remote Access",
    //       url: "/admin/remote-access",
    //     },
    //     {
    //       title: "Approval Hierarchy",
    //       url: "/admin/approval-hierarchy",
    //     },
    //     {
    //       title: "Routing Rules",
    //       url: "/admin/routing-rules",
    //     },
    //     {
    //       title: "Data Migration",
    //       url: "/admin/migration",
    //     },
    //     {
    //       title: "Backup & Recovery",
    //       url: "/admin/backup",
    //     },
    //   ],
    // },
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
  const [enabledSections, setEnabledSections] = React.useState<Set<string>>(new Set());
  const [loadingSettings, setLoadingSettings] = React.useState(true);
  const apiBaseUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : process.env.NEXT_PUBLIC_API_BASE_URL || '';

  // Fetch global sidebar settings
  React.useEffect(() => {
    const fetchSidebarSettings = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/sidebar-settings/enabled`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            const enabledKeys = new Set<string>(
              data.data.map((item: { section_key: string }) => item.section_key)
            );
            setEnabledSections(enabledKeys);
          } else {
            // On error, enable all sections by default
            setEnabledSections(
              new Set(["home", "dashboard", "documents", "management", "search", "notifications", "reports"])
            );
          }
        } else {
          // On error, enable all sections by default
          setEnabledSections(
            new Set(["home", "dashboard", "documents", "management", "search", "notifications", "reports"])
          );
        }
      } catch (error) {
        console.error("Error fetching sidebar settings:", error);
        // On error, enable all sections by default
        setEnabledSections(
          new Set(["home", "dashboard", "documents", "management", "search", "notifications", "reports"])
        );
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSidebarSettings();
  }, []);

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

  // Filter navigation items based on user permissions
  const getFilteredNavItems = () => {
    if (!user || isLoading) return [];

    return data.navMain.filter((item) => {
      // If still loading settings, show all items (will be filtered once loaded)
      // Otherwise, check if section is globally enabled
      if (!loadingSettings) {
        const sectionKey = item.title.toLowerCase();
        if (!enabledSections.has(sectionKey)) {
          return false;
        }
      }

      // Check permissions for each navigation item
      switch (item.title) {
        case "Home":
          // Home is accessible to everyone
          return true;

        case "Dashboard":
          // Dashboard requires dashboard_read permission
          return hasPermission(user, "dashboard_read") || hasPermission(user, "dashboard_view");

        case "Documents":
          // Documents requires document_read permission
          if (!hasPermission(user, "document_read")) return false;
          
          // Filter sub-items based on permissions
          if (item.items) {
            item.items = item.items.filter((subItem) => {
              if (subItem.url?.includes("/owned")) {
                return hasPermission(user, "document_read");
              }
              if (subItem.url?.includes("/in-transit")) {
                return hasAnyPermission(user, ["document_read", "document_transfer_receive"]);
              }
              if (subItem.url?.includes("/shared")) {
                return hasPermission(user, "document_read");
              }
              if (subItem.url?.includes("/archive")) {
                return hasAnyPermission(user, ["document_archive", "document_read"]);
              }
              if (subItem.url?.includes("/recycle-bin")) {
                return hasAnyPermission(user, ["document_delete", "document_restore"]);
              }
              return true;
            });
          }
          return item.items && item.items.length > 0;

        case "Management":
          // Management requires any management permission
          const managementPermissions = [
            "document_type_read",
            "document_action_read",
            "department_read",
            "user_read",
            "role_read"
          ];
          if (!hasAnyPermission(user, managementPermissions)) return false;

          // Filter sub-items based on permissions
          if (item.items) {
            item.items = item.items.filter((subItem) => {
              if (subItem.url?.includes("/document-type")) {
                return hasPermission(user, "document_type_read");
              }
              if (subItem.url?.includes("/document-action")) {
                return hasPermission(user, "document_action_read");
              }
              if (subItem.url?.includes("/department")) {
                return hasPermission(user, "department_read");
              }
              if (subItem.url?.includes("/user-management")) {
                return hasPermission(user, "user_read");
              }
              if (subItem.url?.includes("/role-management")) {
                return hasPermission(user, "role_read");
              }
              return true;
            });
          }
          return item.items && item.items.length > 0;

        case "Search":
          // Search requires document_read permission
          return hasPermission(user, "document_read");

        case "Notifications":
          // Notifications are accessible to everyone authenticated
          return true;

        case "Sidebar Settings":
          // Sidebar Settings is only visible to SUPER_ADMIN role
          return user?.roles?.some((role: any) => role.code === "SUPER_ADMIN");

        case "Reports":
          // Reports require any report permission
          const reportPermissions = [
            "report_read",
            "report_audit",
            "report_usage",
            "report_compliance",
            "document_read"
          ];
          if (!hasAnyPermission(user, reportPermissions)) return false;

          // Filter sub-items based on permissions
          if (item.items) {
            item.items = item.items.filter((subItem) => {
              if (subItem.url?.includes("/audit-trail")) {
                return hasAnyPermission(user, ["report_audit", "report_read"]);
              }
              if (subItem.url?.includes("/document-trailing")) {
                return hasAnyPermission(user, ["report_read", "document_read"]);
              }
              if (subItem.url?.includes("/usage")) {
                return hasAnyPermission(user, ["report_usage", "report_read"]);
              }
              if (subItem.url?.includes("/compliance")) {
                return hasAnyPermission(user, ["report_compliance", "report_read"]);
              }
              if (subItem.url?.includes("/signing-history")) {
                return hasAnyPermission(user, ["report_read", "document_read"]);
              }
              if (subItem.url?.includes("/activity")) {
                return hasAnyPermission(user, ["report_read", "report_audit"]);
              }
              if (subItem.url?.includes("/access-history")) {
                return hasAnyPermission(user, ["report_read", "report_audit"]);
              }
              if (subItem.url?.includes("/versions")) {
                return hasAnyPermission(user, ["report_read", "document_read"]);
              }
              return true;
            });
          }
          return item.items && item.items.length > 0;

        default:
          // By default, hide items that don't have explicit permission checks
          return false;
      }
    });
  };

  const filteredNavItems = getFilteredNavItems();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent className="scroll-none">
        <NavMain items={filteredNavItems} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
