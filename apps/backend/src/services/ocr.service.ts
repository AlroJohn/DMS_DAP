import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";

const MODEL_NAME = "gemini-2.5-flash"; // A reliable and fast model for single-page OCR

interface OcrPage {
  page: number;
  text: string;
}

export interface OcrResult {
  language: string;
  engine: string;
  processedAt: string;
  pages: OcrPage[];
}

export class OcrService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  private async ocrSinglePage(
    pageBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: MODEL_NAME });

    const parts = [
      {
        inlineData: {
          mimeType,
          data: pageBuffer.toString("base64"),
        },
      },
      {
        text: `Perform OCR on this single-page document. Preserve line breaks and spacing as closely as possible, using \\n for new lines. Return only the extracted text (no formatting, no markdown, no explanations).`,
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const rawText = result.response.text();
    return rawText.replace(/\r\n/g, "\n");
  }

  async extractTextFromPdf(
    filePath: string,
    mimeType: string = "application/pdf"
  ): Promise<OcrResult | null> {
    try {
      console.log(`[OcrService] Starting page-by-page OCR for file: ${filePath}`);
      const fileBuffer = await fs.readFile(filePath);

      // Load the PDF with pdf-lib
      const mainPdfDoc = await PDFDocument.load(fileBuffer);
      const totalPages = mainPdfDoc.getPageCount();
      console.log(`[OcrService] PDF has ${totalPages} pages.`);

      const allPagesText: OcrPage[] = [];

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (let i = 0; i < totalPages; i++) {
        try {
          console.log(`[OcrService] Processing page ${i + 1} of ${totalPages}...`);
          // Create a new PDF with just one page
          const singlePagePdf = await PDFDocument.create();
          const [copiedPage] = await singlePagePdf.copyPages(mainPdfDoc, [i]);
          singlePagePdf.addPage(copiedPage);

          const pageBuffer = await singlePagePdf.save();
          const pageText = await this.ocrSinglePage(
            Buffer.from(pageBuffer),
            mimeType
          );

          allPagesText.push({
            page: i + 1,
            text: pageText.trim(),
          });
          console.log(`[OcrService] Successfully processed page ${i + 1}.`);

        } catch (pageError) {
          console.error(`[OcrService] Failed to process page ${i + 1}. Skipping.`, pageError);
          // Add a placeholder for the failed page
          allPagesText.push({
            page: i + 1,
            text: `[OCR failed for this page]`,
          });
        }

        // Add a delay to avoid hitting API rate limits, especially on the free tier.
        if (i < totalPages - 1) {
          await delay(1000); // 1-second delay
        }
      }

      if (allPagesText.length === 0) {
        console.error("[OcrService] No pages were successfully processed.");
        return null;
      }

      const finalResult: OcrResult = {
        language: "en", // Assuming English, could be made dynamic if needed
        engine: MODEL_NAME,
        processedAt: new Date().toISOString(),
        pages: allPagesText,
      };

      console.log(`[OcrService] Completed OCR for all pages of file: ${filePath}`);
      return finalResult;

    } catch (error) {
      console.error("[OcrService] A critical error occurred during the OCR process:", error);
      return null;
    }
  }
}

export const ocrService = new OcrService();
