import { Router } from "express";
import { homeCMSController } from "../controllers/home-cms.controller";
import { authMiddleware, requireSuperAdmin } from "../middleware/auth-middleware";

const router = Router();

/**
 * Public route - Get active CMS content
 * GET /api/home-cms
 */
router.get("/", homeCMSController.getActiveCMS.bind(homeCMSController));

/**
 * Superadmin only routes
 */

/**
 * Create or update CMS content
 * POST /api/home-cms
 */
router.post(
  "/",
  authMiddleware,
  requireSuperAdmin,
  homeCMSController.upsertCMS.bind(homeCMSController)
);

/**
 * Get all CMS history
 * GET /api/home-cms/all
 */
router.get(
  "/all",
  authMiddleware,
  requireSuperAdmin,
  homeCMSController.getAllCMS.bind(homeCMSController)
);

/**
 * Delete CMS content
 * DELETE /api/home-cms/:cmsId
 */
router.delete(
  "/:cmsId",
  authMiddleware,
  requireSuperAdmin,
  homeCMSController.deleteCMS.bind(homeCMSController)
);

export default router;
