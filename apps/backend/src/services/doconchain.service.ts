import axios, { AxiosError, AxiosInstance } from 'axios';
import FormData from 'form-data';
import config from '../config';

export type SignerRole = 'Signer' | 'Approver' | 'Viewer' | 'Issuee';

export interface DoconchainConfig {
  baseUrl: string;
  clientKey: string;
  clientSecret: string;
  clientEmail?: string;
  userType: string;
  defaultTokenTtl: number;
}

export interface TokenResponsePayload {
  token: string;
  expires_in?: number;
  expires?: number;
}

export interface CreateProjectOptions {
  projectName?: string;
  description?: string;
  userListEditable?: boolean;
  emailSubject?: string;
  emailMessage?: string;
}

export interface SignerPayload {
  email: string;
  first_name: string;
  last_name: string;
  signer_role: SignerRole;
  type?: 'GUEST' | 'USER';
  sequence?: number;
  company?: string;
  job_title?: string;
  country?: string;
  project_role?: string;
  project_role_id?: number;
}

export interface UpdateSignerPayload {
  first_name?: string;
  last_name?: string;
  sequence?: number;
  signer_role?: SignerRole | 'Creator';
  project_role?: string;
  project_role_id?: number;
  company?: string;
  job_title?: string;
}

export interface SignerMarkPayload {
  type: 'signature' | 'initial' | 'text' | 'date' | 'checkbox' | 'radio';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  page_no: string | number;
  value?: string;
  font_style?: string;
  font_size?: number;
  attach?: number;
}

export interface UpdateSignerMarkPayload extends Partial<SignerMarkPayload> {}

export interface CreateProjectResponseData {
  project_uuid?: string;
  uuid?: string;
  transaction_hash?: string;
  status?: string;
  redirect_url?: string;
  redirect_to?: string;
  created_at?: string;
}

export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: unknown;
  [key: string]: unknown;
}

export interface ApiResult<T> {
  data: T;
  raw: ApiEnvelope<T> | T;
}

export class DoconchainError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(message: string, options: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'DoconchainError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export class DoconchainService {
  private readonly axiosInstance: AxiosInstance;
  private readonly config: DoconchainConfig;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(overrides: Partial<DoconchainConfig> = {}) {
    const runtimeConfig = config.doconChain || {};

    this.config = {
      baseUrl: overrides.baseUrl || runtimeConfig.baseUrl || 'https://stg-api2.doconchain.com',
      clientKey: overrides.clientKey || runtimeConfig.clientKey || '',
      clientSecret: overrides.clientSecret || runtimeConfig.clientSecret || '',
      clientEmail: overrides.clientEmail || runtimeConfig.clientEmail || undefined,
      userType: overrides.userType || runtimeConfig.userType || 'ENTERPRISE_API',
      defaultTokenTtl: overrides.defaultTokenTtl || runtimeConfig.defaultTokenTtl || 3300,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        accept: 'application/json',
      },
    });
  }

  /** Ensure a valid bearer token is available, refreshing when needed. */
  private async ensureValidToken(): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    return this.generateToken();
  }

  /** Generate a new authentication token. */
  async generateToken(): Promise<string> {
    if (!this.config.clientKey || !this.config.clientSecret) {
      throw new DoconchainError('DocOnChain credentials are not configured');
    }

    const formData = new FormData();
    formData.append('client_key', this.config.clientKey);
    formData.append('client_secret', this.config.clientSecret);

    if (this.config.clientEmail) {
      formData.append('email', this.config.clientEmail);
    }

    try {
      const response = await this.axiosInstance.post<ApiEnvelope<TokenResponsePayload> | TokenResponsePayload>(
        '/api/v2/generate/token',
        formData,
        { headers: formData.getHeaders() }
      );

      const payload = this.unwrapData(response.data);
      const expiresInSeconds = payload.expires_in || payload.expires || this.config.defaultTokenTtl;

      this.token = payload.token;
      this.tokenExpiry = new Date(Date.now() + expiresInSeconds * 1000);

      return this.token;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Verify that the current or provided token is valid. */
  async verifyToken(token?: string): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = token || (await this.ensureValidToken());

    try {
      const response = await this.axiosInstance.post('/api/v2/auth/verify', {}, {
        params: { user_type: this.config.userType },
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Invalidate the current token on DocOnChain and locally. */
  async logout(): Promise<void> {
    const authToken = await this.ensureValidToken();

    try {
      await this.axiosInstance.post('/api/v2/api_generation/logout', {}, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      this.token = null;
      this.tokenExpiry = null;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Upload a document and create a DocOnChain project. */
  async createProject(file: Buffer, fileName: string, options: CreateProjectOptions = {}): Promise<ApiResult<CreateProjectResponseData>> {
    const authToken = await this.ensureValidToken();

    const formData = new FormData();
    formData.append('file', file, { filename: fileName });
    formData.append('user_list_editable', String(options.userListEditable ?? true));

    if (options.projectName) {
      formData.append('project_name', options.projectName);
    }

    if (options.description) {
      formData.append('description', options.description);
    }

    if (options.emailSubject) {
      formData.append('email_subject', options.emailSubject);
    }

    if (options.emailMessage) {
      formData.append('email_message', options.emailMessage);
    }

    try {
      const response = await this.axiosInstance.post<ApiEnvelope<CreateProjectResponseData> | CreateProjectResponseData>(
        '/api/v2/projects',
        formData,
        {
          params: { user_type: this.config.userType },
          headers: {
            Authorization: `Bearer ${authToken}`,
            ...formData.getHeaders(),
          },
        }
      );

      const data = this.unwrapData(response.data);
      return { data, raw: response.data };
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Retrieve project details by UUID. */
  async getProject(uuid: string): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.get(`/my/projects/${uuid}`, {
        params: { user_type: this.config.userType },
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Add a signer to a project. */
  async addSigner(projectUuid: string, signerData: SignerPayload): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.post(`/projects/${projectUuid}/signers`, signerData, {
        params: { user_type: this.config.userType },
        headers: {
          Authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Update signer information. */
  async updateSigner(projectUuid: string, signerId: number | string, payload: UpdateSignerPayload): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.put(`/projects/${projectUuid}/signers/${signerId}`, payload, {
        params: { user_type: this.config.userType },
        headers: {
          Authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Remove a signer from a project. */
  async removeSigner(projectUuid: string, signerId: number | string): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.delete(`/projects/${projectUuid}/signers/${signerId}`, {
        params: { user_type: this.config.userType },
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Assign a signature mark to a signer. */
  async addSignerMark(projectUuid: string, signerId: number | string, payload: SignerMarkPayload): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.post(`/projects/${projectUuid}/signers/${signerId}/properties`, payload, {
        params: { user_type: this.config.userType },
        headers: {
          Authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Update an existing signer mark. */
  async updateSignerMark(signerId: number | string, propertyId: number | string, payload: UpdateSignerMarkPayload): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.put(`/projects/signers/${signerId}/properties/${propertyId}`, payload, {
        params: { user_type: this.config.userType },
        headers: {
          Authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Delete a signer mark. */
  async removeSignerMark(signerId: number | string, propertyId: number | string): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.delete(`/projects/signers/${signerId}/properties/${propertyId}`, {
        params: { user_type: this.config.userType },
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Send the project to recipients to start the signing workflow. */
  async sendProject(projectUuid: string): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.post(`/my/projects/${projectUuid}/send`, {}, {
        params: { user_type: this.config.userType },
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Fetch the DocOnChain passport for a project (audit trail, blockchain data, certificates). */
  async getProjectPassport<T = unknown>(projectUuid: string, view: 'history' | 'blockchain' | 'user_data' | 'verifiable_presentation' | 'certificate_url'): Promise<ApiEnvelope<T> | T> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.get<ApiEnvelope<T> | T>(`/api/v2/projects/${projectUuid}/passport`, {
        params: {
          user_type: this.config.userType,
          view,
        },
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Retrieve counts of processing/completed projects. */
  async getProjectMetrics(): Promise<ApiEnvelope<unknown> | unknown> {
    const authToken = await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.get('/api/v2/projects/processing/all-files', {
        params: { user_type: this.config.userType },
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return response.data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /** Helper to unwrap API responses that nest data inside a `data` property. */
  private unwrapData<T>(payload: ApiEnvelope<T> | T): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      const envelope = payload as ApiEnvelope<T>;
      if (envelope.data !== undefined) {
        return envelope.data;
      }
    }

    return payload as T;
  }

  /** Normalize Axios errors into domain-specific errors. */
  private handleAxiosError(error: unknown): never {
    if (error instanceof DoconchainError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const responseData = axiosError.response?.data as Record<string, any> | undefined;
      const message = responseData?.message || responseData?.error?.message || axiosError.message || 'DocOnChain request failed';
      const code = responseData?.error?.code || axiosError.code;

      throw new DoconchainError(message, {
        status,
        code,
        details: responseData,
      });
    }

    if (error instanceof Error) {
      throw new DoconchainError(error.message);
    }

    throw new DoconchainError('Unknown DocOnChain error');
  }
}