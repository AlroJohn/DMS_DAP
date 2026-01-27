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

socket.on("printJob", async (job) => {
  console.log(`\n📨 Received Print Job: ${job.jobId || 'unknown'}`);
  console.log("Job data:", JSON.stringify(job.data, null, 2));
  
  try {
    // Determine content to print
    const requestData = job.data || {};
    const barcodeText = requestData.barcodeData || requestData.documentCode || requestData.text;
    const organizationName = requestData.organizationName || "Property of: DAP";
    const titleText = organizationName;
    const printType = requestData.printType || 'barcode'; // Default to barcode if not specified

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
    
    if (printType === 'qrcode') {
      await generateQRCodeLabelPDF(pdfPath, titleText, barcodeText);
      console.log(`✅ QR Code PDF Generated: ${pdfPath}`);
    } else {
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
  return new Promise((resolve, reject) => {
    // Create PDF with exact dimensions: 24mm width x 100mm height
    // This matches the tape width (24mm constraint)
    const pdfWidth = LABEL_HEIGHT_MM * PRO_MM_TO_PT; // 24mm width
    const pdfHeight = LABEL_WIDTH_MM * PRO_MM_TO_PT; // 100mm height

    const doc = new PDFDocument({
      size: [pdfWidth, pdfHeight],
      margin: 0,
      layout: 'portrait' // Width=24mm, Height=100mm
    });

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Rotate content 90 degrees to print along the tape length
    // This way the label reads correctly when tape comes out
    doc.save();
    doc.translate(pdfWidth, 0); 
    doc.rotate(90);

    // After rotation, we can draw in landscape orientation
    const DRAW_WIDTH = PAGE_WIDTH; // 100mm effective width
    const DRAW_HEIGHT = PAGE_HEIGHT; // 24mm effective height
    
    // 1. Organization/Title Text at the top
    doc.fontSize(12); // Increased font size
    doc.font('Helvetica-Bold');
    doc.text(title, 15, 3, {
        width: DRAW_WIDTH - 30,
        align: 'left'
    });

    // 2. Generate and place CODE128 Barcode - MUCH BIGGER!
    try {
        const barcodeOptions = {
            bcid: 'code128',       // CODE128 barcode format
            text: barcodeText,
            scale: 4,              // Increased scale for bigger barcode (was 2)
            height: 18,            // Increased barcode height to 18mm (was 10mm)
            includetext: true,     // Show text below barcode
            textxalign: 'center',  // Center align the text
            textsize: 12           // Increased text size (was 9)
        };
        
        bwipjs.toBuffer(barcodeOptions, function(err, png) {
            if (err) {
                console.error("Barcode generation error:", err);
                reject(err);
                return;
            }
            
            try {
                // Place barcode below the title text - with more space
                // Title is at y=3, approx 4-5mm height
                // Place barcode at y=12 to have spacing
                doc.image(png, 10, 12, {
                    fit: [DRAW_WIDTH - 20, 80], // Larger fit area for bigger barcode
                    align: 'center',
                    valign: 'top'
                });
                
                doc.restore();
                doc.end();
            } catch (imgErr) {
                console.error("Image placement error:", imgErr);
                reject(imgErr);
            }
        });

    } catch (e) {
        console.error("Barcode processing error:", e);
        reject(e);
    }

    stream.on('finish', () => {
        resolve(filepath);
    });

    stream.on('error', (err) => {
        console.error("PDF stream error:", err);
        reject(err);
    });
  });
}

/**
 * Generates a PDF label with ONLY a QR Code (no text)
 * Optimized for Brother PT-P710BT 24mm tape width
 */
async function generateQRCodeLabelPDF(filepath, title, qrCodeData) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create PDF with exact dimensions: 24mm width x 100mm height
      const pdfWidth = LABEL_HEIGHT_MM * PRO_MM_TO_PT; // 24mm width
      const pdfHeight = LABEL_WIDTH_MM * PRO_MM_TO_PT; // 100mm height

      const doc = new PDFDocument({
        size: [pdfWidth, pdfHeight],
        margin: 0,
        layout: 'portrait' // Width=24mm, Height=100mm
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
      
      // Generate QR Code ONLY - no text!
      const qrOptions = {
        errorCorrectionLevel: 'L',  // Low error correction = bigger/simpler QR code
        type: 'png',
        quality: 1,
        margin: 0,  // No margin - maximize size
        width: 800,  // Very high resolution
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };
      
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, qrOptions);
      
      // Place QR code - MAXIMUM SIZE, FILL ENTIRE LABEL
      const qrSize = DRAW_HEIGHT - 1; // Use full 24mm height (minus 1pt for safety)
      const qrX = (DRAW_WIDTH - qrSize) / 2; // Horizontally centered
      const qrY = 0.5; // Tiny margin from top
      
      doc.image(qrCodeBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize
      });
      
      doc.restore();
      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (err) => {
        console.error("PDF stream error:", err);
        reject(err);
      });
      
    } catch (e) {
      console.error("QR Code generation error:", e);
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
