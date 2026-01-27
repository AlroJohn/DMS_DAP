/**
 * Brother PT-P710BT Barcode Printer Integration
 * 
 * This utility helps send barcode print jobs to the Brother PT-P710BT printer
 * via Socket.IO from your backend controllers.
 */

import { Server as SocketIOServer } from 'socket.io';

export interface BarcodePrintOptions {
  printerIp?: string;
  printerPort?: number;
  barcodeFormat?: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14';
  labelWidth?: number;
  autoCut?: boolean;
}

export interface QRCodePrintOptions {
  printerIp?: string;
  printerPort?: number;
  labelWidth?: number;
  autoCut?: boolean;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Print a barcode on Brother PT-P710BT
 * @param io - Socket.IO server instance
 * @param barcodeData - Data to encode (e.g., document code)
 * @param options - Print options
 * @returns Promise<void>
 */
export function printBarcode(
  io: SocketIOServer,
  barcodeData: string,
  options: BarcodePrintOptions = {}
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const jobId = `barcode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const printJob = {
      app: 'dms',
      jobId,
      data: {
        event: 'printing',
        printer_type: 'PT-P710BT',
        printType: 'barcode',
        barcodeData,
        barcodeFormat: options.barcodeFormat || 'CODE128',
        useUSB: true, // Brother PT-P710BT is USB-only
        printer_name: process.env.PRINTER_NAME || 'Brother PT-P710BT',
      },
    };

    // Set up one-time listeners for this job
    const successHandler = (data: any) => {
      if (data.jobId === jobId) {
        io.off('printSuccess', successHandler);
        io.off('printError', errorHandler);
        resolve({ success: true, message: data.message || 'Barcode printed successfully' });
      }
    };

    const errorHandler = (data: any) => {
      if (data.jobId === jobId) {
        io.off('printSuccess', successHandler);
        io.off('printError', errorHandler);
        reject(new Error(data.error || 'Failed to print barcode'));
      }
    };

    // Listen for responses
    io.on('printSuccess', successHandler);
    io.on('printError', errorHandler);

    // Set timeout
    setTimeout(() => {
      io.off('printSuccess', successHandler);
      io.off('printError', errorHandler);
      reject(new Error('Print job timeout'));
    }, 30000); // 30 second timeout

    // Emit the print job to all printer clients
    io.emit('printJob', printJob);
  });
}

/**
 * Print a QR code on Brother PT-P710BT
 * @param io - Socket.IO server instance
 * @param qrData - Data to encode (e.g., URL, document ID)
 * @param options - Print options
 * @returns Promise<void>
 */
export function printQRCode(
  io: SocketIOServer,
  qrData: string,
  options: QRCodePrintOptions = {}
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve, reject) => {
    const jobId = `qrcode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const printJob = {
      app: 'dms',
      jobId,
      data: {
        event: 'printing',
        printer_type: 'PT-P710BT',
        printType: 'qrcode',
        qrData,
        useUSB: true, // Brother PT-P710BT is USB-only
        printer_name: process.env.PRINTER_NAME || 'Brother PT-P710BT',
      },
    };

    // Set up one-time listeners for this job
    const successHandler = (data: any) => {
      if (data.jobId === jobId) {
        io.off('printSuccess', successHandler);
        io.off('printError', errorHandler);
        resolve({ success: true, message: data.message || 'QR code printed successfully' });
      }
    };

    const errorHandler = (data: any) => {
      if (data.jobId === jobId) {
        io.off('printSuccess', successHandler);
        io.off('printError', errorHandler);
        reject(new Error(data.error || 'Failed to print QR code'));
      }
    };

    // Listen for responses
    io.on('printSuccess', successHandler);
    io.on('printError', errorHandler);

    // Set timeout
    setTimeout(() => {
      io.off('printSuccess', successHandler);
      io.off('printError', errorHandler);
      reject(new Error('Print job timeout'));
    }, 30000); // 30 second timeout

    // Emit the print job to all printer clients
    io.emit('printJob', printJob);
  });
}

/**
 * Example usage in a controller:
 * 
 * import { printBarcode, printQRCode } from '../utils/brother-printer';
 * import { io } from '../index'; // Your Socket.IO instance
 * 
 * // In your document controller
 * async createDocument(req: Request, res: Response) {
 *   const document = await createDocument(...);
 *   
 *   // Print barcode for the document
 *   try {
 *     await printBarcode(io, document.document_code, {
 *       barcodeFormat: 'CODE128',
 *       printerIp: '192.168.1.16'
 *     });
 *   } catch (error) {
 *     console.error('Barcode print failed:', error);
 *     // Continue anyway - printing is not critical
 *   }
 *   
 *   return res.json({ success: true, document });
 * }
 */
