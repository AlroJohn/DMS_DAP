// @ts-ignore - qrcode-reader doesn't have type definitions
import QrCode from 'qrcode-reader';
import jsQR from 'jsqr';
// @ts-ignore - jimp types issue
import Jimp from 'jimp';

export interface ScanResult {
  success: boolean;
  data?: string;
  error?: string;
  type: 'qrcode';
}

export class ScannerService {
  /**
   * Scan QR Code from image buffer
   */
  static async scanQRCode(imageBuffer: Buffer): Promise<ScanResult> {
    try {
      console.log('Starting QR scan, buffer size:', imageBuffer.length);
      
      // Try with jsQR first (faster and more reliable)
      // @ts-ignore
      const image = await Jimp.read(imageBuffer);
      const { width, height } = image.bitmap;
      const data = new Uint8ClampedArray(image.bitmap.data);

      console.log('Image dimensions:', width, 'x', height);

      // Convert to Uint8ClampedArray for jsQR
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

      // Fallback to qrcode-reader
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
      console.error('QR scan service error:', error);
      return {
        success: false,
        error: typeof error === 'string' ? error : (error.message || 'Failed to scan QR code'),
        type: 'qrcode',
      };
    }
  }

  /**
   * Scan QR code from image - alias for scanQRCode
   */
  static async scanImage(imageBuffer: Buffer): Promise<ScanResult> {
    return this.scanQRCode(imageBuffer);
  }
}
