import { Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { SharedDocumentService } from '../services/shared-document.service';
import { IntransitService } from '../services/intransit.service';
import { AuthRequest } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError, getPaginationParams, validateRequiredFields } from '../utils/response';
import { CreateDocumentRequest, UpdateDocumentRequest } from '../types';

export class DocumentController {
  private documentService: DocumentService;
  private sharedDocumentService: SharedDocumentService;
  private intransitService: IntransitService;

  constructor() {
    this.documentService = new DocumentService();
    this.sharedDocumentService = new SharedDocumentService();
    this.intransitService = new IntransitService();
  }

  // Helper method to extract string value from potentially array parameter
  private getStringValue = (param: string | string[] | undefined): string | undefined => {
    if (Array.isArray(param)) {
      return param[0];
    }
    return param;
  };

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
   * GET /api/documents/sidebar-counts - Get sidebar document counts
   */
  getSidebarCounts = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user.id;

    const [pendingDocuments, ownedPendingDocuments, incomingResult, sharedResult] =
      await Promise.all([
        this.documentService.getPendingDocumentsCount(userId),
        this.documentService.getOwnedPendingDocumentsCount(userId),
        this.intransitService.getIncomingDocuments(userId, 1, 1),
        this.sharedDocumentService.getSharedDocuments(userId, 1, 1),
      ]);

    const incomingInTransitDocuments = incomingResult.pagination?.total ?? 0;
    const sharedDocuments = sharedResult.pagination?.total ?? 0;

    return sendSuccess(res, {
      pendingDocuments,
      ownedPendingDocuments,
      incomingInTransitDocuments,
      sharedDocuments,
    });
  });

  /**
   * GET /api/documents/:id - Get document by ID
   */
  getDocumentById = asyncHandler(async (req: Request, res: Response) => {
    // Helper function to extract string value from potentially array parameter
    const getStringValue = (param: string | string[] | undefined): string | undefined => {
      if (Array.isArray(param)) {
        return param[0]; // Take the first value if it's an array
      }
      return param;
    };
    
    const { id } = req.params;
    const idStr = getStringValue(id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!idStr || !uuidRegex.test(idStr)) {
      console.log('📍 [DocumentController.getDocumentById] Invalid document ID format:', idStr);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const document = await this.documentService.getDocumentById(idStr);

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

    const { enableOcr } = req.body;

    const document = await this.documentService.createDocumentWithFile(
      req.body,
      (req as any).file,
      authReq.user.id,
      enableOcr === 'true'
    );

    return sendSuccess(res, document, 201);
  });

  /**
   * POST /api/documents/:id/files - Upload multiple files to existing document
   */
  uploadFilesToDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    // Helper function to extract string value from potentially array parameter
    const getStringValue = (param: string | string[] | undefined): string | undefined => {
      if (Array.isArray(param)) {
        return param[0]; // Take the first value if it's an array
      }
      return param;
    };
    
    const { id } = req.params;
    const idStr = getStringValue(id);
    const files = (req as any).files as Express.Multer.File[] | undefined;
    const { versionGroupId, enableOcr } = req.body; // Get versionGroupId and enableOcr from request body if provided

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!idStr || !uuidRegex.test(idStr)) {
      console.log('📍 [DocumentController.uploadFilesToDocument] Invalid document ID format:', idStr);
      return sendError(res, 'Invalid document ID format', 400);
    }

    if (!files || files.length === 0) {
      return sendError(res, 'At least one file is required', 400);
    }

    const uploaded = await this.documentService.uploadFilesToDocument(
      idStr,
      files,
      authReq.user.id,
      versionGroupId,
      enableOcr === 'true'
    );

    return sendSuccess(res, uploaded, 201);
  });

  /**
   * PUT /api/documents/:id/files/:fileId - Replace an existing document file
   */
  replaceDocumentFile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    // Helper function to extract string value from potentially array parameter
    const getStringValue = (param: string | string[] | undefined): string | undefined => {
      if (Array.isArray(param)) {
        return param[0]; // Take the first value if it's an array
      }
      return param;
    };
    
    const { id, fileId } = req.params;
    const idStr = getStringValue(id);
    const fileIdStr = getStringValue(fileId);
    const file = (req as any).file as Express.Multer.File | undefined;

    // Validate UUID format for document id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!idStr || !uuidRegex.test(idStr)) {
      console.log('📍 [DocumentController.replaceDocumentFile] Invalid document ID format:', idStr);
      return sendError(res, 'Invalid document ID format', 400);
    }
    if (!fileIdStr) {
      return sendError(res, 'Invalid file ID format', 400);
    }

    if (!file) {
      return sendError(res, 'File upload is required', 400);
    }

    const updated = await this.documentService.replaceDocumentFile(
      idStr,
      fileIdStr,
      file,
      authReq.user.id
    );

    return sendSuccess(res, updated, 200);
  });

  /**
   * GET /api/documents/:id/files - List document files
   */
  getDocumentFiles = asyncHandler(async (req: Request, res: Response) => {
    const id = this.getStringValue(req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
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
    const id = this.getStringValue(req.params.id);
    const fileId = this.getStringValue(req.params.fileId);

    // Validate UUID format for document id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      console.log('📍 [DocumentController.downloadDocumentFile] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }
    if (!fileId) {
      return sendError(res, 'Invalid file ID format', 400);
    }

    const file = await this.documentService.downloadDocumentFile(id, fileId);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);

    file.stream.on('error', (error: Error) => {
      console.error('File stream error:', error);
      res.destroy(error);
    });
    file.stream.pipe(res);
  });

  /**
   * GET /api/documents/:id/files/:fileId/stream - Stream file inline for preview
   */
  streamDocumentFile = asyncHandler(async (req: Request, res: Response) => {
    const id = this.getStringValue(req.params.id);
    const fileId = this.getStringValue(req.params.fileId);

    // Validate UUID format for document id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      console.log('📍 [DocumentController.streamDocumentFile] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }
    if (!fileId) {
      return sendError(res, 'Invalid file ID format', 400);
    }

    const file = await this.documentService.downloadDocumentFile(id, fileId);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    file.stream.on('error', (error: Error) => {
      console.error('File stream error:', error);
      res.destroy(error);
    });
    file.stream.pipe(res);
  });

  /**
   * DELETE /api/documents/:id/files/:fileId - Remove file from document
   */
  deleteDocumentFile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const id = this.getStringValue(req.params.id);
    const fileId = this.getStringValue(req.params.fileId);

    // Validate UUID format for document id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      console.log('📍 [DocumentController.deleteDocumentFile] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }
    if (!fileId) {
      return sendError(res, 'Invalid file ID format', 400);
    }

    await this.documentService.deleteDocumentFile(id, fileId, authReq.user.id);

    return sendSuccess(res, { message: 'File deleted successfully' });
  });

  /**
   * PUT /api/documents/:id - Update document
   */
  updateDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const id = this.getStringValue(req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
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
    const id = this.getStringValue(req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
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
    const authReq = req as AuthRequest;
    const { q: query } = req.query;

    if (!query || typeof query !== 'string') {
      return sendError(res, 'Search query is required', 400);
    }

    const documents = await this.documentService.searchDocuments(
      query,
      authReq.user.id
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
    const id = this.getStringValue(req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
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
   * POST /api/documents/:id/uncomplete - Revert a completed document back to pending
   */
  uncompleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const id = this.getStringValue(req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      console.log('📍 [DocumentController.uncompleteDocument] Invalid document ID format:', id);
      return sendError(res, 'Invalid document ID format', 400);
    }

    const existingDocument = await this.documentService.getDocumentById(id);
    if (!existingDocument) {
      return sendError(res, 'Document not found', 404);
    }

    const canAccess = await this.documentService.canUserAccessDocument(id, authReq.user.id);
    if (!canAccess) {
      return sendError(res, 'You do not have permission to modify this document', 403);
    }

    const result = await this.documentService.uncompleteDocument(id, authReq.user.id);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to uncomplete document', 500);
    }

    return sendSuccess(res, result.data, 200);
  });

  /**
   * POST /api/documents/:id/cancel - Cancel a document
   */
  cancelDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const id = this.getStringValue(req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
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
    const id = this.getStringValue(req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
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
   * POST /api/documents/:id/sign-from-placeholder - Creates a signature from a placeholder
   */
  signFromPlaceholders = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const id = this.getStringValue(req.params.id);
    const { signatureData } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return sendError(res, 'Invalid document ID format', 400);
    }

    if (!signatureData) {
      return sendError(res, 'signatureData is required.', 400);
    }

    const result = await this.documentService.signDocumentFromPlaceholders(id, authReq.user.id, signatureData);

    return sendSuccess(res, { message: `Successfully signed ${result.signedCount} placeholder(s).` }, 200);
  });

  /**
   * POST /api/documents/:id/sign - Sign document with blockchain
   */
  signDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const id = this.getStringValue(req.params.id);
    const { signature, primarySigner, additionalSigners, marks, sendEmail } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
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
    const id = this.getStringValue(req.params.id);
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
    if (!id || !uuidRegex.test(id)) {
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

  /**
   * POST /api/documents/:id/sign-manual - Manually sign a document with coordinates
   */
  createSignedDocument = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const documentId = this.getStringValue(req.params.id);
    const { signatureData, x_position, y_position, width, height, page_number } = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!documentId || !uuidRegex.test(documentId)) {
      return sendError(res, 'Invalid document ID format', 400);
    }

    // Basic validation for required fields
    const missingFields = validateRequiredFields(req.body, [
      'signatureData', 'x_position', 'y_position', 'width', 'height', 'page_number'
    ]);
    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }

    // Ensure coordinates and page number are valid numbers
    if (
      typeof x_position !== 'number' || isNaN(x_position) ||
      typeof y_position !== 'number' || isNaN(y_position) ||
      typeof width !== 'number' || isNaN(width) ||
      typeof height !== 'number' || isNaN(height) ||
      typeof page_number !== 'number' || isNaN(page_number) || page_number < 1
    ) {
      return sendError(res, 'Invalid signature placement coordinates or page number.', 400);
    }

    // Ensure there is a file to attach the signature to
    const documentFiles = await this.documentService.getFilesForDocument(documentId);
    if (!documentFiles || documentFiles.length === 0) {
      return sendError(res, 'No document files found to attach signature.', 400);
    }

    const result = await this.documentService.createSignedDocument(
      documentId,
      authReq.user.id,
      signatureData,
      x_position,
      y_position,
      width,
      height,
      page_number
    );

    if (!result.success) {
      return sendError(res, result.error || 'Failed to create signed document', 500);
    }

    return sendSuccess(res, { message: 'Document signed successfully', signedDocument: result.data }, 201);
  });

  getDocumentOcrData = asyncHandler(async (req: Request, res: Response) => {
    const id = this.getStringValue(req.params.id);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return sendError(res, 'Invalid document ID format', 400);
    }

    try {
      const ocrData = await this.documentService.getDocumentOcrData(id);

      if (!ocrData || ocrData.length === 0) {
        return sendSuccess(res, { ocrData: [], message: 'No OCR data found for this document' });
      }

      return sendSuccess(res, { ocrData });
    } catch (error) {
      console.error('Error fetching OCR data:', error);
      return sendError(res, 'Failed to fetch OCR data', 500);
    }
  });
}
