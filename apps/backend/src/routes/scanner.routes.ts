import { Router } from 'express';
import { ScannerController } from '../controllers/scanner.controller';
import { authMiddleware as authenticateToken } from '../middleware/auth-middleware';

const router = Router();

// Scan QR code from uploaded image
router.post(
  '/qrcode',
  authenticateToken,
  ScannerController.uploadMiddleware,
  ScannerController.scanQRCode
);

// Scan QR code from uploaded image (alias)
router.post(
  '/scan',
  authenticateToken,
  ScannerController.uploadMiddleware,
  ScannerController.scanImage
);

export default router;
