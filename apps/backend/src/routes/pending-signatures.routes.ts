import { Router } from "express";
import { pendingSignaturesController } from "../controllers/pending-signatures.controller";
import { authMiddleware } from "../middleware/auth-middleware";

const router = Router();

/**
 * Get pending signatures for current user
 * GET /api/pending-signatures
 */
router.get(
  "/",
  authMiddleware,
  pendingSignaturesController.getPendingSignatures.bind(pendingSignaturesController)
);

export default router;
