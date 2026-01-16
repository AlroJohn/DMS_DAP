import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { PermissionService } from "../services/permission.service";

const permissionService = new PermissionService();

/**
 * Get all sidebar settings
 */
export const getSidebarSettings = async (req: Request, res: Response) => {
  console.log('[Sidebar Settings] GET / - Fetching all sidebar settings');
  try {
    const settings = await prisma.sidebarSettings.findMany({
      orderBy: { section_key: "asc" },
    });
    
    console.log('[Sidebar Settings] Found settings:', settings.length);

    // If no settings exist, initialize with defaults
    if (settings.length === 0) {
      const defaultSettings = [
        { section_key: "home", section_name: "Home", is_enabled: true },
        { section_key: "dashboard", section_name: "Dashboard", is_enabled: true },
        { section_key: "documents", section_name: "Documents", is_enabled: true },
        { section_key: "management", section_name: "Management", is_enabled: true },
        { section_key: "search", section_name: "Search", is_enabled: true },
        { section_key: "notifications", section_name: "Notifications", is_enabled: true },
        { section_key: "sidebar settings", section_name: "Sidebar Settings", is_enabled: true },
        { section_key: "reports", section_name: "Reports", is_enabled: true },
      ];

      const createdSettings = await prisma.$transaction(
        defaultSettings.map((setting) =>
          prisma.sidebarSettings.create({ data: setting })
        )
      );

      return res.json({
        success: true,
        data: createdSettings,
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error("Error fetching sidebar settings:", error);
    
    // If table doesn't exist, return default settings without creating them
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      const defaultSettings = [
        { section_key: "home", section_name: "Home", is_enabled: true },
        { section_key: "dashboard", section_name: "Dashboard", is_enabled: true },
        { section_key: "documents", section_name: "Documents", is_enabled: true },
        { section_key: "management", section_name: "Management", is_enabled: true },
        { section_key: "search", section_name: "Search", is_enabled: true },
        { section_key: "notifications", section_name: "Notifications", is_enabled: true },
        { section_key: "sidebar settings", section_name: "Sidebar Settings", is_enabled: true },
        { section_key: "reports", section_name: "Reports", is_enabled: true },
      ].map((setting, index) => ({
        ...setting,
        setting_id: `default-${index}`,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      
      return res.json({
        success: true,
        data: defaultSettings,
        message: "Using default settings. Run migrations to persist changes.",
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to fetch sidebar settings",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Update sidebar setting (toggle on/off)
 * Only superadmins can access this
 */
export const updateSidebarSetting = async (req: Request, res: Response) => {
  console.log('[Sidebar Settings] PUT /:setting_id - Updating sidebar setting');
  try {
    const { setting_id } = req.params;
    const { is_enabled } = req.body;
    const user = (req as any).user;

    console.log('[Sidebar Settings] User from request:', user);

    // Check if user has admin permissions
    if (!user?.id) {
      console.error('[Sidebar Settings] No user ID found in request');
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const hasAdminPermission = await permissionService.hasPermission(user.id, "system_settings_write");
    if (!hasAdminPermission) {
      return res.status(403).json({
        success: false,
        message: "Only superadmins can modify sidebar settings",
      });
    }

    if (typeof is_enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_enabled must be a boolean value",
      });
    }

    const setting = await prisma.sidebarSettings.update({
      where: { setting_id },
      data: { is_enabled },
    });

    res.json({
      success: true,
      message: "Sidebar setting updated successfully",
      data: setting,
    });
  } catch (error) {
    console.error("Error updating sidebar setting:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update sidebar setting",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Bulk update sidebar settings
 * Only superadmins can access this
 */
export const bulkUpdateSidebarSettings = async (req: Request, res: Response) => {
  console.log('[Sidebar Settings] PUT /bulk - Bulk updating sidebar settings');
  try {
    const { settings } = req.body;
    const user = (req as any).user;

    console.log('[Sidebar Settings] User from request:', user);
    console.log('[Sidebar Settings] Settings to update:', settings?.length);

    // Check if user has admin permissions
    if (!user?.id) {
      console.error('[Sidebar Settings] No user ID found in request');
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const hasAdminPermission = await permissionService.hasPermission(user.id, "system_settings_write");
    if (!hasAdminPermission) {
      return res.status(403).json({
        success: false,
        message: "Only superadmins can modify sidebar settings",
      });
    }

    if (!Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: "settings must be an array",
      });
    }

    const updatePromises = settings.map((setting) =>
      prisma.sidebarSettings.update({
        where: { setting_id: setting.setting_id },
        data: { is_enabled: setting.is_enabled },
      })
    );

    const updatedSettings = await prisma.$transaction(updatePromises);

    res.json({
      success: true,
      message: "Sidebar settings updated successfully",
      data: updatedSettings,
    });
  } catch (error) {
    console.error("Error bulk updating sidebar settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update sidebar settings",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get enabled sidebar sections (public endpoint for all authenticated users)
 */
export const getEnabledSections = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.sidebarSettings.findMany({
      where: { is_enabled: true },
      select: { section_key: true, section_name: true },
    });

    // If no settings exist, return all sections as enabled by default
    if (settings.length === 0) {
      const defaultSections = [
        { section_key: "home", section_name: "Home" },
        { section_key: "dashboard", section_name: "Dashboard" },
        { section_key: "documents", section_name: "Documents" },
        { section_key: "management", section_name: "Management" },
        { section_key: "search", section_name: "Search" },
        { section_key: "notifications", section_name: "Notifications" },
        { section_key: "sidebar settings", section_name: "Sidebar Settings" },
        { section_key: "reports", section_name: "Reports" },
      ];
      return res.json({
        success: true,
        data: defaultSections,
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error("Error fetching enabled sections:", error);
    
    // If table doesn't exist, return all sections as enabled
    const defaultSections = [
      { section_key: "home", section_name: "Home" },
      { section_key: "dashboard", section_name: "Dashboard" },
      { section_key: "documents", section_name: "Documents" },
      { section_key: "management", section_name: "Management" },
      { section_key: "search", section_name: "Search" },
      { section_key: "notifications", section_name: "Notifications" },
      { section_key: "sidebar settings", section_name: "Sidebar Settings" },
      { section_key: "reports", section_name: "Reports" },
    ];
    
    res.json({
      success: true,
      data: defaultSections,
      message: "Using default settings. Run migrations to enable configuration.",
    });
  }
};
