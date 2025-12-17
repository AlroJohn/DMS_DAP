import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import { SignedDocument, DocumentFile, Document } from '@prisma/client';
import axios from 'axios';

/**
 * Service to handle PDF processing with signatures
 */
export class PDFSignatureService {
  /**
   * Add signatures to a PDF at specified coordinates
   * @param inputFile Path to the original PDF file
   * @param outputFile Path for the output PDF with signatures
   * @param signatures Array of signature placement instructions
   */
  static async addSignaturesToPDF(
    inputFile: string,
    outputFile: string,
    signatures: Array<{
      x: number;      // X coordinate as percentage from left (0-100)
      y: number;      // Y coordinate as percentage from top (0-100)
      width: number;  // Width in points (1/72 inch)
      height: number; // Height in points (1/72 inch)
      pageNumber: number; // Page number (1-indexed)
      signatureData: string; // Base64 encoded signature image or URL
    }>
  ): Promise<void> {
    try {
      // Read the existing PDF bytes
      const existingPdfBytes = await fs.readFile(inputFile);
      
      // Load the PDFDocument
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Process each signature
      for (const signature of signatures) {
        await this.addSingleSignature(pdfDoc, signature);
      }
      
      // Serialize the PDF
      const pdfBytes = await pdfDoc.save();
      
      // Write the PDF to the output file
      await fs.writeFile(outputFile, pdfBytes);
    } catch (error) {
      console.error('Error adding signatures to PDF:', error);
      throw new Error(`Failed to add signatures to PDF: ${error.message}`);
    }
  }

  /**
   * Add a single signature to the PDF
   */
  private static async addSingleSignature(
    pdfDoc: PDFDocument,
    signature: {
      x: number;
      y: number;
      width: number;
      height: number;
      pageNumber: number;
      signatureData: string;
    }
  ): Promise<void> {
    try {
      // Get the target page (1-indexed from user perspective, 0-indexed internally)
      const pageIndex = signature.pageNumber - 1;
      
      if (pageIndex >= pdfDoc.getPageCount() || pageIndex < 0) {
        throw new Error(`Invalid page number: ${signature.pageNumber}`);
      }
      
      const page = pdfDoc.getPage(pageIndex);
      const { width, height } = page.getSize();
      
      // Coordinates from frontend are already in PDF document space, so no additional scaling needed
      // The frontend already adjusted coordinates by dividing by RENDER_SCALE
      const absoluteX = signature.x;
      // In PDF coordinates, Y is measured from the bottom of the page
      const absoluteY = height - signature.y - signature.height;
      
      // Determine if signature data is a URL or base64 data
      let signatureImage;
      if (signature.signatureData.startsWith('http')) {
        // Fetch image from URL
        const response = await axios.get(signature.signatureData, { responseType: 'arraybuffer' });
        signatureImage = await this.embedImage(pdfDoc, response.data);
      } else if (signature.signatureData.startsWith('data:image')) {
        // Extract base64 data from data URI
        const base64Data = signature.signatureData.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        signatureImage = await this.embedImage(pdfDoc, imageBuffer);
      } else if (signature.signatureData.startsWith('/')) {
        // Assume it's a file path
        const imagePath = path.join(process.cwd(), signature.signatureData);
        const imageBuffer = await fs.readFile(imagePath);
        signatureImage = await this.embedImage(pdfDoc, imageBuffer);
      } else {
        throw new Error('Invalid signature data format');
      }
      
      // Embed the image in the PDF at the specified position
      page.drawImage(signatureImage, {
        x: absoluteX,
        y: absoluteY,
        width: signature.width,
        height: signature.height,
        opacity: 1,
      });
    } catch (error) {
      console.error('Error adding single signature:', error);
      throw error;
    }
  }

  /**
   * Embed an image into the PDF document
   */
  private static async embedImage(pdfDoc: PDFDocument, imageBuffer: Buffer) {
    // Attempt to embed as PNG first
    try {
      return await pdfDoc.embedPng(imageBuffer);
    } catch (pngError) {
      // If PNG fails, try JPEG
      try {
        return await pdfDoc.embedJpg(imageBuffer);
      } catch (jpegError) {
        // If both fail, throw the original error
        throw new Error(`Could not embed image: Neither PNG nor JPEG format recognized`);
      }
    }
  }

  /**
   * Process a document's signatures and create a signed version
   */
  static async processDocumentSignatures(
    document: Document,
    documentFile: DocumentFile,
    signedDocuments: SignedDocument[]
  ): Promise<string> {
    const inputFile = path.join(process.cwd(), documentFile.storage_path, documentFile.stored_name);
    const outputDir = path.join(process.cwd(), 'uploads', 'signed-pdfs');
    
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate output filename
    const fileExtension = path.extname(documentFile.stored_name);
    const fileNameWithoutExt = path.basename(documentFile.stored_name, fileExtension);
    const outputFilename = `${fileNameWithoutExt}_signed_${Date.now()}${fileExtension}`;
    const outputFile = path.join(outputDir, outputFilename);
    
    // Prepare signature data from signed documents
    const signatures = signedDocuments.map(sd => ({
      x: sd.x_position,
      y: sd.y_position,
      width: sd.width,
      height: sd.height,
      pageNumber: sd.page_number,
      signatureData: sd.signature_data || '' // Will use user's default signature if none provided
    }));
    
    // Add signatures to the PDF
    await this.addSignaturesToPDF(inputFile, outputFile, signatures);
    
    return outputFile;
  }
}