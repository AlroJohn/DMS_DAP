import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";

const MODEL_NAME = "gemini-1.5-flash"; // More recent and capable model

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

  private fileToGenerativePart(filePath: string, mimeType: string) {
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
        mimeType,
      },
    };
  }

  async extractTextFromPdf(
    filePath: string,
    mimeType: string = "application/pdf"
  ): Promise<OcrResult | null> {
    try {
      console.log(`[OcrService] Starting OCR for file: ${filePath}`);

      const fileBuffer = await fs.readFile(filePath);

      const generationConfig = {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      };

      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        // ... other safety settings
      ];

      const model = this.genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig,
        safetySettings,
      });

      const parts = [
        {
          inlineData: {
            mimeType: mimeType,
            data: fileBuffer.toString("base64"),
          },
        },
        {
          text: `Perform OCR on the provided PDF document. Extract all text from each page and return the result as a JSON object. The JSON object must follow this exact structure:
          
          {
            "language": "en",
            "engine": "gemini-1.5-flash",
            "processedAt": "ISO_8601_TIMESTAMP",
            "pages": [
              {
                "page": 1,
                "text": "..."
              },
              {
                "page": 2,
                "text": "..."
              }
            ]
          }
          
          - Replace "ISO_8601_TIMESTAMP" with the current UTC timestamp.
          - For each page, provide the page number and the full extracted text.
          - Ensure the output is a single, valid JSON object and nothing else.
          - If a page is blank or contains no text, include it in the array with an empty string for the "text" field.`,
        },
      ];

      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      const response = result.response;
      const text = response.text();

      // Clean the response to get only the JSON part
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : text;

      console.log("[OcrService] Received raw response from Gemini.");

      const ocrResult: OcrResult = JSON.parse(jsonString);

      console.log(`[OcrService] Successfully parsed OCR result for file: ${filePath}`);

      return ocrResult;
    } catch (error) {
      console.error("[OcrService] Error during OCR processing:", error);
      // Depending on requirements, you might want to re-throw or handle it
      return null;
    }
  }
}

export const ocrService = new OcrService();
