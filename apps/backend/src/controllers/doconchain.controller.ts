import { Request, Response } from 'express';
import {
  DoconchainError,
  DoconchainService,
  SignerMarkPayload,
  SignerPayload,
  UpdateSignerMarkPayload,
  UpdateSignerPayload,
} from '../services/doconchain.service';
import { asyncHandler } from '../middleware/error-handler';
import { sendSuccess, sendError } from '../utils/response';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export class DoconchainController {
  constructor(private readonly doconchainService: DoconchainService = new DoconchainService()) {}

  private handleError(res: Response, error: unknown, fallbackMessage: string) {
    if (error instanceof DoconchainError) {
      console.error('[DocOnChain] API error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error.details,
      });

      return sendError(
        res,
        error.message || fallbackMessage,
        error.status ?? 500,
        error.code,
        error.details
      );
    }

    console.error('[DocOnChain] Unexpected error:', error);
    return sendError(res, fallbackMessage, 500);
  }

  private parseBoolean(value: any): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
      if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    }

    return Boolean(value);
  }

  /**
   * POST /api/doconchain/projects - Create new project
   */
  createProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return sendError(res, 'File is required', 400);
    }

    try {
      const project = await this.doconchainService.createProject(
        req.file.buffer,
        req.file.originalname,
        {
          projectName: req.body.project_name,
          description: req.body.description,
          userListEditable: this.parseBoolean(req.body.user_list_editable),
          emailSubject: req.body.email_subject,
          emailMessage: req.body.email_message,
        }
      );

      return sendSuccess(res, project, 201);
    } catch (error) {
      return this.handleError(res, error, 'Failed to create DocOnChain project');
    }
  });

  /**
   * POST /api/doconchain/projects/:uuid/signers - Add signer to project
   */
  addSigner = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;
    const { email, first_name, last_name, signer_role } = req.body;

    if (!email || !first_name || !last_name || !signer_role) {
      return sendError(res, 'Missing required fields: email, first_name, last_name, signer_role', 400);
    }

    const signerData: SignerPayload = {
      email,
      first_name,
      last_name,
      signer_role,
      type: req.body.type || 'GUEST',
      sequence: req.body.sequence ? Number(req.body.sequence) : undefined,
      company: req.body.company,
      job_title: req.body.job_title,
      country: req.body.country,
      project_role: req.body.project_role,
      project_role_id: req.body.project_role_id ? Number(req.body.project_role_id) : undefined,
    };

    try {
      const result = await this.doconchainService.addSigner(uuid, signerData);
      return sendSuccess(res, result, 201);
    } catch (error) {
      return this.handleError(res, error, 'Failed to add DocOnChain signer');
    }
  });

  /**
   * PUT /api/doconchain/projects/:uuid/signers/:signerId - Update signer
   */
  updateSigner = asyncHandler(async (req: Request, res: Response) => {
    const { uuid, signerId } = req.params;

    const payload: UpdateSignerPayload = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      signer_role: req.body.signer_role,
      sequence: req.body.sequence ? Number(req.body.sequence) : undefined,
      project_role: req.body.project_role,
      project_role_id: req.body.project_role_id ? Number(req.body.project_role_id) : undefined,
      company: req.body.company,
      job_title: req.body.job_title,
    };

    try {
      const result = await this.doconchainService.updateSigner(uuid, signerId, payload);
      return sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'Failed to update DocOnChain signer');
    }
  });

  /**
   * DELETE /api/doconchain/projects/:uuid/signers/:signerId - Remove signer
   */
  removeSigner = asyncHandler(async (req: Request, res: Response) => {
    const { uuid, signerId } = req.params;

    try {
      const result = await this.doconchainService.removeSigner(uuid, signerId);
      return sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'Failed to remove DocOnChain signer');
    }
  });

  /**
   * POST /api/doconchain/projects/:uuid/signers/:signerId/properties - Add signer mark
   */
  addSignerMark = asyncHandler(async (req: Request, res: Response) => {
    const { uuid, signerId } = req.params;

    const payload: SignerMarkPayload = {
      type: req.body.type,
      position_x: Number(req.body.position_x),
      position_y: Number(req.body.position_y),
      width: Number(req.body.width),
      height: Number(req.body.height),
      page_no: req.body.page_no,
      value: req.body.value,
      font_style: req.body.font_style,
      font_size: req.body.font_size ? Number(req.body.font_size) : undefined,
      attach: req.body.attach !== undefined ? Number(req.body.attach) : undefined,
    };

    try {
      const result = await this.doconchainService.addSignerMark(uuid, signerId, payload);
      return sendSuccess(res, result, 201);
    } catch (error) {
      return this.handleError(res, error, 'Failed to create DocOnChain signer mark');
    }
  });

  /**
   * PUT /api/doconchain/signers/:signerId/properties/:propertyId - Update signer mark
   */
  updateSignerMark = asyncHandler(async (req: Request, res: Response) => {
    const { signerId, propertyId } = req.params;

    const payload: UpdateSignerMarkPayload = {
      position_x: req.body.position_x !== undefined ? Number(req.body.position_x) : undefined,
      position_y: req.body.position_y !== undefined ? Number(req.body.position_y) : undefined,
      width: req.body.width !== undefined ? Number(req.body.width) : undefined,
      height: req.body.height !== undefined ? Number(req.body.height) : undefined,
      page_no: req.body.page_no,
      type: req.body.type,
      value: req.body.value,
      font_style: req.body.font_style,
      font_size: req.body.font_size !== undefined ? Number(req.body.font_size) : undefined,
      attach: req.body.attach !== undefined ? Number(req.body.attach) : undefined,
    };

    try {
      const result = await this.doconchainService.updateSignerMark(signerId, propertyId, payload);
      return sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'Failed to update DocOnChain signer mark');
    }
  });

  /**
   * DELETE /api/doconchain/signers/:signerId/properties/:propertyId - Remove signer mark
   */
  removeSignerMark = asyncHandler(async (req: Request, res: Response) => {
    const { signerId, propertyId } = req.params;

    try {
      const result = await this.doconchainService.removeSignerMark(signerId, propertyId);
      return sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'Failed to delete DocOnChain signer mark');
    }
  });

  /**
   * POST /api/doconchain/projects/:uuid/send - Send project to recipients
   */
  sendProject = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;

    try {
      const result = await this.doconchainService.sendProject(uuid);
      return sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'Failed to send DocOnChain project');
    }
  });

  /**
   * GET /api/doconchain/projects/:uuid - Retrieve project details
   */
  getProject = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;

    try {
      const result = await this.doconchainService.getProject(uuid);
      return sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'Failed to fetch DocOnChain project');
    }
  });

  /**
   * GET /api/doconchain/projects/:uuid/passport - Retrieve DocOnChain passport data
   */
  getProjectPassport = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;
    const view = (req.query.view as string) || 'blockchain';

    if (!['history', 'blockchain', 'user_data', 'verifiable_presentation', 'certificate_url'].includes(view)) {
      return sendError(res, 'Invalid passport view requested', 400);
    }

    try {
      const result = await this.doconchainService.getProjectPassport(uuid, view as any);
      return sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'Failed to fetch DocOnChain passport');
    }
  });

  /**
   * GET /api/doconchain/projects/metrics - Retrieve project metrics snapshot
   */
  getProjectMetrics = asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await this.doconchainService.getProjectMetrics();
      return sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'Failed to fetch DocOnChain project metrics');
    }
  });

  /**
   * POST /api/doconchain/token - Generate token (for testing)
   */
  generateToken = asyncHandler(async (_req: Request, res: Response) => {
    try {
      const token = await this.doconchainService.generateToken();
      return sendSuccess(res, { token });
    } catch (error) {
      return this.handleError(res, error, 'Failed to generate DocOnChain token');
    }
  });

  /**
   * POST /api/doconchain/token/verify - Validate current token (for diagnostics)
   */
  verifyToken = asyncHandler(async (_req: Request, res: Response) => {
    try {
      const result = await this.doconchainService.verifyToken();
      return sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'Failed to verify DocOnChain token');
    }
  });

  /**
   * POST /api/doconchain/logout - Invalidate cached token on DocOnChain
   */
  logout = asyncHandler(async (_req: Request, res: Response) => {
    try {
      await this.doconchainService.logout();
      return sendSuccess(res, { message: 'DocOnChain session terminated' });
    } catch (error) {
      return this.handleError(res, error, 'Failed to invalidate DocOnChain token');
    }
  });

  // Middleware for file upload
  uploadMiddleware = upload.single('file');
}