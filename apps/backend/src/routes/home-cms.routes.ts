import { Router } from "express";
import { homeCMSController } from "../controllers/home-cms.controller";
import { authMiddleware, requireSuperAdmin } from "../middleware/auth-middleware";
import multer from "multer";

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

/**
 * Public route - Get active CMS content
 * GET /api/home-cms
 */
router.get("/", homeCMSController.getActiveCMS.bind(homeCMSController));

/**
 * Superadmin only routes
 */

/**
 * Upload file for home CMS (logo or video)
 * POST /api/home-cms/upload
 */
router.post(
  "/upload",
  authMiddleware,
  requireSuperAdmin,
  upload.single("file"),
  homeCMSController.uploadFile.bind(homeCMSController)
);

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
