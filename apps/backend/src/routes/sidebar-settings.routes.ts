import { Router } from "express";
import {
  getSidebarSettings,
  updateSidebarSetting,
  bulkUpdateSidebarSettings,
  getEnabledSections,
} from "../controllers/sidebar-settings.controller";
import { authMiddleware } from "../middleware/auth-middleware";

const router = Router();

console.log('[Sidebar Settings Routes] Registering sidebar settings routes');

// IMPORTANT: More specific routes must come before generic ones
// Public route (authenticated users can see enabled sections)
router.get("/enabled", authMiddleware, getEnabledSections);

// Admin routes (only superadmins can manage settings)
router.get("/", authMiddleware, getSidebarSettings);
router.put("/bulk", authMiddleware, bulkUpdateSidebarSettings); // Changed to /bulk to avoid conflicts
router.put("/:setting_id", authMiddleware, updateSidebarSetting);

console.log('[Sidebar Settings Routes] Routes registered');

export default router;
