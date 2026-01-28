import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth-middleware";
import { prisma } from "../lib/prisma";

export class PendingSignaturesController {
  /**
   * Get documents with pending signatures for the current user
   * GET /api/pending-signatures
   */
  async getPendingSignatures(req: Request, res: Response) {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Find signature placeholders assigned to this user
      const placeholders = await prisma.signaturePlaceholder.findMany({
        where: {
          OR: [
            { assigned_user_id: userId },
            { assigned_user_id: null },
          ],
        },
        select: {
          document_id: true,
        },
        distinct: ["document_id"],
      });

      // Get unique document IDs
      const documentIds = placeholders.map((p) => p.document_id);

      if (documentIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
        });
      }

      // Fetch documents with their details
      const documentsData = await prisma.document.findMany({
        where: {
          document_id: {
            in: documentIds,
          },
        },
        include: {
          files: {
            orderBy: { uploaded_at: "desc" },
            take: 1,
          },
        },
      });

      // Build result with pending signature counts
      const documentMap = new Map<string, any>();

      for (const document of documentsData) {
        const documentId = document.document_id;

        // Get all placeholders for this document assigned to user
        const userPlaceholders = await prisma.signaturePlaceholder.count({
          where: {
            document_id: documentId,
            OR: [{ assigned_user_id: userId }, { assigned_user_id: null }],
          },
        });

        // Get signatures from this user for this document
        const userSignatures = await prisma.signedDocument.count({
          where: {
            document_id: documentId,
            signee_id: userId,
          },
        });

        // Only include if user hasn't signed all their placeholders
        if (userPlaceholders > userSignatures) {
          // Fetch document type if document_type is provided
          let documentType = null;
          if (document.document_type) {
            documentType = await prisma.documentType.findFirst({
              where: { name: document.document_type },
            });
          }

          documentMap.set(documentId, {
            document_id: document.document_id,
            document_name: document.title,
            classification: document.classification,
            status: document.status,
            created_at: document.created_at,
            type: documentType
              ? {
                  type_id: documentType.type_id,
                  type_name: documentType.name,
                }
              : null,
            files: document.files.map((file) => ({
              file_id: file.file_id,
              file_name: file.original_name,
              file_path: file.storage_path,
            })),
            pending_signatures: userPlaceholders - userSignatures,
          });
        }
      }

      const documents = Array.from(documentMap.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error: any) {
      console.error("Error in getPendingSignatures:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch pending signatures",
      });
    }
  }
}

export const pendingSignaturesController = new PendingSignaturesController();
