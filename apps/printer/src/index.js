const io = require("socket.io-client");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const QRCode = require("qrcode");
const pdfPrinter = require("pdf-to-printer");
const { execSync } = require("child_process");

// --- Configuration ---
const SOCKET_URL = process.env.NEXT_PUBLIC_PRINTER_SOCKET_URL || "http://localhost:3001";
const PRINTER_FILTER = "Brother"; // Filter to find the Brother printer
const PRINTER_TOKEN = process.env.PRINTER_SOCKET_TOKEN;

// 24mm tape height ~ 68 points (1mm = 2.835 points)
// Minimal length for MAXIMUM QR code size
const LABEL_HEIGHT_MM = 24; // Exact 24mm
const LABEL_WIDTH_MM = 30; // Minimal 30mm for maximum QR size
const PRO_MM_TO_PT = 2.83465;

const PAGE_WIDTH = LABEL_WIDTH_MM * PRO_MM_TO_PT; // 30mm
const PAGE_HEIGHT = LABEL_HEIGHT_MM * PRO_MM_TO_PT; // 24mm

// Setup Socket
const socket = io(SOCKET_URL, {
  auth: PRINTER_TOKEN ? { token: PRINTER_TOKEN } : { printer: true },
  transports: ["websocket"],
  rejectUnauthorized: false,
});

console.log("Starting Brother PT-P710BT Printer Service...");
console.log(`Target Printer Filter: "${PRINTER_FILTER}"`);
console.log(`Socket URL: ${SOCKET_URL}`);

// Helper: Find Brother Printer using Powershell (avoids native dependency issues)
function getBrotherPrinterName() {
  try {
    // Powershell command to list printer names
    const command = 'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"';
    const stdout = execSync(command, { encoding: 'utf8' });
    const printers = stdout.split(/\r?\n/).map(p => p.trim()).filter(p => p);
    
    console.log("\n📋 Available USB/System Printers:");
    printers.forEach((p, i) => {
      const isBrother = p.includes("Brother") || p.includes("PT-P");
      console.log(`  ${i + 1}. ${p}${isBrother ? " ⭐ Brother printer detected!" : ""}`);
    });
    console.log("");
    
    // Prioritize PT-P series (Label Printers)
    const labelPrinter = printers.find((p) => p.includes("PT-P") || p.includes("P-touch"));
    if (labelPrinter) return labelPrinter;

    // Fallback to any Brother printer
    const brother = printers.find((p) => p.includes(PRINTER_FILTER));
    return brother || null;
  } catch (err) {
    console.error("⚠️ Failed to list printers via PowerShell:", err.message);
    return null;
  }
}

const detectedPrinter = getBrotherPrinterName();
if (detectedPrinter) {
  console.log(`✅ Detected Brother Printer: "${detectedPrinter}"`);
} else {
  console.warn(`⚠️ No Brother printer found matching "${PRINTER_FILTER}". Please check:
  1. Printer is connected via USB
  2. Printer driver is installed
  3. Printer is powered on
  4. Run 'Get-Printer' in PowerShell to see available printers`);
}

socket.on("connect", () => {
  console.log(`✅ Connected to Socket Server: ${socket.id}`);
  socket.emit("printer:register");
  console.log("📡 Printer service registered and ready to print\n");
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

// TRACK: Prevent duplicate print job processing
const processedJobs = new Set();

socket.on("printJob", async (job) => {
  const jobId = job.jobId || 'unknown';
  
  // Check if this job was already processed
  if (processedJobs.has(jobId)) {
    console.log(`⚠️  DUPLICATE DETECTED - Ignoring already processed job: ${jobId}`);
    return;
  }
  
  // Mark as processing
  processedJobs.add(jobId);
  
  // Clean up old jobs after 1 minute to prevent memory leak
  setTimeout(() => {
    processedJobs.delete(jobId);
  }, 60000);
  
  console.log(`\n📨 Received Print Job: ${jobId}`);
  console.log("Job data:", JSON.stringify(job.data, null, 2));
  
  try {
    // Determine content to print
    const requestData = job.data || {};
    const barcodeText = requestData.barcodeData || requestData.documentCode || requestData.text;
    const organizationName = requestData.organizationName || "Property of: DAP";
    const titleText = organizationName;
    const printType = requestData.printType || 'barcode'; // Default to barcode if not specified

    console.log(`🔍 PRINTER DEBUG: printType="${printType}", will generate: ${printType === 'qrcode' ? 'QR CODE' : 'BARCODE'}`);

    if (!barcodeText) {
      console.error("❌ No barcode data provided in job");
      socket.emit("printError", {
        jobId: job.jobId,
        error: "No barcode data provided"
      });
      return;
    }

    console.log(`🏷️  Generating Label: "${titleText}"`);
    console.log(`📊 ${printType === 'qrcode' ? 'QR Code' : 'Barcode'} Data: ${barcodeText}`);

    // 1. Generate PDF Label based on print type
    const pdfPath = path.join(__dirname, `temp_label_${Date.now()}.pdf`);
    
    console.log(`⚙️ Calling generator for: ${printType}`);
    
    if (printType === 'qrcode') {
      console.log('✅ Generating QR CODE PDF...');
      await generateQRCodeLabelPDF(pdfPath, titleText, barcodeText);
      console.log(`✅ QR Code PDF Generated: ${pdfPath}`);
    } else {
      console.log('✅ Generating BARCODE PDF...');
      await generateLabelPDF(pdfPath, titleText, barcodeText);
      console.log(`✅ Barcode PDF Generated: ${pdfPath}`);
    }

    // 2. Print to Brother Printer
    const printerName = getBrotherPrinterName();
    if (!printerName) {
      throw new Error("Brother printer not found. Please check USB connection and driver installation.");
    }

    console.log(`🖨️  Printing to "${printerName}"...`);
    
    // Print with Brother-specific settings for 24mm tape
    await pdfPrinter.print(pdfPath, {
        printer: printerName,
        paperSize: "Custom.68x425",  // 24mm x 150mm in points
        scale: "fit",  // Fit to paper size
        monochrome: true,  // Black and white for label printer
        silent: true,  // Suppress printer dialog
        win32: ['-print-settings "fit"']  // Additional Windows settings
    });

    console.log("✅ Print command sent successfully!");
    
    // Keep PDF for debugging - don't delete immediately
    console.log(`📄 PDF saved at: ${pdfPath}`);
    console.log(`   Open this file to verify QR code was generated correctly`);
    
    // Cleanup PDF after a longer delay (30 seconds for debugging)
    setTimeout(() => {
        try { 
          fs.unlinkSync(pdfPath); 
          console.log("🗑️  Temporary PDF cleaned up");
        } catch(e) {
          console.warn("⚠️ Could not delete temporary PDF:", e.message);
        }
    }, 30000);  // 30 seconds instead of 5

    // Send success acknowledgment back to client
    socket.emit("printSuccess", {
        jobId: job.jobId,
        status: "completed",
        message: `${printType === 'qrcode' ? 'QR Code' : 'Barcode'} label printed successfully`
    });
    
    console.log("✅ Print job completed\n");

  } catch (err) {
    console.error("❌ Print Failed:", err.message);
    socket.emit("printError", {
        jobId: job.jobId,
        error: err.message
    });
  }
});


/**
 * Generates a PDF label with organization name and a CODE128 Barcode
 * Optimized for Brother PT-P710BT 24mm tape width
 */
async function generateLabelPDF(filepath, title, barcodeText) {
  console.log('🔧 [BARCODE GENERATOR] Starting barcode PDF generation...');
  console.log('🔧 [BARCODE GENERATOR] Data:', { filepath, title, barcodeText });
  
  return new Promise((resolve, reject) => {
    // Barcode label length - 4 inches (100mm) for long barcode
    const BARCODE_WIDTH_MM = 100; // Long label for barcode
    const pdfWidth = LABEL_HEIGHT_MM * PRO_MM_TO_PT;  // 24mm width
    const pdfHeight = BARCODE_WIDTH_MM * PRO_MM_TO_PT; // 100mm length

    const doc = new PDFDocument({
      size: [pdfWidth, pdfHeight],
      margin: 0,
      layout: 'portrait'
    });

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Set up stream event listeners first
    stream.on('finish', () => {
        console.log('🔧 [BARCODE GENERATOR] ✅ PDF stream finished successfully!');
        resolve(filepath);
    });

    stream.on('error', (err) => {
        console.error("🔧 [BARCODE GENERATOR] ❌ PDF stream error:", err);
        reject(err);
    });

    try {
      // Rotate content 90 degrees to print along the tape length
      doc.save();
      doc.translate(pdfWidth, 0); 
      doc.rotate(90);

      const DRAW_WIDTH = BARCODE_WIDTH_MM * PRO_MM_TO_PT; // 60mm effective width
      const DRAW_HEIGHT = LABEL_HEIGHT_MM * PRO_MM_TO_PT; // 24mm effective height
      
      console.log('🔧 [BARCODE GENERATOR] Generating barcode image with bwipjs...');
      
      // Generate CODE128 Barcode - OPTIMIZED FOR SCANNER READABILITY
      const barcodeOptions = {
          bcid: 'code128',
          text: barcodeText,
          scale: 6,              // High quality but not too thick
          height: 18,            // Good height for scanning
          includetext: false,    // NO TEXT - just barcode bars
          backgroundcolor: 'ffffff',  // Pure white background
          barcolor: '000000'     // Pure black bars for maximum contrast
      };
      
      bwipjs.toBuffer(barcodeOptions, function(err, png) {
          if (err) {
              console.error("🔧 [BARCODE GENERATOR] ❌ Barcode generation error:", err);
              reject(err);
              return;
          }
          
          console.log('🔧 [BARCODE GENERATOR] ✅ Barcode image generated, placing on PDF...');
          
          try {
              // Center the barcode vertically and horizontally, use most of the available space
              doc.image(png, 5, 0, {
                  fit: [DRAW_WIDTH - 10, DRAW_HEIGHT],
                  align: 'center',
                  valign: 'center'
              });
              
              console.log('🔧 [BARCODE GENERATOR] ✅ Barcode placed, finalizing PDF...');
              doc.restore();
              doc.end();
          } catch (imgErr) {
              console.error("🔧 [BARCODE GENERATOR] ❌ Image placement error:", imgErr);
              reject(imgErr);
          }
      });

    } catch (e) {
        console.error("🔧 [BARCODE GENERATOR] ❌ Barcode processing error:", e);
        reject(e);
    }
  });
}

/**
 * Generates a PDF label with ONLY a QR Code (no text)
 * Optimized for Brother PT-P710BT 24mm tape width
 */
async function generateQRCodeLabelPDF(filepath, title, qrCodeData) {
  console.log('🟦 [QR CODE GENERATOR] Starting QR code PDF generation...');
  console.log('🟦 [QR CODE GENERATOR] Data:', { filepath, title, qrCodeData });
  
  return new Promise(async (resolve, reject) => {
    try {
      // Create PDF with exact dimensions: 24mm width x 30mm height
      const pdfWidth = LABEL_HEIGHT_MM * PRO_MM_TO_PT; // 24mm width
      const pdfHeight = LABEL_WIDTH_MM * PRO_MM_TO_PT; // 30mm height

      const doc = new PDFDocument({
        size: [pdfWidth, pdfHeight],
        margin: 0,
        layout: 'portrait'
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Rotate content 90 degrees to print along the tape length
      doc.save();
      doc.translate(pdfWidth, 0); 
      doc.rotate(90);

      // After rotation, we can draw in landscape orientation
      const DRAW_WIDTH = PAGE_WIDTH; // 30mm effective width
      const DRAW_HEIGHT = PAGE_HEIGHT; // 24mm effective height
      
      console.log('🟦 [QR CODE GENERATOR] Generating QR code image...');
      
      // Generate QR Code ONLY - no text!
      const qrOptions = {
        errorCorrectionLevel: 'L',
        type: 'png',
        quality: 1,
        margin: 0,
        width: 800,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };
      
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, qrOptions);
      
      console.log('🟦 [QR CODE GENERATOR] ✅ QR code image generated, placing on PDF...');
      
      // Place QR code - MAXIMUM SIZE
      const qrSize = DRAW_HEIGHT - 1;
      const qrX = (DRAW_WIDTH - qrSize) / 2;
      const qrY = 0.5;
      
      doc.image(qrCodeBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize
      });
      
      console.log('🟦 [QR CODE GENERATOR] ✅ QR code placed, finalizing PDF...');
      doc.restore();
      doc.end();

      stream.on('finish', () => {
        console.log('🟦 [QR CODE GENERATOR] ✅ PDF stream finished successfully!');
        resolve(filepath);
      });

      stream.on('error', (err) => {
        console.error("🟦 [QR CODE GENERATOR] ❌ PDF stream error:", err);
        reject(err);
      });
      
    } catch (e) {
      console.error("🟦 [QR CODE GENERATOR] ❌ QR Code generation error:", e);
      reject(e);
    }
  });
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down printer service...');
  socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down printer service...');
  socket.disconnect();
  process.exit(0);
});
