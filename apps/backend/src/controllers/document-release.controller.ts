import { Request, Response } from 'express';
import { DocumentReleaseService } from '../services/document-release.service';
import { AuthRequest } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError, validateRequiredFields } from '../utils/response';

export class DocumentReleaseController {
  private documentReleaseService: DocumentReleaseService;

  constructor() {
    this.documentReleaseService = new DocumentReleaseService();
  }

  /**
   * POST /api/documents/:id/release - Release a document to another department
   */
  releaseDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { departmentId, requestAction, requestActions, remarks, signatures } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id) || !uuidRegex.test(departmentId)) {
      console.log('📍 [DocumentReleaseController.releaseDocument] Invalid document ID or department ID format:', id, departmentId);
      return sendError(res, 'Invalid document ID or department ID format', 400);
    }

    // Check if requestActions is provided (array), otherwise fallback to requestAction (single)
    const actions = requestActions ? requestActions : requestAction;
    if (!actions) {
      return sendError(res, 'Either requestAction or requestActions is required', 400);
    }

    // If requestActions is an array, validate it's not empty
    if (Array.isArray(actions) && actions.length === 0) {
      return sendError(res, 'requestActions cannot be empty', 400);
    }

    const result = await this.documentReleaseService.releaseDocument(
      id,
      departmentId,
      actions, // Could be string or string[]
      remarks,
      authReq.user.id,
      signatures
    );

    if (!result.success) {
      return sendError(res, result.error || 'Failed to release document', 500);
    }

    return sendSuccess(res, result.data, 200);
  });

  /**
   * POST /api/documents/:id/receive - Receive a document
   */
  receiveDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentReleaseController.receiveDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const existingDocument = await this.documentReleaseService['prisma'].document.findUnique({
      where: { document_id: id }
    });
    if (!existingDocument) {
      return sendError(res, 'Document not found', 404);
    }

    const canAccess = await this.checkUserCanAccessDocument(id, authReq.user.id);
    if (!canAccess) {
      // Perform individual checks to provide more specific error messages
      const user = await this.documentReleaseService['prisma'].user.findUnique({
        where: { user_id: authReq.user.id },
        select: { department_id: true }
      });

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      // Check document status
      if (existingDocument.status !== 'intransit') {
        return sendError(res, `Document is not in transit. Current status: ${existingDocument.status}`, 400);
      }

      // Check if user's department matches the to_department in the latest transit trail
      const latestTransitTrail = await this.documentReleaseService['prisma'].documentTrail.findFirst({
        where: {
          document_id: id,
          status: 'intransit'
        },
        orderBy: {
          created_at: 'desc'
        },
        select: {
          to_department: true
        }
      });

      if (latestTransitTrail?.to_department && latestTransitTrail.to_department !== user.department_id) {
        return sendError(res, `Document is assigned to department: ${latestTransitTrail.to_department}, not your department: ${user.department_id}`, 403);
      }

      // Check if user's department is in the workflow
      const documentWithDetails = await this.documentReleaseService['prisma'].document.findUnique({
        where: { document_id: id },
        include: { DocumentAdditionalDetails: true }
      });

      const detail = documentWithDetails?.DocumentAdditionalDetails?.[0];
      if (detail && detail.work_flow_id) {
        let workflowDepartments: string[] = [];

        try {
          if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
            const values = Object.values(detail.work_flow_id);
            workflowDepartments = values.map(val => String(val));
          } else if (typeof detail.work_flow_id === 'string') {
            const parsed = JSON.parse(detail.work_flow_id);
            if (Array.isArray(parsed)) {
              workflowDepartments = parsed.map(val => String(val));
            } else {
              const values = Object.values(parsed);
              workflowDepartments = values.map(val => String(val));
            }
          } else if (Array.isArray(detail.work_flow_id)) {
            workflowDepartments = detail.work_flow_id.map(val => String(val));
          }
        } catch (e) {
          console.error('Error parsing work_flow_id:', e);
        }

        if (!workflowDepartments.includes(user.department_id)) {
          return sendError(res, `Your department (${user.department_id}) is not in the document's workflow`, 403);
        }
      }

      return sendError(res, 'You do not have permission to receive this document', 403);
    }

    const result = await this.documentReleaseService.receiveDocument(id, authReq.user.id);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to receive document', 500);
    }

    return sendSuccess(res, result.data, 200);
  });

  /**
   * Helper method to check if user can access document
   * This is a simplified version - in a real application this would have more comprehensive checks
   */
  private async checkUserCanAccessDocument(documentId: string, userId: string): Promise<boolean> {
    // Get user's department
    const user = await this.documentReleaseService['prisma'].user.findUnique({
      where: { user_id: userId },
      select: { department_id: true }
    });

    if (!user) return false;

    // Get document details
    const document = await this.documentReleaseService['prisma'].document.findUnique({
      where: { document_id: documentId },
      include: { DocumentAdditionalDetails: true }
    });

    if (!document) return false;

    if (document.status !== 'intransit') {
      return false;
    }

    const latestTransitTrail = await this.documentReleaseService['prisma'].documentTrail.findFirst({
      where: {
        document_id: documentId,
        status: 'intransit'
      },
      orderBy: {
        created_at: 'desc'
      },
      select: {
        to_department: true
      }
    });

    if (latestTransitTrail?.to_department && latestTransitTrail.to_department !== user.department_id) {
      return false;
    }

    // Check if user's department is in the workflow or is the next department to receive the document
    const detail = document.DocumentAdditionalDetails?.[0];
    if (detail && detail.work_flow_id) {
      try {
        let workflowDepartments: string[] = [];

        if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
          // New format: object with keys like "first", "second", etc.
          const values = Object.values(detail.work_flow_id);
          workflowDepartments = values.map(val => String(val));
        } else if (typeof detail.work_flow_id === 'string') {
          // Could be either a JSON string of an array or a JSON string of an object
          const parsed = JSON.parse(detail.work_flow_id);
          if (Array.isArray(parsed)) {
            workflowDepartments = parsed.map(val => String(val));
          } else {
            // If it's an object, get its values
            const values = Object.values(parsed);
            workflowDepartments = values.map(val => String(val));
          }
        } else if (Array.isArray(detail.work_flow_id)) {
          // Old format: array
          workflowDepartments = detail.work_flow_id.map(val => String(val));
        } else {
          // Unexpected format
          workflowDepartments = [];
        }

        return workflowDepartments.includes(user.department_id);
      } catch (e) {
        console.error('Error parsing work_flow_id:', e);
        return false;
      }
    }

    // Also check if the user's department is in the workflow
    if (detail && detail.work_flow_id) {
      try {
        const workflow = Array.isArray(detail.work_flow_id)
          ? detail.work_flow_id
          : JSON.parse(detail.work_flow_id as any);
        return workflow.includes(user.department_id);
      } catch (e) {
        console.error('Error parsing workflow:', e);
        return false;
      }
    }

    return false;
  }
}
