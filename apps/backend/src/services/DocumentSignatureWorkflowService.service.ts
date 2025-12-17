import { PDFSignatureService } from './PDFSignatureService.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Service to handle document signature workflows
 */
export class DocumentSignatureWorkflowService {
  
  /**
   * Process all signatures for a document and create a signed version
   */
  static async processDocumentSignatureWorkflow(
    documentId: string,
    documentFileId: string
  ): Promise<string> {
    try {
      // Get the document with its signatures
      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: {
          files: true
        }
      });

      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }

      // Get the document file
      const documentFile = await prisma.documentFile.findUnique({
        where: { file_id: documentFileId }
      });

      if (!documentFile) {
        throw new Error(`Document file with ID ${documentFileId} not found`);
      }

      // Get all signatures for this document
      const signedDocuments = await prisma.signedDocument.findMany({
        where: { 
          document_id: documentId,
          documentFileFile_id: documentFileId
        },
        include: {
          signee: true
        }
      });

      if (signedDocuments.length === 0) {
        throw new Error(`No signatures found for document ${documentId}`);
      }

      // Process the document with signatures
      const signedPdfPath = await PDFSignatureService.processDocumentSignatures(
        document,
        documentFile,
        signedDocuments
      );

      // Update the document status to indicate it's been signed
      await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'completed', // or 'signed', depending on your workflow
          updated_at: new Date()
        }
      });

      // Create a document trail entry for the signing action
      await prisma.documentTrail.create({
        data: {
          document_id: documentId,
          action_id: null, // This would be a specific "sign" action ID
          from_department: documentFile.uploaded_by, // or get from document context
          to_department: null,
          user_id: signedDocuments[0].signee_id, // The primary signer
          action_date: new Date(),
          status: 'completed',
          remarks: `Document signed by ${signedDocuments[0].signee.first_name} ${signedDocuments[0].signee.last_name}`
        }
      });

      return signedPdfPath;
    } catch (error) {
      console.error('Error in document signature workflow:', error);
      throw error;
    }
  }

  /**
   * Validate signature positions before applying them
   */
  static async validateSignaturePositions(
    documentId: string,
    documentFileId: string,
    positions: Array<{
      page_number: number;
      x_position: number;
      y_position: number;
      width: number;
      height: number;
    }>
  ): Promise<boolean> {
    try {
      // Get document file to validate dimensions
      const documentFile = await prisma.documentFile.findUnique({
        where: { file_id: documentFileId }
      });

      if (!documentFile) {
        throw new Error(`Document file with ID ${documentFileId} not found`);
      }

      // In a real implementation, you would get the PDF page dimensions
      // For now, we'll just validate that coordinates are within reasonable bounds
      for (const position of positions) {
        // Assuming coordinates are percentages (0-100)
        if (
          position.x_position < 0 || position.x_position > 100 ||
          position.y_position < 0 || position.y_position > 100 ||
          position.width <= 0 || position.height <= 0 ||
          position.page_number < 1
        ) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating signature positions:', error);
      return false;
    }
  }

  /**
   * Check if a document is ready for signing (all required signatures are in place)
   */
  static async isDocumentReadyForSigning(documentId: string): Promise<boolean> {
    try {
      // Get document placeholders that don't have signatures yet
      const placeholders = await prisma.signaturePlaceholder.findMany({
        where: { document_id: documentId },
        select: { placeholder_id: true }
      });

      // Get document signatures
      const signatures = await prisma.signedDocument.findMany({
        where: { document_id: documentId }
      });

      // Check if all placeholders have been signed
      return placeholders.length <= signatures.length;
    } catch (error) {
      console.error('Error checking document signing status:', error);
      return false;
    }
  }
}