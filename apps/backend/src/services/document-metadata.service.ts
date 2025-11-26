import { PDFDocument } from 'pdf-lib';
import path from 'path';
import mammoth from 'mammoth';
import { fileTypeFromFile } from 'file-type';
import fs from 'fs/promises';
import { fileMetadata as fm } from 'file-metadata';
import officeDocumentProperties from 'office-document-properties';

// Define interfaces at the top of the file
interface DocumentMetadataResult {
  file_size?: number;
  file_type?: string;
  mime_type?: string;
  author?: string | undefined;
  creator?: string | undefined;
  producer?: string | undefined;
  creation_date?: Date;
  modification_date?: Date;
  security_level?: string;
  retention_period?: number;
  is_encrypted?: boolean;
  checksum?: string;
  version?: string;
}

export class DocumentMetadataService {
  /**
   * Extract metadata from a document file
   * @param filePath - Path to the document file
   * @returns DocumentMetadataResult containing extracted metadata
   */
  async extractMetadata(filePath: string): Promise<DocumentMetadataResult> {
    console.log(`📍 [DocumentMetadataService.extractMetadata] Starting metadata extraction for file: ${path.basename(filePath)}`);

    try {
      // Get basic file info
      const stats = await fs.stat(filePath);
      const basicInfo: DocumentMetadataResult = {
        file_size: Number(stats.size),
        creation_date: stats.birthtime,
        modification_date: stats.mtime,
      };

      // Determine file type
      const fileType = await fileTypeFromFile(filePath);
      const extension = path.extname(filePath).toLowerCase();
      console.log(`📍 [DocumentMetadataService.extractMetadata] File extension: ${extension}, MIME type: ${basicInfo.mime_type}`);

      if (fileType || extension) {
        basicInfo.file_type = fileType?.ext || extension.substring(1);
        basicInfo.mime_type = fileType?.mime || this.getMimeTypeFromExtension(extension);
      }

      // Process based on file type
      let result: DocumentMetadataResult;
      const officeExtensions = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'];

      if (extension === '.pdf') {
        console.log(`📍 [DocumentMetadataService.extractMetadata] Extracting PDF metadata...`);
        result = { ...basicInfo, ...(await this.extractPdfMetadata(filePath)) };
      } else if (officeExtensions.includes(extension)) {
        console.log(`📍 [DocumentMetadataService.extractMetadata] Extracting Office file metadata...`);
        result = { ...basicInfo, ...(await this.extractOfficeMetadata(filePath)) };
      } else {
        // For other file types, extract with exiftool
        console.log(`📍 [DocumentMetadataService.extractMetadata] Extracting general file metadata with exiftool...`);
        result = { ...basicInfo, ...(await this.extractWithExiftool(filePath)) };
      }

      // Augment with file-metadata package
      try {
        console.log(`📍 [DocumentMetadataService.extractMetadata] Augmenting with 'file-metadata' package...`);
        const extraMeta: any = await fm(filePath);
        console.log(`📍 [DocumentMetadataService.extractMetadata] 'file-metadata' output:`, extraMeta);

        // We can try to map some fields if they are useful and not already present
        if (!result.creation_date && extraMeta.fsCreationDate) {
          result.creation_date = new Date(extraMeta.fsCreationDate);
        }
        if (!result.modification_date && extraMeta.fsContentChangeDate) {
          result.modification_date = new Date(extraMeta.fsContentChangeDate);
        }

      } catch (fmError: unknown) {
        const errorMessage = fmError instanceof Error ? fmError.message : String(fmError);
        console.warn(`'file-metadata' package failed to run. This may be expected on non-macOS systems.`, errorMessage);
      }

      console.log(`📍 [DocumentMetadataService.extractMetadata] Completed metadata extraction. Found ${Object.keys(result).filter(key => result[key as keyof DocumentMetadataResult] !== undefined).length} metadata fields.`);
      console.log(`📍 [DocumentMetadataService.extractMetadata] Final extracted metadata:`, result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error extracting metadata from ${filePath}:`, errorMessage);
      console.log(`📍 [DocumentMetadataService.extractMetadata] Returning basic metadata due to error.`);
      return { file_size: (await fs.stat(filePath)).size }; // Return at least the file size
    }
  }

  /**
   * Extract metadata from PDF files using a combination of pdf-lib and pdf-parse.
   */
  private async extractPdfMetadata(filePath: string): Promise<DocumentMetadataResult> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const metadata: DocumentMetadataResult = {};

      // Get basic file information
      const stats = await fs.stat(filePath);
      metadata.file_size = Number(stats.size);
      metadata.creation_date = stats.birthtime;
      metadata.modification_date = stats.mtime;

      // 1. Use pdf-lib for core metadata
      try {
        const pdfDoc = await PDFDocument.load(dataBuffer, { ignoreEncryption: true });
        if (!metadata.author) metadata.author = pdfDoc.getAuthor();
        if (!metadata.producer) metadata.producer = pdfDoc.getProducer();
        if (!metadata.creator) metadata.creator = pdfDoc.getCreator();
        if (!metadata.creation_date) metadata.creation_date = pdfDoc.getCreationDate();
        if (!metadata.modification_date) metadata.modification_date = pdfDoc.getModificationDate();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('pdf-lib failed to extract metadata, will rely on other tools.', errorMessage);
      }

      // 2. Use advanced pdf-parse analysis for text content and language detection
      let pdfParseModule: any;
      let loadError: unknown = null;

      try {
        pdfParseModule = require('pdf-parse');
      } catch (requireError) {
        loadError = requireError;
        try {
          // If require fails, try dynamic import as fallback
          const pdfParseImport: any = await import('pdf-parse');
          // Handle different export patterns for pdf-parse
          pdfParseModule = pdfParseImport.default || pdfParseImport || pdfParseImport['default'] || pdfParseImport;
        } catch (dynamicImportError) {
          loadError = dynamicImportError;
        }
      }

      if (loadError) {
        const errorMessage = loadError instanceof Error ? loadError.message : String(loadError);
        console.warn('Could not load pdf-parse module for advanced analysis:', errorMessage);
      } else {
        try {
          // Handle different export patterns for pdf-parse
          const pdfParser = pdfParseModule.default || pdfParseModule;
          const result = await pdfParser(dataBuffer);
          const text = (result.text || '').trim();

          // Extract author, producer, and creator if not already present
          const info = (result as any).info || {};
          if (!metadata.author && typeof info.Author === 'string' && info.Author.trim()) {
            metadata.author = info.Author;
          }
          if (!metadata.producer && typeof info.Producer === 'string' && info.Producer.trim()) {
            metadata.producer = info.Producer;
          }
          if (!metadata.creator && typeof info.Creator === 'string' && info.Creator.trim()) {
            metadata.creator = info.Creator;
          }

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn('pdf-parse failed to process PDF for advanced analysis:', errorMessage);
        }
      }

      console.log(`📍 [DocumentMetadataService.extractPdfMetadata] Extracted PDF metadata:`, metadata);
      return metadata;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error reading PDF file for metadata extraction:', errorMessage);
      // At least return the basic file stats
      try {
        const stats = await fs.stat(filePath);
        return {
          file_size: Number(stats.size),
          creation_date: stats.birthtime,
          modification_date: stats.mtime
        };
      } catch {
        return {};
      }
    }
  }

  /**
   * Extract metadata from Office documents using office-document-properties
   */
  private async extractOfficeMetadata(filePath: string): Promise<DocumentMetadataResult> {
    const metadata: DocumentMetadataResult = {};
    const ext = path.extname(filePath).toLowerCase();

    // Get basic file information
    const stats = await fs.stat(filePath);
    metadata.file_size = Number(stats.size);
    metadata.creation_date = stats.birthtime;
    metadata.modification_date = stats.mtime;

    // Try to extract with office-document-properties first
    let properties: any = null;
    try {
      properties = officeDocumentProperties.parse(await fs.readFile(filePath));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('office-document-properties failed, falling back to other methods:', errorMessage);
    }

    if (properties) {
      metadata.author = properties.author || properties.lastAuthor;
      metadata.creator = properties.creator;
      if (properties.created) metadata.creation_date = properties.created;
      if (properties.modified) metadata.modification_date = properties.modified;
    }

    // Always try to extract text content using Mammoth for better word/character count
    try {
      const result = await mammoth.convertToHtml({ path: filePath });
      const text = result.value; // This is the HTML content


    } catch (mammothError: unknown) {
      const errorMessage = mammothError instanceof Error ? mammothError.message : String(mammothError);
      console.warn('Mammoth text extraction failed (this is OK for some office files):', errorMessage);
    }

    console.log(`📍 [DocumentMetadataService.extractOfficeMetadata] Extracted Office metadata:`, metadata);
    return metadata;
  }

  /**
   * Extract metadata using exiftool for various file types
   */
  private async extractWithExiftool(filePath: string): Promise<DocumentMetadataResult> {
    try {
      // Check if exiftool-vendored is available
      let exiftool;
      try {
        const exiftoolModule = await import('exiftool-vendored');
        exiftool = exiftoolModule.exiftool;
      } catch (moduleError: unknown) {
        let errorMessage = 'Unknown error';
        if (moduleError instanceof Error) {
          errorMessage = moduleError.message;
        }
        console.warn('exiftool-vendored module not available:', errorMessage);
        return {};
      }

      const metadata = await exiftool.read(filePath);

      const result: DocumentMetadataResult = {};

      if (metadata) {
        // Handle author as it might be an array
        if (metadata.Author !== undefined) {
          result.author = Array.isArray(metadata.Author) ? metadata.Author.join(', ') : metadata.Author;
        }
        // Handle creator as it might be an array
        if (metadata.Creator !== undefined) {
          result.creator = Array.isArray(metadata.Creator) ? metadata.Creator.join(', ') : metadata.Creator;
        }
        result.creation_date = metadata.CreateDate ? new Date(metadata.CreateDate as string) : undefined;
        result.modification_date = metadata.ModifyDate ? new Date(metadata.ModifyDate as string) : undefined;
        // Handle producer as it might be an array (checking for different possible property names)
        if ((metadata as any).Producer || (metadata as any).PDFProducer) {
          const producerValue = (metadata as any).Producer || (metadata as any).PDFProducer;
          result.producer = Array.isArray(producerValue) ? producerValue.join(', ') : producerValue;
        }
        // Handle security_level as it might be an array
        if ((metadata as any).Security !== undefined) {
          result.security_level = Array.isArray((metadata as any).Security) ? (metadata as any).Security.join(', ') : (metadata as any).Security;
        }
        result.is_encrypted = (metadata as any).Encrypted === 'True' || undefined;
      }

      console.log(`📍 [DocumentMetadataService.extractWithExiftool] Extracted Exiftool metadata:`, result);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error extracting metadata with exiftool:', errorMessage);
      return {};
    }
  }

  /**
   * Get MIME type from file extension
   * @param ext File extension
   * @returns MIME type as string
   */
  public getMimeTypeFromExtension(ext: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}