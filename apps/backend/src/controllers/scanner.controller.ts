import { Request, Response } from 'express';
import multer from 'multer';
// @ts-ignore
import QrCode from 'qrcode-reader';
import jsQR from 'jsqr';
// @ts-ignore - Jimp types may not be available
import Jimp from 'jimp';

interface ScanResult {
  success: boolean;
  data?: string;
  error?: string;
  type: 'qrcode';
}

// Configure multer to handle image uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

export class ScannerController {
  /**
   * Multer middleware for single image upload
   */
  static uploadMiddleware = upload.single('image');

  /**
   * Scan QR code from buffer
   */
  private static async scanQRCodeFromBuffer(imageBuffer: Buffer): Promise<ScanResult> {
    try {
      console.log('Starting QR scan, buffer size:', imageBuffer.length);
      
      // @ts-ignore - Jimp.read may have type issues
      const image = await Jimp.read(imageBuffer);
      const { width, height } = image.bitmap;
      const data = new Uint8ClampedArray(image.bitmap.data);

      console.log('Image dimensions:', width, 'x', height);

      const code = jsQR(data, width, height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        console.log('QR code found with jsQR:', code.data);
        return {
          success: true,
          data: code.data,
          type: 'qrcode',
        };
      }

      console.log('jsQR failed, trying qrcode-reader fallback');

      return new Promise((resolve) => {
        const qr = new QrCode();
        qr.callback = (err: any, value: any) => {
          if (err) {
            console.error('qrcode-reader error:', err);
            resolve({
              success: false,
              error: typeof err === 'string' ? err : (err.message || 'Failed to decode QR code'),
              type: 'qrcode',
            });
            return;
          }

          if (value && value.result) {
            console.log('QR code found with qrcode-reader:', value.result);
            resolve({
              success: true,
              data: value.result,
              type: 'qrcode',
            });
          } else {
            console.log('No QR code found by qrcode-reader');
            resolve({
              success: false,
              error: 'No QR code found in image',
              type: 'qrcode',
            });
          }
        };

        image.getBase64('image/png', (err: any, base64Image: string) => {
          if (err) {
            console.error('Base64 conversion error:', err);
            resolve({
              success: false,
              error: typeof err === 'string' ? err : (err.message || 'Failed to process image'),
              type: 'qrcode',
            });
            return;
          }
          qr.decode(base64Image);
        });
      });
    } catch (error: any) {
      console.error('QR scan error:', error);
      return {
        success: false,
        error: typeof error === 'string' ? error : (error.message || 'Failed to scan QR code'),
        type: 'qrcode',
      };
    }
  }

  /**
   * Scan QR code from uploaded image
   */
  static async scanQRCode(req: Request, res: Response): Promise<void> {
    try {
      console.log('=== QR Scan Request ===');
      
      if (!req.file) {
        console.log('No file provided');
        res.status(400).json({
          success: false,
          error: 'No image file provided',
        });
        return;
      }

      console.log('File received:', {
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        bufferLength: req.file.buffer?.length
      });

      if (!req.file.buffer || req.file.buffer.length === 0) {
        console.error('Empty file buffer');
        res.status(400).json({
          success: false,
          error: 'Empty file buffer',
        });
        return;
      }
      
      const result = await this.scanQRCodeFromBuffer(req.file.buffer);

      console.log('Scan result:', result);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          type: result.type,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to scan QR code',
        });
      }
    } catch (error: any) {
      console.error('=== QR scan controller error ===');
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      res.status(500).json({
        success: false,
        error: error?.message || 'Internal server error while scanning',
      });
    }
  }

  /**
   * Scan QR code from uploaded image - alias for scanQRCode
   */
  static async scanImage(req: Request, res: Response): Promise<void> {
    await ScannerController.scanQRCode(req, res);
  }
}
