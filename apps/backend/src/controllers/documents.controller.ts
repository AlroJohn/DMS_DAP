import { Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { SharedDocumentService } from '../services/shared-document.service';
import { AuthRequest } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError, getPaginationParams, validateRequiredFields } from '../utils/response';
import { CreateDocumentRequest, UpdateDocumentRequest } from '../types';
import fs from 'fs';

export class DocumentController {
  private documentService: DocumentService;
  private sharedDocumentService: SharedDocumentService;

  constructor() {
    this.documentService = new DocumentService();
    this.sharedDocumentService = new SharedDocumentService();
  }

  /**
   * GET /api/documents - Get all documents with pagination
   */
  getAllDocuments = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { page, limit, sortBy, sortOrder } = getPaginationParams(req);

    // console.log('📍 [DocumentController.getAllDocuments] Request from user:', authReq.user.id);

    const result = await this.documentService.getAllDocuments(
      authReq.user.id,
      page,
      limit,
      sortBy,
      sortOrder
    );

    // console.log('📍 [DocumentController.getAllDocuments] Returning', result.data.length, 'documents');

    return sendSuccess(res, result.data, 200, {
      pagination: result.pagination
    });
  });

  /**
   * GET /api/documents/:id - Get document by ID
   */
  getDocumentById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.getDocumentById] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const document = await this.documentService.getDocumentById(id);

    if (!document) {
      return sendError(res, 'Document not found', 404);
    }

    return sendSuccess(res, document);
  });

  /**
   * POST /api/documents - Create new document
   */
  createDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const requiredFields = ['document_name', 'classification', 'type_id', 'origin', 'delivery'];
    const missingFields = validateRequiredFields(req.body, requiredFields);

    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const { document_name, classification, type_id, origin, delivery } = req.body;

    const documentData = {
      document_name,
      classification,
      type_id,
      origin,
      delivery
    };

    const newDocument = await this.documentService.createDocument(documentData, authReq.user.id);

    return sendSuccess(res, newDocument, 201);
  });

  /**
   * POST /api/documents/upload - Create document with single file upload
   */
  createDocumentWithFile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;

    if (!(req as any).file) {
      return sendError(res, 'File upload is required', 400);
    }

    const requiredFields = ['document_name', 'classification', 'type_id', 'origin'];
    const missingFields = validateRequiredFields(req.body, requiredFields);

    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const document = await this.documentService.createDocumentWithFile(
      req.body,
      (req as any).file,
      authReq.user.id
    );

    return sendSuccess(res, document, 201);
  });

  /**
   * POST /api/documents/:id/files - Upload multiple files to existing document
   */
  uploadFilesToDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const files = (req as any).files as Express.Multer.File[] | undefined;
    const { versionGroupId } = req.body; // Get versionGroupId from request body if provided

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.uploadFilesToDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    if (!files || files.length === 0) {
      return sendError(res, 'At least one file is required', 400);
    }

    const uploaded = await this.documentService.uploadFilesToDocument(
      id,
      files,
      authReq.user.id,
      versionGroupId
    );

    return sendSuccess(res, uploaded, 201);
  });

  /**
   * GET /api/documents/:id/files - List document files
   */
  getDocumentFiles = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.getDocumentFiles] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const files = await this.documentService.getFilesForDocument(id);

    return sendSuccess(res, files);
  });

  /**
   * GET /api/documents/:id/files/:fileId/download - Download file
   */
  downloadDocumentFile = asyncHandler(async (req: Request, res: Response) => {
    const { id, fileId } = req.params;

    // Validate UUID format for document id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.downloadDocumentFile] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const file = await this.documentService.downloadDocumentFile(id, fileId);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);

    const stream = fs.createReadStream(file.filePath);
    stream.on('error', (error) => {
      console.error('File stream error:', error);
      res.destroy(error);
    });
    stream.pipe(res);
  });

  /**
   * GET /api/documents/:id/files/:fileId/stream - Stream file inline for preview
   */
  streamDocumentFile = asyncHandler(async (req: Request, res: Response) => {
    const { id, fileId } = req.params;

    // Validate UUID format for document id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.streamDocumentFile] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const file = await this.documentService.downloadDocumentFile(id, fileId);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = fs.createReadStream(file.filePath);
    stream.on('error', (error) => {
      console.error('File stream error:', error);
      res.destroy(error);
    });
    stream.pipe(res);
  });

  /**
   * DELETE /api/documents/:id/files/:fileId - Remove file from document
   */
  deleteDocumentFile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id, fileId } = req.params;

    // Validate UUID format for document id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.deleteDocumentFile] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    await this.documentService.deleteDocumentFile(id, fileId, authReq.user.id);

    return sendSuccess(res, { message: 'File deleted successfully' });
  });

  /**
   * PUT /api/documents/:id - Update document
   */
  updateDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.updateDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const existingDocument = await this.documentService.getDocumentById(id);
    if (!existingDocument) {
      return sendError(res, 'Document not found', 404);
    }

    const canAccess = await this.documentService.canUserAccessDocument(id, authReq.user.id);
    if (!canAccess) {
      return sendError(res, 'You do not have permission to update this document', 403);
    }

    const updateData: UpdateDocumentRequest = {
      name: req.body.name,
      content: req.body.content
    };

    const updatedDocument = await this.documentService.updateDocument(id, updateData, authReq.user.id);

    return sendSuccess(res, updatedDocument);
  });

  /**
   * DELETE /api/documents/:id - Delete document
   */
  deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.deleteDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const existingDocument = await this.documentService.getDocumentById(id);
    if (!existingDocument) {
      return sendError(res, 'Document not found', 404);
    }

    const canAccess = await this.documentService.canUserAccessDocument(id, authReq.user.id);
    if (!canAccess) {
      return sendError(res, 'You do not have permission to delete this document', 403);
    }

    const deleted = await this.documentService.deleteDocument(id, authReq.user.id);

    if (!deleted) {
      return sendError(res, 'Failed to delete document', 500);
    }

    return sendSuccess(res, null, 204);
  });



  /**
   * POST /api/documents/scan - Scan a directory and create documents
   */
  scanDocuments = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { directoryPath } = req.body;

    if (!directoryPath) {
      return sendError(res, 'directoryPath is required', 400);
    }

    const createdDocuments = await this.documentService.scanDocuments(directoryPath, authReq.user.id);

    return sendSuccess(res, {
      message: `Scan complete. ${createdDocuments.length} documents created.`,
      createdDocuments,
    }, 201);
  });

  /**
   * GET /api/documents/search - Search documents
   */
  searchDocuments = asyncHandler(async (req: Request, res: Response) => {
    const { q: query, userId } = req.query;

    if (!query || typeof query !== 'string') {
      return sendError(res, 'Search query is required', 400);
    }

    const documents = await this.documentService.searchDocuments(
      query,
      userId as string
    );

    return sendSuccess(res, documents);
  });

  /**
   * GET /api/documents/owned - Get documents owned by the current user
   */
  getOwnedDocuments = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { page, limit } = getPaginationParams(req);

    // console.log('📍 [DocumentController.getOwnedDocuments] Request from user:', authReq.user.id);

    const result = await this.documentService.getOwnedDocuments(
      authReq.user.id,
      page,
      limit
    );

    // console.log('📍 [DocumentController.getOwnedDocuments] Returning', result.data.length, 'documents');

    return sendSuccess(res, result.data, 200, {
      pagination: result.pagination
    });
  });

  /**
   * GET /api/documents/completed - Get all completed documents
   */
  getCompletedDocuments = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { page, limit } = getPaginationParams(req);

    const result = await this.documentService.getCompletedDocuments(
      authReq.user.id,
      page,
      limit
    );

    return sendSuccess(res, result.data, 200, {
      pagination: result.pagination
    });
  });



  /**
   * GET /api/documents/received - Get received/completed documents
   */
  getReceivedDocuments = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { page, limit } = getPaginationParams(req);

    const result = await this.documentService.getReceivedDocuments(
      authReq.user.id,
      page,
      limit
    );

    return sendSuccess(res, result.data, 200, {
      pagination: result.pagination
    });
  });

  /**
   * GET /api/documents/types - Get all document types
   */
  getDocumentTypes = asyncHandler(async (req: Request, res: Response) => {
    const types = await this.documentService.getDocumentTypes();

    return sendSuccess(res, types);
  });

  /**
   * POST /api/documents/:id/complete - Mark a document as complete
   */
  completeDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.completeDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const existingDocument = await this.documentService.getDocumentById(id);
    if (!existingDocument) {
      return sendError(res, 'Document not found', 404);
    }

    const canAccess = await this.documentService.canUserAccessDocument(id, authReq.user.id);
    if (!canAccess) {
      return sendError(res, 'You do not have permission to complete this document', 403);
    }

    const result = await this.documentService.completeDocument(id, authReq.user.id);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to complete document', 500);
    }

    return sendSuccess(res, result.data, 200);
  });

  /**
   * POST /api/documents/:id/cancel - Cancel a document
   */
  cancelDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.cancelDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const existingDocument = await this.documentService.getDocumentById(id);
    if (!existingDocument) {
      return sendError(res, 'Document not found', 404);
    }

    const canAccess = await this.documentService.canUserAccessDocument(id, authReq.user.id);
    if (!canAccess) {
      return sendError(res, 'You do not have permission to cancel this document', 403);
    }

    const result = await this.documentService.cancelDocument(id, authReq.user.id);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to cancel document', 500);
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
      console.log('📍 [DocumentController.receiveDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const existingDocument = await this.documentService.getDocumentById(id);
    if (!existingDocument) {
      return sendError(res, 'Document not found', 404);
    }

    const canAccess = await this.documentService.canUserAccessDocument(id, authReq.user.id);
    if (!canAccess) {
      return sendError(res, 'You do not have permission to receive this document', 403);
    }

    const result = await this.documentService.receiveDocument(id, authReq.user.id);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to receive document', 500);
    }

    return sendSuccess(res, result.data, 200);
  });

  /**
   * POST /api/documents/:id/sign - Sign document with blockchain
   */
  signDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { signature, primarySigner, additionalSigners, marks, sendEmail } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.signDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const normalisedAdditionalSigners = Array.isArray(additionalSigners) ? additionalSigners : [];
    const normalisedMarks = (Array.isArray(marks) ? marks : []).map((mark) => ({
      ...mark,
      pageNo: Number(mark?.pageNo),
      positionX: Number(mark?.positionX),
      positionY: Number(mark?.positionY),
      width: Number(mark?.width),
      height: Number(mark?.height)
    }));

    for (const signer of normalisedAdditionalSigners) {
      if (!signer?.email || !signer?.firstName || !signer?.lastName) {
        return sendError(res, 'Each additional signer must include email, firstName, and lastName', 400);
      }
    }

    for (const mark of normalisedMarks) {
      if (
        mark?.pageNo === undefined ||
        mark?.positionX === undefined ||
        mark?.positionY === undefined ||
        mark?.width === undefined ||
        mark?.height === undefined ||
        !mark?.type ||
        Number.isNaN(mark.pageNo) ||
        Number.isNaN(mark.positionX) ||
        Number.isNaN(mark.positionY) ||
        Number.isNaN(mark.width) ||
        Number.isNaN(mark.height)
      ) {
        return sendError(res, 'Each DocOnChain mark requires type, pageNo, positionX, positionY, width, and height', 400);
      }
    }

    console.log('📍 [DocumentController.signDocument] Request to sign document:', id, 'by user:', authReq.user.id);

    const result = await this.documentService.signDocumentWithBlockchain(id, authReq.user.id, {
      signature,
      primarySigner,
      additionalSigners: normalisedAdditionalSigners,
      marks: normalisedMarks,
      sendEmail
    });

    if (!result.success) {
      return sendError(res, result.error || 'Failed to sign document', 500);
    }

    return sendSuccess(res, result.data, 200);
  });

  /**
   * DELETE /api/documents/bulk-delete - Bulk delete documents
   */
  bulkDeleteDocuments = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return sendError(res, "Document IDs must be a non-empty array.", 400);
    }

    const result = await this.documentService.bulkDeleteDocuments(documentIds, authReq.user.id);

    return sendSuccess(res, { message: `${result.count} documents permanently deleted.` });
  });

  /**
   * POST /api/documents/:id/share - Share document with specific users
   */
  shareDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { userIds } = req.body;

    // Validate required fields
    const missingFields = validateRequiredFields(req.body, ['userIds']);
    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('📍 [DocumentController.shareDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    // Validate user IDs format
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return sendError(res, 'User IDs must be a non-empty array', 400);
    }

    for (const userId of userIds) {
      if (!uuidRegex.test(userId)) {
        return sendError(res, `Invalid user ID format: ${userId}`, 400);
      }
    }

    const result = await this.sharedDocumentService.shareDocument(id, userId, userIds);

    if (result.success) {
      return sendSuccess(res, result, 200);
    } else {
      return sendError(res, result.error || 'Failed to share document', 500);
    }
  });

}