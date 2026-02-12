import { prisma } from '../lib/prisma';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { deleteFile } from '../middleware/upload.middleware';
import { s3Storage } from './storage/s3.service';
import { DoconchainService, SignerMarkPayload, SignerPayload, SignerRole } from './doconchain.service';
import { getSocketInstance } from '../socket';
import { EmailService, DocumentCompletedEmailData } from './email.service';
import { DocumentMetadataService } from './document-metadata.service';
import { DocumentTrailsService } from './document-trails.service';
import { ProcessStatusService } from './process-status.service';
import { NotificationService } from './notification.service';
import { recordCompletionStatus, recordCreationStatus, recordReceiveStatus } from './workflow-status.service';
import { auditService } from './audit.service';
import { ocrQueueService } from './ocr-queue.service';
// Import the getSocketInstance function instead of importing io directly from index

// Create a type alias to avoid confusion with DOM Document
import type { Document as PrismaDocument } from '@prisma/client';

interface DoconchainSignerInput {
  email: string;
  firstName: string;
  lastName: string;
  signerRole?: SignerRole;
  type?: 'GUEST' | 'USER';
  sequence?: number;
  company?: string;
  jobTitle?: string;
  country?: string;
}

interface DoconchainMarkInput {
  signerEmail?: string;
  signerId?: number | string;
  type: SignerMarkPayload['type'];
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  pageNo: number;
  value?: string;
  fontStyle?: string;
  fontSize?: number;
  attach?: number;
}

interface SignDocumentOptions {
  signature?: string;
  primarySigner?: Partial<DoconchainSignerInput>;
  additionalSigners?: DoconchainSignerInput[];
  marks?: DoconchainMarkInput[];
  sendEmail?: boolean;
}

/**
 * Document Service - handles all business logic for documents
 * Adjusted to work with the existing schema
 */
export class DocumentService {
  private readonly prisma = prisma as any;
  private documentMetadataService: DocumentMetadataService;

  constructor() {
    this.documentMetadataService = new DocumentMetadataService();
  }

  private parseWorkflowDepartments(workflow: unknown, context: string): string[] {
    if (!workflow) {
      return [];
    }

    try {
      if (Array.isArray(workflow)) {
        return workflow
          .map((value) => {
            if (typeof value === 'string') return value.trim();
            if (value == null) return '';
            return String(value);
          })
          .filter((value) => value.length > 0);
      }

      if (typeof workflow === 'string') {
        const trimmed = workflow.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          return this.parseWorkflowDepartments(parsed, context);
        }
        return trimmed ? [trimmed] : [];
      }

      if (typeof workflow === 'object' && workflow !== null) {
        return Object.values(workflow)
          .map((value) => {
            if (typeof value === 'string') return value.trim();
            if (value == null) return '';
            return String(value);
          })
          .filter((value) => value.length > 0);
      }
    } catch (error) {
      console.error(`≡ƒôì [${context}] Error parsing work_flow_id:`, error);
    }

    return [];
  }

  private async buildProcessTrailTimers(params: {
    documentIds: string[];
    workflowMap?: Map<string, string[]>;
  }): Promise<{
    startAtByDocument: Map<string, Date>;
    completeAtByDocument: Map<string, Date>;
  }> {
    const { documentIds } = params;
    const startAtByDocument = new Map<string, Date>();
    const completeAtByDocument = new Map<string, Date>();

    if (documentIds.length === 0) {
      return { startAtByDocument, completeAtByDocument };
    }

    const receivedTrails = await prisma.documentTrail.findMany({
      where: {
        document_id: { in: documentIds },
        status: 'received'
      },
      select: {
        document_id: true,
        action_date: true,
        created_at: true
      }
    });

    receivedTrails.forEach((trail) => {
      const date = trail.action_date || trail.created_at;
      if (!date) return;
      const current = startAtByDocument.get(trail.document_id);
      if (!current || date < current) {
        startAtByDocument.set(trail.document_id, date);
      }
    });

    const completedTrails = await prisma.documentTrail.findMany({
      where: {
        document_id: { in: documentIds },
        status: 'completed'
      },
      select: {
        document_id: true,
        action_date: true,
        created_at: true
      }
    });

    completedTrails.forEach((trail) => {
      const date = trail.action_date || trail.created_at;
      if (!date) return;
      const existing = completeAtByDocument.get(trail.document_id);
      if (!existing || date < existing) {
        completeAtByDocument.set(trail.document_id, date);
      }
    });

    return { startAtByDocument, completeAtByDocument };
  }

  private slugifyDepartmentName(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'unknown-department';
  }

  private sanitizeFileName(name: string): string {
    const base = path.basename(name).replace(/\s+/g, '-');
    const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '');
    return cleaned || `file-${Date.now()}.bin`;
  }

  private async getDepartmentSlug(departmentId: string): Promise<string> {
    const department = await prisma.department.findUnique({
      where: { department_id: departmentId },
      select: { name: true }
    });
    return this.slugifyDepartmentName(department?.name || 'unknown');
  }

  async getPendingDocumentsCount(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { department_id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const documentDetails = await prisma.documentAdditionalDetails.findMany({
      select: {
        document_id: true,
        work_flow_id: true,
      },
    });

    const relevantDocumentIds = documentDetails
      .filter((detail: any) => {
        if (!detail.work_flow_id) {
          return true;
        }

        const workflowDepartments = this.parseWorkflowDepartments(
          detail.work_flow_id,
          'getPendingDocumentsCount'
        );
        return (
          workflowDepartments.length > 0 &&
          workflowDepartments[0] === user.department_id
        );
      })
      .map((detail: any) => detail.document_id);

    if (relevantDocumentIds.length === 0) {
      return 0;
    }

    return prisma.document.count({
      where: {
        document_id: {
          in: relevantDocumentIds,
        },
        status: 'pending',
      },
    });
  }

  async getOwnedPendingDocumentsCount(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { department_id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const documentDetails = await prisma.documentAdditionalDetails.findMany({
      select: {
        document_id: true,
        work_flow_id: true,
      },
    });

    const ownedDocumentIds = documentDetails
      .filter((detail: any) => {
        if (!detail.work_flow_id) {
          return false;
        }

        const workflowDepartments = this.parseWorkflowDepartments(
          detail.work_flow_id,
          'getOwnedPendingDocumentsCount'
        );
        return (
          workflowDepartments.length > 0 &&
          workflowDepartments[0] === user.department_id
        );
      })
      .map((detail: any) => detail.document_id);

    if (ownedDocumentIds.length === 0) {
      return 0;
    }

    return prisma.document.count({
      where: {
        document_id: {
          in: ownedDocumentIds,
        },
        status: 'pending',
      },
    });
  }

  async getDocumentCountsByStatus(userId: string): Promise<Record<string, number>> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { department_id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const documentDetails = await prisma.documentAdditionalDetails.findMany({
      select: {
        document_id: true,
        work_flow_id: true,
      },
    });

    const relevantDocumentIds = documentDetails
      .filter((detail: any) => {
        if (!detail.work_flow_id) {
          return true;
        }

        const workflowDepartments = this.parseWorkflowDepartments(
          detail.work_flow_id,
          'getDocumentCountsByStatus'
        );
        return (
          workflowDepartments.length > 0 &&
          workflowDepartments[0] === user.department_id
        );
      })
      .map((detail: any) => detail.document_id);

    if (relevantDocumentIds.length === 0) {
      return {
        pending: 0,
        received: 0,
        intransit: 0,
        intransit_signature: 0,
        signed: 0,
        completed: 0,
        cancelled: 0,
        deleted: 0,
        archive: 0,
        checkout: 0,
        checkin: 0,
      };
    }

    // Get counts for each status
    const [
      pending,
      received,
      intransit,
      intransit_signature,
      signed,
      completed,
      cancelled,
      deleted,
      archive,
      checkout,
      checkin
    ] = await Promise.all([
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'pending',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'received',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'intransit',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'intransit_signature',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'signed',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'completed',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'cancelled',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'deleted',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'archive',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'checkout',
        },
      }),
      prisma.document.count({
        where: {
          document_id: { in: relevantDocumentIds },
          status: 'checkin',
        },
      }),
    ]);

    return {
      pending,
      received,
      intransit,
      intransit_signature,
      signed,
      completed,
      cancelled,
      deleted,
      archive,
      checkout,
      checkin
    };
  }

  async getTotalOwnedDocumentsCount(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { department_id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const documentDetails = await prisma.documentAdditionalDetails.findMany({
      select: {
        document_id: true,
        work_flow_id: true,
      },
    });

    const ownedDocumentIds = documentDetails
      .filter((detail: any) => {
        if (!detail.work_flow_id) {
          return false;
        }

        const workflowDepartments = this.parseWorkflowDepartments(
          detail.work_flow_id,
          'getTotalOwnedDocumentsCount'
        );
        return (
          workflowDepartments.length > 0 &&
          workflowDepartments[0] === user.department_id
        );
      })
      .map((detail: any) => detail.document_id);

    if (ownedDocumentIds.length === 0) {
      return 0;
    }

    return prisma.document.count({
      where: {
        document_id: {
          in: ownedDocumentIds,
        },
        // Count all documents regardless of status (excluding deleted and archived)
        status: {
          notIn: ['deleted', 'archive']
        }
      },
    });
  }

  async getOutgoingDocumentsCount(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { department_id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get documents where the user's department is the sender (from_department)
    const outgoingTrails = await prisma.documentTrail.findMany({
      where: {
        from_department: user.department_id,
        status: 'intransit', // Only count documents currently in transit
      },
      select: {
        document_id: true,
      },
      distinct: ['document_id'], // Ensure we count each document only once
    });

    return outgoingTrails.length;
  }

  private buildS3Key(params: {
    departmentSlug: string;
    documentId: string;
    versionGroupId: string;
    fileId: string;
    fileName: string;
  }): string {
    const safeName = this.sanitizeFileName(params.fileName);
    return `${params.departmentSlug}/${params.documentId}/${params.versionGroupId}/${params.fileId}/${safeName}`;
  }

  private async calculateChecksumFromBuffer(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('error', (error) => reject(error));
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  private queueOcrProcessing(params: {
    documentId: string;
    storagePath: string;
    mimeType: string;
    originalName: string;
  }): void {
    if (params.mimeType !== 'application/pdf') {
      return;
    }

    ocrQueueService.enqueue({
      jobId: crypto.randomUUID(),
      ...params,
    });
  }

  private isPlaceholderFile(file: any): boolean {
    if (!file) return false;
    const originalName = (file.original_name || '').toString().toLowerCase();
    const storedName = (file.stored_name || '').toString().toLowerCase();
    return originalName.includes('placeholder') || storedName.includes('placeholder');
  }

  private async generatePlaceholderPdf(document: any, detail: any, user: any): Promise<Buffer> {
    const pdf = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks: Buffer[] = [];

    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Unknown user';
    const now = new Date();

    return new Promise((resolve, reject) => {
      pdf.on('data', (chunk) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      pdf.font('Helvetica-Bold').fontSize(20).text(document?.title || 'Document', {
        align: 'left',
      });

      pdf.moveDown();
      pdf.font('Helvetica').fontSize(12);

      const rows: Array<{ label: string; value: string }> = [
        { label: 'Document Code', value: document?.document_code || 'N/A' },
        { label: 'Classification', value: document?.classification || 'N/A' },
        { label: 'Status', value: document?.status || 'N/A' },
        { label: 'Origin', value: document?.origin || 'N/A' },
        { label: 'Generated For', value: fullName },
        { label: 'Generated At', value: now.toLocaleString() },
      ];

      rows.forEach(({ label, value }) => {
        pdf.font('Helvetica-Bold').text(`${label}: `, { continued: true });
        pdf.font('Helvetica').text(value || 'N/A');
      });

      const description = document?.description || detail?.remarks;
      if (description) {
        pdf.moveDown();
        pdf.font('Helvetica-Bold').text('Summary');
        pdf.moveDown(0.25);
        pdf.font('Helvetica').text(description, {
          align: 'left',
        });
      }

      pdf.moveDown();
      pdf.font('Helvetica').fontSize(10).fillColor('#666666').text(
        'This placeholder PDF was auto-generated because no original document file was uploaded prior to DocOnChain signing.',
        {
          align: 'left',
        }
      );

      pdf.end();
    });
  }

  private async createPlaceholderDocumentFile(documentId: string, document: any, detail: any, user: any) {
    try {
      const buffer = await this.generatePlaceholderPdf(document, detail, {
        first_name: user?.first_name,
        last_name: user?.last_name,
      });
      const storedName = `${documentId}-placeholder-${Date.now()}.pdf`;
      const checksum = await this.calculateChecksumFromBuffer(buffer);

      const uploadedBy = user?.account_id ?? detail?.account_id;
      if (!uploadedBy) {
        throw new Error('Missing account reference for placeholder upload');
      }

      const departmentId = user?.department_id || detail?.work_flow_id?.first;
      const departmentSlug = departmentId
        ? await this.getDepartmentSlug(departmentId)
        : 'unknown-department';
      const versionGroupId = crypto.randomUUID();
      const fileId = crypto.randomUUID();
      const key = this.buildS3Key({
        departmentSlug,
        documentId,
        versionGroupId,
        fileId,
        fileName: storedName
      });
      const storagePath = await s3Storage.uploadBuffer({
        key,
        body: buffer,
        contentType: 'application/pdf',
      });

      const created = await prisma.documentFile.create({
        data: {
          file_id: fileId,
          document_id: documentId,
          original_name: `${document?.document_code || documentId}-placeholder.pdf`,
          stored_name: storedName,
          storage_path: storagePath,
          file_size: BigInt(buffer.length),
          mime_type: 'application/pdf',
          checksum,
          is_primary: false,
          uploaded_by: uploadedBy,
          version_group_id: versionGroupId,
        },
      });

      return created;
    } catch (error) {
      console.error('≡ƒôì [createPlaceholderDocumentFile] Failed to create placeholder document:', error);
      return null;
    }
  }

  private async generateDocumentCode(
    departmentId: string,
    createdAt: Date = new Date()
  ): Promise<string> {
    const department = await prisma.department.findUnique({
      where: { department_id: departmentId },
      select: { code: true }
    });

    const rawCode = department?.code?.trim();
    if (!rawCode) {
      throw new Error('Department code not found');
    }

    const prefix = rawCode.toUpperCase();
    const month = String(createdAt.getMonth() + 1).padStart(2, '0');
    const day = String(createdAt.getDate()).padStart(2, '0');
    const year = String(createdAt.getFullYear()).slice(-2);
    const dateSegment = `${month}${day}${year}`;
    const codePrefix = `${prefix}-${dateSegment}-A`;
    const maxAttempts = 10;

    const latest = await prisma.document.findFirst({
      where: {
        document_code: {
          startsWith: codePrefix
        }
      },
      orderBy: {
        document_code: 'desc'
      },
      select: {
        document_code: true
      }
    });

    const match = latest?.document_code?.match(/-A(\d{4})$/);
    const startingNumber = match ? Number(match[1]) + 1 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const sequence = String(startingNumber + attempt).padStart(4, '0');
      const candidate = `${codePrefix}${sequence}`;

      const existing = await prisma.document.findUnique({
        where: { document_code: candidate },
        select: { document_id: true }
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new Error('Unable to generate unique document code');
  }

  private async createDocumentRecord(
    data: Omit<PrismaDocument, 'document_id' | 'document_code' | 'created_at' | 'updated_at'>,
    departmentId: string
  ) {
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const createdAt = new Date();
      const documentCode = await this.generateDocumentCode(departmentId, createdAt);

      try {
        return await prisma.document.create({
          data: {
            ...data,
            document_code: documentCode,
            created_at: createdAt
          } as any
        });
      } catch (error: any) {
        const isDuplicate =
          error?.code === 'P2002' &&
          Array.isArray(error?.meta?.target) &&
          error.meta.target.includes('document_code');

        if (isDuplicate) {
          continue;
        }

        throw error;
      }
    }

    throw new Error('Unable to generate unique document code');
  }

  /**
   * Get documents owned by a user (documents originated by their department - first in workflow)
   */
  async getOwnedDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      // Get the user's info
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          account_id: true,
          first_name: true,
          last_name: true,
          department_id: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get department info
      const department = await prisma.department.findUnique({
        where: { department_id: user.department_id },
        select: { name: true, code: true }
      });

      // Get all document additional details that contain this department as the originator (first in workflow)
      const documentDetails = await prisma.documentAdditionalDetails.findMany({
        select: {
          document_id: true,
          work_flow_id: true
        }
      });

      console.log('≡ƒôì [getOwnedDocuments] Total document details found:', documentDetails.length);

      // Filter documents where user's department is the FIRST in work_flow_id (owned/uploaded documents)
      const relevantDocumentIds = documentDetails
        .filter((detail: any) => {
          if (!detail.work_flow_id) {
            console.log('≡ƒôì [getOwnedDocuments] Document has no workflow, skipping:', detail.document_id);
            return false; // Exclude documents without workflow
          }

          // Parse the work_flow_id - handle both old array format and new object format
          try {
            let workflowDepartments: string[] = [];

            if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
              // New format: object with keys like "first", "second", etc.
              workflowDepartments = Object.values(detail.work_flow_id)
                .map((value: any) => (value == null ? '' : String(value)))
                .filter((value: string) => value.length > 0);
            } else if (typeof detail.work_flow_id === 'string') {
              // Could be either a JSON string of an array or a JSON string of an object
              const parsed = JSON.parse(detail.work_flow_id);
              if (Array.isArray(parsed)) {
                workflowDepartments = parsed;
              } else {
                // If it's an object, get its values
                workflowDepartments = Object.values(parsed);
              }
            } else if (Array.isArray(detail.work_flow_id)) {
              // Old format: array
              workflowDepartments = detail.work_flow_id
                .map((value: any) => (value == null ? '' : String(value)))
                .filter((value: string) => value.length > 0);
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is the FIRST entry in workflow (originated from this department)
            // In the new format, the "first" key corresponds to the first element
            const isOwned = workflowDepartments.length > 0 && workflowDepartments[0] === user.department_id;
            if (isOwned) {
              console.log('≡ƒôì [getOwnedDocuments] Document owned by department:', detail.document_id);
            }
            return isOwned;
          } catch (e) {
            console.error('≡ƒôì [getOwnedDocuments] Error parsing work_flow_id:', e);
            return false;
          }
        })
        .map((detail: any) => detail.document_id);

      console.log('≡ƒôì [getOwnedDocuments] Relevant document IDs:', relevantDocumentIds.length);

      // If no relevant documents, return empty result
      if (relevantDocumentIds.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: relevantDocumentIds
            },
            status: {
              notIn: ['deleted', 'archive']
            }
          },
          skip,
          take: limit
        }),
        prisma.document.count({
          where: {
            document_id: {
              in: relevantDocumentIds
            },
            status: {
              notIn: ['deleted', 'archive']
            }
          }
        })
      ]);

      console.log('≡ƒôì [getOwnedDocuments] Documents fetched:', documents.length, 'Total:', total);

      const documentIds = documents.map((doc) => doc.document_id);
      const processStatuses = await prisma.processStatus.findMany({
        where: { document_id: { in: documentIds } },
        select: {
          document_id: true,
          status: true,
          started_at: true,
          completed_at: true,
          delayed_at: true,
          delayed_duration_seconds: true
        }
      });
      const processStatusMap = new Map(
        processStatuses.map((status) => [status.document_id, status])
      );
      const processStatusService = new ProcessStatusService();
      const backfilledStatuses = await Promise.all(
        documents
          .filter(
            (doc) => doc.process_type_id && !processStatusMap.has(doc.document_id)
          )
          .map((doc) => processStatusService.syncForDocument(doc.document_id))
      );
      backfilledStatuses.forEach((status) => {
        if (status) {
          processStatusMap.set(status.document_id, status);
        }
      });

      const { startAtByDocument, completeAtByDocument } =
        await this.buildProcessTrailTimers({ documentIds });

      const processTypeIds = [
        ...new Set(
          documents
            .map((doc) => doc.process_type_id)
            .filter((id): id is string => Boolean(id))
        )
      ];
      const processTypes = await prisma.processType.findMany({
        where: { process_type_id: { in: processTypeIds } },
        select: { process_type_id: true, duration_value: true, duration_unit: true }
      });
      const processTypeMap = new Map(
        processTypes.map((type) => [type.process_type_id, type])
      );

      const now = Date.now();
      await Promise.all(
        documents.map(async (doc) => {
          const processStatus = processStatusMap.get(doc.document_id);
          if (!processStatus || processStatus.completed_at) return;

          const processType = doc.process_type_id
            ? processTypeMap.get(doc.process_type_id)
            : null;
          const durationValue = processType?.duration_value ?? null;
          if (!durationValue || durationValue <= 0) return;

          const durationUnit = (processType?.duration_unit || 'days').toLowerCase();
          const unitMultiplier =
            durationUnit === 'seconds'
              ? 1
              : durationUnit === 'minutes'
                ? 60
                : durationUnit === 'hours'
                  ? 60 * 60
                  : 24 * 60 * 60;
          const deadline =
            processStatus.started_at.getTime() + durationValue * unitMultiplier * 1000;

          if (now > deadline) {
            const delayedAt = processStatus.delayed_at ?? new Date(deadline);
            const delayedDurationSeconds = Math.max(
              0,
              Math.floor((now - deadline) / 1000)
            );
            await prisma.processStatus.update({
              where: { document_id: doc.document_id },
              data: {
                status: 'delayed',
                delayed_at: delayedAt,
                delayed_duration_seconds: delayedDurationSeconds
              }
            });
            processStatusMap.set(doc.document_id, {
              ...processStatus,
              status: 'delayed',
              delayed_at: delayedAt,
              delayed_duration_seconds: delayedDurationSeconds
            });
          }
        })
      );

      // Ensure completed-but-delayed statuses stay marked as delayed
      await Promise.all(
        documents.map(async (doc) => {
          const processStatus = processStatusMap.get(doc.document_id);
          if (!processStatus) return;
          if (!processStatus.completed_at) return;
          if (processStatus.status === 'delayed') return;

          const hasDelay =
            Boolean(processStatus.delayed_at) ||
            (processStatus.delayed_duration_seconds ?? 0) > 0;
          if (!hasDelay) return;

          await prisma.processStatus.update({
            where: { document_id: doc.document_id },
            data: { status: 'delayed' }
          });
          processStatusMap.set(doc.document_id, {
            ...processStatus,
            status: 'delayed'
          });
        })
      );

      // Extract document type IDs and fetch type names
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const documentTypeIds = [...new Set(documents.map(doc => doc.document_type).filter(id => id && uuidRegex.test(id)))];
      console.log('≡ƒôì [getOwnedDocuments] Filtered documentTypeIds:', documentTypeIds);
      const documentTypes = await prisma.documentType.findMany({
        where: { type_id: { in: documentTypeIds } },
        select: { type_id: true, name: true }
      });
      const documentTypeMap = new Map(documentTypes.map(dt => [dt.type_id, dt.name]));

      // Transform documents to frontend format with QR codes and barcodes
      const transformedDocuments = await Promise.all(
        documents.map(async (doc) => {
          // Generate QR code
          let qrCode = '';
          try {
            qrCode = await QRCode.toDataURL(doc.document_code || doc.document_id, {
              width: 100,
              margin: 1
            });
          } catch (err) {
            console.error('QR Code generation error:', err);
          }

          // Generate barcode
          let barcode = '';
          try {
            const canvas = await bwipjs.toBuffer({
              bcid: 'code128',
              text: doc.document_code || doc.document_id,
              scale: 2,
              height: 10,
              includetext: false
            });
            barcode = `data:image/png;base64,${canvas.toString('base64')}`;
          } catch (err) {
            console.error('Barcode generation error:', err);
          }

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title,
            documentId: doc.document_code,
            process_type_id: (doc as any).process_type_id || null,
            contactPerson: `${user.first_name} ${user.last_name}`,
            contactOrganization: department?.name || 'N/A',
            currentLocation: department?.name || 'N/A',
            type: documentTypeMap.get(doc.document_type) || (doc as any).document_type || 'General',
            classification: doc.classification,
            status: doc.status,
            origin: doc.origin,
            activity: 'created',
            activityTime: doc.created_at.toISOString(),
            created_at: doc.created_at.toISOString(),
            process_timer_start_at:
              (processStatusMap.get(doc.document_id)?.started_at ||
                startAtByDocument.get(doc.document_id))?.toISOString() || null,
            process_timer_complete_at:
              (processStatusMap.get(doc.document_id)?.completed_at ||
                completeAtByDocument.get(doc.document_id))?.toISOString() || null,
            process_status: processStatusMap.get(doc.document_id)?.status || null,
            process_delayed_at:
              processStatusMap.get(doc.document_id)?.delayed_at?.toISOString() || null,
            process_delay_seconds:
              processStatusMap.get(doc.document_id)?.delayed_duration_seconds ?? null
          };
        })
      );

      return {
        data: transformedDocuments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('≡ƒôì [getOwnedDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Get all documents with pagination - filtered by user's department using work_flow_id
   */
  async getAllDocuments(userId: string, page: number = 1, limit: number = 10, sortBy: string = 'created_at', sortOrder: 'asc' | 'desc' = 'desc') {
    try {
      const skip = (page - 1) * limit;

      // Map frontend field names to Prisma field names
      const fieldMapping: { [key: string]: string } = {
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'documentId': 'document_id',
        'documentCode': 'document_code',
        'documentType': 'document_type'
      };

      const mappedSortBy = fieldMapping[sortBy] || sortBy;

      // Get user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          department_id: true,
          first_name: true,
          last_name: true,
          account_id: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get department info
      const department = await prisma.department.findUnique({
        where: { department_id: user.department_id },
        select: { name: true, code: true }
      });

      // Get all document additional details
      // Note: We fetch all because work_flow_id is JSON and can't be easily filtered in SQL
      const documentDetails = await prisma.documentAdditionalDetails.findMany({
        select: {
          document_id: true,
          work_flow_id: true,
          received_by_departments: true,  // This field now stores user IDs for direct sharing
          blockchain_status: true,
          blockchain_project_uuid: true,
          blockchain_tx_hash: true,
          signed_at: true
        }
      });

      console.log('≡ƒôì [getAllDocuments] Total document details found:', documentDetails.length);

      // Create maps to store workflow and blockchain info for each document
      const documentWorkflowMap = new Map<string, any[]>();
      const documentReceivedByUsersMap = new Map<string, string[]>();
      const documentBlockchainMap = new Map<string, any>();

      // Filter documents based on two criteria:
      // 1. Documents that have user's department in work_flow_id (department-level access)
      // 2. Documents specifically shared to the user (user-level access)
      const relevantDocumentIds = documentDetails
        .filter((detail: any) => {
          let hasDepartmentAccess = false;
          let hasUserAccess = false;

          // Check department-level access
          if (detail.work_flow_id) {
            try {
              let workflowDepartments: string[] = [];

              if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
                // New format: object with keys like "first", "second", etc.
                workflowDepartments = Object.values(detail.work_flow_id)
                  .map((value: any) => (value == null ? '' : String(value)))
                  .filter((value: string) => value.length > 0);
              } else if (typeof detail.work_flow_id === 'string') {
                // Could be either a JSON string of an array or a JSON string of an object
                const parsed = JSON.parse(detail.work_flow_id);
                if (Array.isArray(parsed)) {
                  workflowDepartments = parsed;
                } else {
                  // If it's an object, get its values
                  workflowDepartments = Object.values(parsed);
                }
              } else if (Array.isArray(detail.work_flow_id)) {
                // Old format: array
                workflowDepartments = detail.work_flow_id
                  .map((value: any) => (value == null ? '' : String(value)))
                  .filter((value: string) => value.length > 0);
              } else {
                // Unexpected format
                workflowDepartments = [];
              }

              // Store workflow for later use - use the array of departments
              documentWorkflowMap.set(detail.document_id, workflowDepartments);

              // Check if user's department is the FIRST entry in workflow (originated from this department)
              hasDepartmentAccess = workflowDepartments.length > 0 && workflowDepartments[0] === user.department_id;
            } catch (e) {
              console.error('≡ƒôì [getAllDocuments] Error parsing work_flow_id:', e);
            }
          } else {
            // Include unassigned documents for department access
            hasDepartmentAccess = true;
          }

          // Check user-specific access (new user-level sharing logic)
          if (detail.received_by_departments) {
            try {
              const receivedByUsers = Array.isArray(detail.received_by_departments)
                ? detail.received_by_departments
                : JSON.parse(detail.received_by_departments as any);

              // Check if the current user is in the received_by_users list
              hasUserAccess = receivedByUsers.includes(userId);

              // Store received_by_users for later use
              documentReceivedByUsersMap.set(detail.document_id, receivedByUsers);
            } catch (e) {
              console.error('≡ƒôì [getAllDocuments] Error parsing received_by_departments:', e);
            }
          }

          // Store blockchain info
          documentBlockchainMap.set(detail.document_id, {
            blockchain_status: detail.blockchain_status,
            blockchain_project_uuid: detail.blockchain_project_uuid,
            blockchain_tx_hash: detail.blockchain_tx_hash,
            blockchain_redirect_url: (detail as any).blockchain_redirect_url,
            signed_at: detail.signed_at
          });

          // Return true if either condition is met
          return hasDepartmentAccess;
        })
        .map((detail: any) => detail.document_id);

      console.log('≡ƒôì [getAllDocuments] Relevant document IDs:', relevantDocumentIds.length);

      // If no relevant documents, return empty result
      if (relevantDocumentIds.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: relevantDocumentIds
            },
            status: {
              notIn: ['deleted', 'archive'] // Exclude deleted and archived documents
            }
          },
          include: {
            files: true
          },
          orderBy: {
            [mappedSortBy]: sortOrder
          },
          skip,
          take: limit
        }),
        prisma.document.count({
          where: {
            document_id: {
              in: relevantDocumentIds
            },
            status: {
              notIn: ['deleted', 'archive'] // Exclude deleted and archived documents from count
            }
          }
        })
      ]);

      const documentIds = documents.map((doc) => doc.document_id);
      const processStatuses = await prisma.processStatus.findMany({
        where: { document_id: { in: documentIds } },
        select: {
          document_id: true,
          status: true,
          started_at: true,
          completed_at: true,
          delayed_at: true,
          delayed_duration_seconds: true
        }
      });
      const processStatusMap = new Map(
        processStatuses.map((status) => [status.document_id, status])
      );
      const processStatusService = new ProcessStatusService();
      const backfilledStatuses = await Promise.all(
        documents
          .filter(
            (doc) => doc.process_type_id && !processStatusMap.has(doc.document_id)
          )
          .map((doc) => processStatusService.syncForDocument(doc.document_id))
      );
      backfilledStatuses.forEach((status) => {
        if (status) {
          processStatusMap.set(status.document_id, status);
        }
      });
      const { startAtByDocument, completeAtByDocument } =
        await this.buildProcessTrailTimers({
          documentIds,
          workflowMap: documentWorkflowMap,
        });

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const documentTypeIds = [...new Set(documents.map(doc => doc.document_type).filter(id => id && uuidRegex.test(id)))];
      console.log('≡ƒôì [getAllDocuments] Filtered documentTypeIds:', documentTypeIds);
      const documentTypes = await prisma.documentType.findMany({
        where: { type_id: { in: documentTypeIds } },
        select: { type_id: true, name: true }
      });
      const documentTypeMap = new Map(documentTypes.map(dt => [dt.type_id, dt.name]));

      const processTypeIds = [
        ...new Set(
          documents
            .map((doc) => doc.process_type_id)
            .filter((id): id is string => Boolean(id))
        )
      ];
      const processTypes = await prisma.processType.findMany({
        where: { process_type_id: { in: processTypeIds } },
        select: { process_type_id: true, duration_value: true, duration_unit: true }
      });
      const processTypeMap = new Map(
        processTypes.map((type) => [type.process_type_id, type])
      );

      const now = Date.now();
      await Promise.all(
        documents.map(async (doc) => {
          const processStatus = processStatusMap.get(doc.document_id);
          if (!processStatus || processStatus.completed_at) return;

          const processType = doc.process_type_id
            ? processTypeMap.get(doc.process_type_id)
            : null;
          const durationValue = processType?.duration_value ?? null;
          if (!durationValue || durationValue <= 0) return;

          const durationUnit = (processType?.duration_unit || 'days').toLowerCase();
          const unitMultiplier =
            durationUnit === 'seconds'
              ? 1
              : durationUnit === 'minutes'
                ? 60
                : durationUnit === 'hours'
                  ? 60 * 60
                  : 24 * 60 * 60;
          const deadline =
            processStatus.started_at.getTime() + durationValue * unitMultiplier * 1000;

          if (now > deadline) {
            const delayedAt = processStatus.delayed_at ?? new Date(deadline);
            const delayedDurationSeconds = Math.max(
              0,
              Math.floor((now - deadline) / 1000)
            );
            await prisma.processStatus.update({
              where: { document_id: doc.document_id },
              data: {
                status: 'delayed',
                delayed_at: delayedAt,
                delayed_duration_seconds: delayedDurationSeconds
              }
            });
            processStatusMap.set(doc.document_id, {
              ...processStatus,
              status: 'delayed',
              delayed_at: delayedAt,
              delayed_duration_seconds: delayedDurationSeconds
            });
          }
        })
      );

      // Ensure completed-but-delayed statuses stay marked as delayed
      await Promise.all(
        documents.map(async (doc) => {
          const processStatus = processStatusMap.get(doc.document_id);
          if (!processStatus) return;
          if (!processStatus.completed_at) return;
          if (processStatus.status === 'delayed') return;

          const hasDelay =
            Boolean(processStatus.delayed_at) ||
            (processStatus.delayed_duration_seconds ?? 0) > 0;
          if (!hasDelay) return;

          await prisma.processStatus.update({
            where: { document_id: doc.document_id },
            data: { status: 'delayed' }
          });
          processStatusMap.set(doc.document_id, {
            ...processStatus,
            status: 'delayed'
          });
        })
      );

      // Transform documents to frontend format with QR codes and barcodes
      const transformedDocuments = await Promise.all(
        documents.map(async (doc) => {
          // Generate QR code
          let qrCode = '';
          try {
            qrCode = await QRCode.toDataURL(doc.document_code || doc.document_id, {
              width: 100,
              margin: 1
            });
          } catch (err) {
            console.error('QR Code generation error:', err);
          }

          // Generate barcode
          let barcode = '';
          try {
            const canvas = await bwipjs.toBuffer({
              bcid: 'code128',
              text: doc.document_code || doc.document_id,
              scale: 2,
              height: 10,
              includetext: false
            });
            barcode = `data:image/png;base64,${canvas.toString('base64')}`;
          } catch (err) {
            console.error('Barcode generation error:', err);
          }

          // Check if document is owned by current department (first in workflow) or specifically shared to the user
          const workflow = documentWorkflowMap.get(doc.document_id);
          const receivedByUsers = documentReceivedByUsersMap.get(doc.document_id) || [];
          const isOwned = (workflow && workflow.length > 0 && workflow[0] === user.department_id) || receivedByUsers.includes(userId);

          // Get blockchain info
          const blockchainInfo = documentBlockchainMap.get(doc.document_id) || {};
          const processStatus = processStatusMap.get(doc.document_id);
          const processStartAt =
            processStatus?.started_at || startAtByDocument.get(doc.document_id);
          const processCompleteAt =
            processStatus?.completed_at || completeAtByDocument.get(doc.document_id);

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title || 'Untitled',
            documentId: doc.document_code || doc.document_id,
            process_type_id: (doc as any).process_type_id || null,
            contactPerson: `${user.first_name} ${user.last_name}`,
            contactOrganization: department?.name || 'N/A',
            currentLocation: department?.name || 'N/A',
            type: documentTypeMap.get(doc.document_type) || (doc as any).document_type || 'General',
            classification: doc.classification,
            status: doc.status,
            origin: doc.origin,
            activity: new Date(doc.created_at).toLocaleDateString(),
            activityTime: doc.created_at.toISOString(),
            created_at: doc.created_at.toISOString(),
            process_timer_start_at: processStartAt
              ? processStartAt.toISOString()
              : null,
            process_timer_complete_at: processCompleteAt
              ? processCompleteAt.toISOString()
              : null,
            process_status: processStatus?.status || null,
            process_delayed_at: processStatus?.delayed_at
              ? processStatus.delayed_at.toISOString()
              : null,
            process_delay_seconds: processStatus?.delayed_duration_seconds ?? null,
            isOwned: isOwned || false, // Add ownership flag for frontend badge logic
            blockchainStatus: blockchainInfo.blockchain_status || null,
            blockchainProjectUuid: blockchainInfo.blockchain_project_uuid || null,
            blockchainTxHash: blockchainInfo.blockchain_tx_hash || null,
            blockchainRedirectUrl: blockchainInfo.blockchain_redirect_url || null,
            signedAt: blockchainInfo.signed_at || null
          };
        })
      );

      return {
        data: transformedDocuments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('≡ƒôì [getAllDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid document ID format');
    }

    const document = await prisma.document.findUnique({
      where: { document_id: id },
      include: {
        files: {
          include: {
            uploaded_by_account: {
              include: {
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  }
                }
              }
            },
            DocumentMetadata: true
          }
        },
        DocumentAdditionalDetails: {
          include: {
            created_by_account: {
              select: {
                email: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  }
                }
              }
            }
          },
          orderBy: {
            created_at: 'asc'
          },
          take: 1 // Get the first/oldest detail for origin info
        },
        signedDocuments: { // Include the signed documents
          include: {
            signee: { // Include the signee details if needed
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      }
    });

    if (!document) {
      return null;
    }

    // Get document type info
    let documentType = null;
    if (document.document_type) {
      documentType = await prisma.documentType.findUnique({
        where: { name: document.document_type }
      });
      // If no DocumentType record exists, create a simple object with the name
      if (!documentType) {
        documentType = { name: document.document_type } as any;
      }
    }

    // Generate QR code
    let qrCode = '';
    try {
      qrCode = await QRCode.toDataURL(document.document_code || document.document_id, {
        width: 200,
        margin: 1
      });
    } catch (err) {
      console.error('QR Code generation error:', err);
    }

    // Generate barcode
    let barcode = '';
    try {
      const canvas = await bwipjs.toBuffer({
        bcid: 'code128',
        text: document.document_code || document.document_id,
        scale: 3,
        height: 15,
        includetext: false
      });
      barcode = `data:image/png;base64,${canvas.toString('base64')}`;
    } catch (err) {
      console.error('Barcode generation error:', err);
    }

    // Try to extract department info from workflow if available
    let originatingDept = null;
    let currentDept = null;

    if (document.DocumentAdditionalDetails && document.DocumentAdditionalDetails.length > 0) {
      const workflow = document.DocumentAdditionalDetails[0].work_flow_id as any;
      if (workflow && typeof workflow === 'object') {
        // Workflow is stored as {"first": "dept_id", "second": "dept_id", ...}
        // Get the first department (originating)
        const firstDeptId = workflow.first;
        if (firstDeptId) {
          try {
            originatingDept = await prisma.department.findUnique({
              where: { department_id: firstDeptId },
              select: { name: true, department_id: true }
            });
          } catch (e) {
            console.error('Error fetching originating department:', e);
          }
        }

        // Get the last department in the workflow (current)
        // Check for second, third, etc. to find the last one
        const workflowKeys = Object.keys(workflow).filter(key =>
          key !== 'first' && workflow[key] !== null && workflow[key] !== undefined
        );
        const lastKey = workflowKeys.length > 0 ? workflowKeys[workflowKeys.length - 1] : 'first';
        const lastDeptId = workflow[lastKey];

        if (lastDeptId) {
          try {
            currentDept = await prisma.department.findUnique({
              where: { department_id: lastDeptId },
              select: { name: true, department_id: true }
            });
          } catch (e) {
            console.error('Error fetching current department:', e);
          }
        }
      }
    }

    // Get creator information from DocumentAdditionalDetails or first file uploader
    const createdByAccount = document.DocumentAdditionalDetails?.[0]?.created_by_account ||
      document.files?.[0]?.uploaded_by_account ||
      null;

    // Build the detail object to match frontend expectations
    const detail = {
      document_code: document.document_code,
      document_name: document.title,
      classification: document.classification,
      origin: document.origin,
      delivery: null, // Not available in current schema
      created_by: createdByAccount?.user ?
        `${createdByAccount.user.first_name} ${createdByAccount.user.last_name}` : null,
      document_type: documentType ? {
        name: documentType.name
      } : null,
      department: originatingDept ? {
        name: originatingDept.name
      } : null,
      created_by_account: createdByAccount ? {
        email: (createdByAccount as any).email || null,
        user: createdByAccount.user || null
      } : null
    };

    const blockchainDetail = document.DocumentAdditionalDetails?.[0] as any;

    // Process files to include version information and metadata
    const processedFiles = document.files.map((file: any) => ({
      file_id: file.file_id,
      original_name: file.original_name,
      mime_type: file.mime_type,
      is_primary: file.is_primary,
      downloadUrl: `/api/documents/${document.document_id}/files/${file.file_id}/download`,
      version: file.version, // Include version information
      uploadDate: file.uploaded_at, // Include upload date
      file_size: Number(file.file_size), // Include file size
      version_group_id: file.version_group_id, // Include version group ID
      uploaded_by_account: file.uploaded_by_account || null, // Include uploader info if available
      DocumentMetadata: file.DocumentMetadata || null // Include document metadata
    }));

    return {
      document_id: document.document_id,
      tracking_code: document.document_code,
      status: document.status,
      created_at: document.created_at,
      detail,
      current_department: currentDept ? {
        name: currentDept.name
      } : null,
      originating_department: originatingDept ? {
        name: originatingDept.name
      } : null,
      document_logs: [], // Empty for now as logs don't exist in schema
      qrCode,
      barcode,
      blockchain: blockchainDetail ? {
        status: blockchainDetail.blockchain_status || null,
        projectUuid: blockchainDetail.blockchain_project_uuid || null,
        transactionHash: blockchainDetail.blockchain_tx_hash || null,
        redirectUrl: blockchainDetail.blockchain_redirect_url || null,
        signedAt: blockchainDetail.signed_at || null,
        signedBy: blockchainDetail.signed_by || null
      } : null,
      // Include files with version information
      files: processedFiles,
      // Also include raw document fields for fallback
      title: document.title,
      document_code: document.document_code,
      classification: document.classification,
      description: document.description
    };
  }

  /**
   * Get completed documents with pagination for a user's department
   */
  async getCompletedDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      console.log('≡ƒôì [getCompletedDocuments] Request:', { userId, page, limit });

      // Get the user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get all document additional details
      const documentDetails = await prisma.documentAdditionalDetails.findMany({
        select: {
          document_id: true,
          work_flow_id: true
        }
      });

      // Filter completed documents that are in user's workflow
      const completedDocumentIds = documentDetails
        .filter((detail: any) => {
          if (!detail.work_flow_id) return false;

          try {
            let workflowDepartments: string[] = [];

            if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
              // New format: object with keys like "first", "second", etc.
              workflowDepartments = Object.values(detail.work_flow_id)
                .map((value: any) => (value == null ? '' : String(value)))
                .filter((value: string) => value.length > 0);
            } else if (typeof detail.work_flow_id === 'string') {
              // Could be either a JSON string of an array or a JSON string of an object
              const parsed = JSON.parse(detail.work_flow_id);
              if (Array.isArray(parsed)) {
                workflowDepartments = parsed;
              } else {
                // If it's an object, get its values
                workflowDepartments = Object.values(parsed);
              }
            } else if (Array.isArray(detail.work_flow_id)) {
              // Old format: array
              workflowDepartments = detail.work_flow_id
                .map((value: any) => (value == null ? '' : String(value)))
                .filter((value: string) => value.length > 0);
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is in the workflow
            return workflowDepartments.includes(user.department_id);
          } catch (e) {
            console.error('≡ƒôì [getCompletedDocuments] Error parsing work_flow_id:', e);
            return false;
          }
        })
        .map((detail: any) => detail.document_id);

      console.log('≡ƒôì [getCompletedDocuments] Completed document IDs in workflow:', completedDocumentIds.length);

      if (completedDocumentIds.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: completedDocumentIds
            },
            status: 'completed'
          },
          include: {
            files: true
          },
          orderBy: {
            created_at: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.document.count({
          where: {
            document_id: {
              in: completedDocumentIds
            },
            status: 'completed'
          }
        })
      ]);

      console.log('≡ƒôì [getCompletedDocuments] Documents fetched:', documents.length, 'Total:', total);

      // Transform documents to frontend format with QR codes and barcodes
      const transformedDocuments = await Promise.all(
        documents.map(async (doc) => {
          // Generate QR code
          let qrCode = '';
          try {
            qrCode = await QRCode.toDataURL(doc.document_code || doc.document_id, {
              width: 100,
              margin: 1
            });
          } catch (err) {
            console.error('QR Code generation error:', err);
          }

          // Generate barcode
          let barcode = '';
          try {
            const canvas = await bwipjs.toBuffer({
              bcid: 'code128',
              text: doc.document_code || doc.document_id,
              scale: 2,
              height: 10,
              includetext: false
            });
            barcode = `data:image/png;base64,${canvas.toString('base64')}`;
          } catch (err) {
            console.error('Barcode generation error:', err);
          }

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title || 'Untitled',
            documentId: doc.document_code || doc.document_id,
            process_type_id: (doc as any).process_type_id || null,
            contactPerson: 'N/A',
            contactOrganization: 'N/A',
            type: 'General',
            classification: doc.classification,
            status: doc.status,
            origin: doc.origin,
            activity: new Date(doc.created_at).toLocaleDateString(),
            activityTime: doc.created_at.toISOString(),
            created_at: doc.created_at.toISOString(),
          };
        })
      );

      return {
        data: transformedDocuments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('≡ƒôì [getCompletedDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Check if user can access document
   */
  async canUserAccessDocument(documentId: string, userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { account_id: true }
    });

    if (!user) return false;

    const document = await prisma.document.findUnique({
      where: { document_id: documentId }
    });

    // For now, allow access if document exists
    // Add ownership logic when schema is updated
    return document !== null;
  }

  /**
   * Search documents
   */
  async searchDocuments(query: string, userId?: string) {
    // First get the user's department if userId is provided
    let userDepartmentId: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true }
      });
      userDepartmentId = user?.department_id || null;
    }

    const whereCondition: any = {
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          document_code: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ]
    };

    const documents = await prisma.document.findMany({
      where: whereCondition,
      include: {
        files: true,
        DocumentAdditionalDetails: {
          include: {
            created_by_account: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    // Process documents to add ownership and department information
    return await Promise.all(documents.map(async (doc) => {
      let ownerInfo = null;
      let originatingDepartment = null;
      let isOwner = false;
      let isFromSameDepartment = false;
      let isAssignedToUserDepartment = false;
      let latestTransitTrail = null;

      if (doc.DocumentAdditionalDetails && doc.DocumentAdditionalDetails.length > 0) {
        const details = doc.DocumentAdditionalDetails[0];

        // Extract owner information
        if (details.created_by_account?.user) {
          ownerInfo = {
            user_id: details.created_by_account.user.user_id,
            first_name: details.created_by_account.user.first_name,
            last_name: details.created_by_account.user.last_name,
            department_id: details.created_by_account.user.department_id
          };
        }

        // Extract originating department from workflow
        if (details.work_flow_id) {
          let workflowDepartments: string[] = [];
          if (typeof details.work_flow_id === 'object' && details.work_flow_id !== null) {
            // Handle both array and object formats
            if (Array.isArray(details.work_flow_id)) {
              workflowDepartments = details.work_flow_id
                .map((value: any) => (value == null ? '' : String(value)))
                .filter((value: string) => value.length > 0);
            } else {
              // If it's an object like {"first": "deptId", "second": "deptId", ...}
              workflowDepartments = Object.values(details.work_flow_id as any)
                .map((value: any) => (value == null ? '' : String(value)))
                .filter((value: string) => value.length > 0);
            }
          }

          if (workflowDepartments.length > 0) {
            // The first department in the workflow is the originating department
            const originatingDeptId = workflowDepartments[0];

            // Get department info
            originatingDepartment = {
              department_id: originatingDeptId
            };

            // Check ownership and department match
            if (ownerInfo && userId && ownerInfo.user_id === userId) {
              isOwner = true;
            }

            if (userDepartmentId && originatingDeptId === userDepartmentId) {
              isFromSameDepartment = true;
            }
          }
        }
      }

      // Check if the document is assigned to the user's department for receiving
      if (userDepartmentId && doc.status === 'intransit') {
        // Find the latest transit trail to see which department it's assigned to
        latestTransitTrail = await prisma.documentTrail.findFirst({
          where: {
            document_id: doc.document_id,
            status: 'intransit'
          },
          orderBy: {
            created_at: 'desc'
          },
          select: {
            to_department: true,
            from_department: true,
            user_id: true,
            action_date: true
          }
        });

        if (latestTransitTrail?.to_department && latestTransitTrail.to_department === userDepartmentId) {
          isAssignedToUserDepartment = true;
        }
      }

      return {
        ...doc,
        owner: ownerInfo,
        originating_department: originatingDepartment,
        isOwner: isOwner,
        isFromSameDepartment: isFromSameDepartment,
        isAssignedToUserDepartment: isAssignedToUserDepartment,
        latestTransitTrail: latestTransitTrail
      };
    }));
  }

  /**
   * Get received documents for a user's department
   * These are documents the user's department received from other departments
   */
  async getReceivedDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      console.log('≡ƒôì [getReceivedDocuments] Request:', { userId, page, limit });

      // Get the user's department
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get all document additional details
      const documentDetails = await prisma.documentAdditionalDetails.findMany({
        select: {
          document_id: true,
          work_flow_id: true,
          received_by_departments: true
        }
      });

      // Filter documents that were received by user's department
      // Received means: department has acknowledged receipt (is in received_by_departments array)
      const receivedDocumentIds = documentDetails
        .filter((detail: any) => {
          if (!detail.work_flow_id) return false;

          try {
            let workflowDepartments: string[] = [];

            if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
              // New format: object with keys like "first", "second", etc.
              workflowDepartments = Object.values(detail.work_flow_id)
                .map((value: any) => (value == null ? '' : String(value)))
                .filter((value: string) => value.length > 0);
            } else if (typeof detail.work_flow_id === 'string') {
              // Could be either a JSON string of an array or a JSON string of an object
              const parsed = JSON.parse(detail.work_flow_id);
              if (Array.isArray(parsed)) {
                workflowDepartments = parsed;
              } else {
                // If it's an object, get its values
                workflowDepartments = Object.values(parsed);
              }
            } else if (Array.isArray(detail.work_flow_id)) {
              // Old format: array
              workflowDepartments = detail.work_flow_id
                .map((value: any) => (value == null ? '' : String(value)))
                .filter((value: string) => value.length > 0);
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is in workflow but NOT the first (received from others)
            const isInWorkflow = workflowDepartments.includes(user.department_id);
            const isNotOriginator = workflowDepartments.length > 0 && workflowDepartments[0] !== user.department_id;

            // Check if received by this department (acknowledged)
            let receivedByUsers: string[] = [];
            if (detail.received_by_departments) {
              try {
                receivedByUsers = Array.isArray(detail.received_by_departments)
                  ? detail.received_by_departments
                  : JSON.parse(detail.received_by_departments as any);
              } catch (e) {
                console.error('≡ƒôì [getReceivedDocuments] Error parsing received_by_departments:', e);
              }
            }

            const hasBeenReceived = receivedByUsers.includes(userId);

            return isInWorkflow && isNotOriginator && hasBeenReceived;
          } catch (e) {
            console.error('≡ƒôì [getReceivedDocuments] Error parsing work_flow_id:', e);
            return false;
          }
        })
        .map((detail: any) => detail.document_id);

      console.log('≡ƒôì [getReceivedDocuments] Received document IDs:', receivedDocumentIds.length);

      if (receivedDocumentIds.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      // Get received documents (exclude deleted)
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: receivedDocumentIds
            },
            status: {
              not: 'deleted'
            }
          },
          include: {
            files: true
          },
          orderBy: {
            created_at: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.document.count({
          where: {
            document_id: {
              in: receivedDocumentIds
            },
            status: {
              not: 'deleted'
            }
          }
        })
      ]);

      console.log('≡ƒôì [getReceivedDocuments] Documents fetched:', documents.length, 'Total:', total);

      // Transform to frontend format
      const transformedDocuments = await Promise.all(
        documents.map(async (doc) => {
          // Generate QR code
          let qrCode = '';
          try {
            qrCode = await QRCode.toDataURL(doc.document_code || doc.document_id, {
              width: 100,
              margin: 1
            });
          } catch (err) {
            console.error('QR Code generation error:', err);
          }

          // Generate barcode
          let barcode = '';
          try {
            const canvas = await bwipjs.toBuffer({
              bcid: 'code128',
              text: doc.document_code || doc.document_id,
              scale: 2,
              height: 10,
              includetext: false
            });
            barcode = `data:image/png;base64,${canvas.toString('base64')}`;
          } catch (err) {
            console.error('Barcode generation error:', err);
          }

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title,
            documentId: doc.document_code,
            process_type_id: (doc as any).process_type_id || null,
            contactPerson: 'N/A',
            contactOrganization: 'N/A',
            type: 'General',
            classification: doc.classification,
            status: 'received',
            origin: doc.origin,
            activity: new Date(doc.created_at).toLocaleDateString(),
            activityTime: doc.created_at.toISOString(),
            created_at: doc.created_at.toISOString()
          };
        })
      );

      return {
        data: transformedDocuments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('≡ƒôì [getReceivedDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Create a new document with file upload
   */
  async createDocumentWithFile(documentData: any, file: Express.Multer.File | undefined, userId: string, enableOcr: boolean = false) {
    // Verify user exists and get department
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        department_id: true,
        first_name: true,
        last_name: true,
        middle_name: true,
        account: {
          select: {
            account_id: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.account?.account_id) {
      throw new Error('User account context missing');
    }

    // Generate unique document code (department-based)
    // Get document type name if type_id is provided
    let documentTypeName = documentData.document_type || 'General';
    if (documentData.type_id) {
      const docType = await prisma.documentType.findUnique({
        where: { type_id: documentData.type_id },
        select: { name: true }
      });
      if (docType) {
        documentTypeName = docType.name;
      }
    }

    // Create the document
    const document = await this.createDocumentRecord(
      {
        title: documentData.document_name || documentData.title,
        description: documentData.description || null,
        document_type: documentTypeName,
        process_type_id: documentData.process_type_id || documentData.processTypeId || null,
        classification: documentData.classification,
        origin: documentData.origin,
        status: 'pending'
      } as any,
      user.department_id
    );

    // Create DocumentAdditionalDetails with work_flow_id in the format {"first": "departmentId"}
    const workflowObject = {
      first: user.department_id
    };

    await prisma.documentAdditionalDetails.create({
      data: {
        document_id: document.document_id,
        work_flow_id: workflowObject as any, // Initialize with creator's department as "first"
        remarks: documentData.remarks || null,
        account_id: user.account.account_id // Store the creator's account ID
      }
    });

    await recordCreationStatus(document.document_id, {
      departmentId: user.department_id,
      accountId: user.account.account_id,
      status: document.status
    });

    // If file is uploaded, save file metadata
    if (file) {
      if (!file.buffer) {
        throw new Error('File buffer missing. Ensure memory storage is enabled for uploads.');
      }
      const existingFileCount = await prisma.documentFile.count({
        where: { document_id: document.document_id }
      });

      const departmentSlug = await this.getDepartmentSlug(user.department_id);
      const fileId = crypto.randomUUID();
      const newVersionGroupId = crypto.randomUUID();
      const checksum = await this.calculateChecksumFromBuffer(file.buffer);
      const storageKey = this.buildS3Key({
        departmentSlug,
        documentId: document.document_id,
        versionGroupId: newVersionGroupId,
        fileId,
        fileName: file.originalname,
      });
      const storagePath = await s3Storage.uploadBuffer({
        key: storageKey,
        body: file.buffer,
        contentType: file.mimetype,
      });

      const createdFile = await prisma.documentFile.create({
        data: {
          file_id: fileId,
          document_id: document.document_id,
          original_name: file.originalname,
          stored_name: this.sanitizeFileName(file.originalname),
          storage_path: storagePath,
          file_size: BigInt(file.size),
          mime_type: file.mimetype,
          checksum,
          is_primary: existingFileCount === 0,
          uploaded_by: user.account.account_id,
          version_group_id: newVersionGroupId,
          document_group_id: documentData.documentGroupId || null,
          document_group_name: documentData.documentGroupName || null
        }
      });

      if (enableOcr) {
        this.queueOcrProcessing({
          documentId: document.document_id,
          storagePath: storagePath,
          mimeType: file.mimetype,
          originalName: file.originalname,
        });
      }

      // Extract and save document metadata
      try {
        const metadata = await this.documentMetadataService.extractMetadataFromBuffer(
          file.buffer,
          file.originalname
        );

        const metadataToSave: any = {
          file_id: createdFile.file_id,
          file_size: metadata.file_size ? BigInt(metadata.file_size) : null,
          file_type: metadata.file_type,
          mime_type: metadata.mime_type,
          author: metadata.author,
          creator: metadata.creator,
          producer: metadata.producer,
          creation_date: metadata.creation_date,
          modification_date: metadata.modification_date,
          is_encrypted: metadata.is_encrypted,
          checksum: metadata.checksum,
          version: metadata.version,
        };

        // Remove undefined fields
        Object.keys(metadataToSave).forEach(key => metadataToSave[key] === undefined && delete metadataToSave[key]);

        const metadataRecord = await prisma.documentMetadata.create({
          data: metadataToSave,
        });

        // Log the inserted metadata as JSON
        console.log('Document metadata inserted:', JSON.stringify(metadataRecord, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value, 2
        ));
      } catch (error) {
        console.error('Failed to extract or save document metadata:', error);
      }
    }

    // Create a document trail entry for document creation
    const documentTrailsService = new DocumentTrailsService();
    try {
      await documentTrailsService.createDocumentTrail({
        document_id: document.document_id,
        from_department: user.department_id,
        to_department: user.department_id, // Document created in the same department
        user_id: userId,
        status: 'pending',
        remarks: `Document created by ${user.first_name} ${user.last_name} with file upload`
      });
    } catch (error) {
      console.error('Error creating document trail for document creation:', error);
    }

    // Emit socket event to notify frontends of new document
    const io = getSocketInstance();
    if (io) {
      io.emit('documentAdded', {
        documentId: document.document_id,
        title: document.title,
        document_code: document.document_code,
        classification: document.classification,
        document_type: document.document_type,
        status: document.status,
        created_at: document.created_at,
        department_id: user.department_id,
        created_by: {
          first_name: user.first_name,
          last_name: user.last_name,
        },
      });
    } else {
      console.error('[DocumentService] Socket.IO instance not available. Could not emit documentAdded event.');
    }

    return document;
  }

  /**
   * Upload multiple files to existing document
   */
  async uploadFilesToDocument(
    documentId: string,
    files: Express.Multer.File[],
    userId: string,
    versionGroupId?: string,
    enableOcr: boolean = false,
    documentGroupId?: string,
    documentGroupName?: string
  ) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    // If versionGroupId is provided, validate it as well
    if (versionGroupId && !uuidRegex.test(versionGroupId)) {
      throw new Error('Invalid version group ID format');
    }

    // Verify document exists and user has access
    const document = await prisma.document.findUnique({
      where: { document_id: documentId }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        department_id: true,
        account: {
          select: {
            account_id: true
          }
        }
      }
    });

    if (!user?.account?.account_id) {
      throw new Error('User account context missing');
    }

    const departmentSlug = user.department_id
      ? await this.getDepartmentSlug(user.department_id)
      : 'unknown-department';

    // Validate that all files have buffers
    for (const file of files) {
      if (!file.buffer) {
        throw new Error('File buffer missing. Ensure memory storage is enabled for uploads.');
      }
    }

    // This variable will be used if we're branching (versionGroupId provided)
    let branchingVersionGroupId: string | null = null;
    if (versionGroupId) {
      branchingVersionGroupId = versionGroupId;
    }

    const existingFiles = await prisma.documentFile.findMany({
      where: { document_id: documentId },
      orderBy: { uploaded_at: 'asc' }
    });

    let hasRealFile = existingFiles.some((file: any) => !this.isPlaceholderFile(file));

    // If we're branching (versionGroupId provided), find existing files in this version group to determine the next version
    let nextVersionInGroup = 1;
    if (versionGroupId) {
      const existingFilesInGroup = await prisma.documentFile.findMany({
        where: {
          document_id: documentId,
          version_group_id: versionGroupId
        },
        orderBy: { uploaded_at: 'desc' }
      });

      if (existingFilesInGroup.length > 0) {
        const lastFileInGroup = existingFilesInGroup[0]; // Most recent
        const vParts = (lastFileInGroup.version || "1.0").split('.');
        const currentMinor = parseInt(vParts[1]) || 0;
        nextVersionInGroup = currentMinor + 1;
      }
    }

    let originalFileToCloneFrom: { file_id: string } | null = null;
    if (versionGroupId) {
      originalFileToCloneFrom = await prisma.documentFile.findFirst({
        where: {
          document_id: documentId,
          version_group_id: versionGroupId,
        },
        orderBy: {
          version: 'asc',
        },
        select: {
          file_id: true,
        },
      });
    }

    const uploadedFiles = [];

    for (const [index, file] of files.entries()) {
      const fileId = crypto.randomUUID();
      const checksum = await this.calculateChecksumFromBuffer(file.buffer);

      const version = versionGroupId
        ? `1.${nextVersionInGroup + index}`
        : `1.0`;

      const currentFileVersionGroupId = branchingVersionGroupId || crypto.randomUUID();

      const shouldBePrimary = !hasRealFile && index === 0;

      const storageKey = this.buildS3Key({
        departmentSlug,
        documentId,
        versionGroupId: currentFileVersionGroupId,
        fileId,
        fileName: file.originalname,
      });
      const storagePath = await s3Storage.uploadBuffer({
        key: storageKey,
        body: file.buffer,
        contentType: file.mimetype,
      });

      const created = await prisma.documentFile.create({
        data: {
          file_id: fileId,
          document_id: documentId,
          original_name: file.originalname,
          stored_name: this.sanitizeFileName(file.originalname),
          storage_path: storagePath,
          file_size: BigInt(file.size),
          mime_type: file.mimetype,
          checksum,
          version,
          is_primary: shouldBePrimary,
          uploaded_by: user.account.account_id,
          version_group_id: currentFileVersionGroupId,
          document_group_id: documentGroupId || null,
          document_group_name: documentGroupName || null
        }
      });

      if (originalFileToCloneFrom) {
        // Clone Signature Placeholders
        const signaturePlaceholdersToClone =
          await prisma.signaturePlaceholder.findMany({
            where: { document_file_id: originalFileToCloneFrom.file_id },
          });

        if (signaturePlaceholdersToClone.length > 0) {
          await prisma.signaturePlaceholder.createMany({
            data: signaturePlaceholdersToClone.map((p) => ({
              document_id: p.document_id,
              document_file_id: created.file_id, // Link to new file
              assigned_user_id: p.assigned_user_id,
              x_position: p.x_position,
              y_position: p.y_position,
              width: p.width,
              height: p.height,
              page_number: p.page_number,
            })),
          });
        }

        // Clone Text Placeholders
        const textPlaceholdersToClone = await prisma.textPlaceholder.findMany({
          where: { document_file_id: originalFileToCloneFrom.file_id },
        });

        if (textPlaceholdersToClone.length > 0) {
          await prisma.textPlaceholder.createMany({
            data: textPlaceholdersToClone.map((p) => ({
              document_id: p.document_id,
              document_file_id: created.file_id, // Link to new file
              assigned_user_id: p.assigned_user_id,
              x_position: p.x_position,
              y_position: p.y_position,
              width: p.width,
              height: p.height,
              page_number: p.page_number,
              font_family: p.font_family,
              font_size: p.font_size,
              font_color: p.font_color,
              text_value: p.text_value,
            })),
          });
        }
        console.log(
          `Cloned placeholders from ${originalFileToCloneFrom.file_id} to new file ${created.file_id}`,
        );
      }

      if (enableOcr) {
        this.queueOcrProcessing({
          documentId,
          storagePath,
          mimeType: file.mimetype,
          originalName: file.originalname,
        });
      }

      if (shouldBePrimary) {
        hasRealFile = true;
        await prisma.documentFile.updateMany({
          where: {
            document_id: documentId,
            file_id: { not: created.file_id }
          },
          data: { is_primary: false }
        });
      }

      // Extract and save document metadata for this file
      try {
        const metadata = await this.documentMetadataService.extractMetadataFromBuffer(
          file.buffer,
          file.originalname
        );

        const metadataToSave: any = {
          file_id: created.file_id,
          file_size: metadata.file_size ? BigInt(metadata.file_size) : null,
          file_type: metadata.file_type,
          mime_type: metadata.mime_type,
          author: metadata.author,
          creator: metadata.creator,
          producer: metadata.producer,
          creation_date: metadata.creation_date,
          modification_date: metadata.modification_date,
          is_encrypted: metadata.is_encrypted,
          checksum: metadata.checksum,
          version: metadata.version,
        };

        // Remove undefined fields
        Object.keys(metadataToSave).forEach(key => metadataToSave[key] === undefined && delete metadataToSave[key]);

        const metadataRecord = await prisma.documentMetadata.create({
          data: metadataToSave,
        });

        // Log the inserted metadata as JSON
        console.log('Document metadata inserted:', JSON.stringify(metadataRecord, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value, 2
        ));
      } catch (error) {
        console.error('Failed to extract or save document metadata:', error);
      }

      uploadedFiles.push({
        id: created.file_id,
        name: created.original_name,
        size: Number(created.file_size),
        type: created.mime_type,
        version: created.version,
        isPrimary: created.is_primary,
        uploadDate: created.uploaded_at,
        versionGroupId: created.version_group_id
      });
    }

    // Emit socket event to notify frontends that document has been updated with new files
    const updatedDocument = await prisma.document.findUnique({
      where: { document_id: documentId }
    });

    if (updatedDocument) {
      const io = getSocketInstance();
      io.emit('documentUpdated', {
        documentId: updatedDocument.document_id,
        title: updatedDocument.title,
        document_code: updatedDocument.document_code,
        classification: updatedDocument.classification,
        document_type: updatedDocument.document_type,
        status: updatedDocument.status,
        updated_at: updatedDocument.updated_at
      });
    }

    return uploadedFiles;
  }

  /**
   * Replace an existing document file (overwrite content, keep same file ID)
   */
  async replaceDocumentFile(documentId: string, fileId: string, file: Express.Multer.File, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    const canAccess = await this.canUserAccessDocument(documentId, userId);
    if (!canAccess) {
      throw new Error('You do not have permission to update this document');
    }

    const existingFile = await prisma.documentFile.findFirst({
      where: {
        file_id: fileId,
        document_id: documentId
      }
    });

    if (!existingFile) {
      throw new Error('File not found');
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        department_id: true,
        account: {
          select: {
            account_id: true
          }
        }
      }
    });

    if (!user?.account?.account_id) {
      throw new Error('User account context missing');
    }

    const departmentSlug = user.department_id
      ? await this.getDepartmentSlug(user.department_id)
      : 'unknown-department';
    const checksum = await this.calculateChecksumFromBuffer(file.buffer);
    const previousPath = existingFile.storage_path;
    const versionGroupId = existingFile.version_group_id || crypto.randomUUID();
    const storageKey = this.buildS3Key({
      departmentSlug,
      documentId,
      versionGroupId,
      fileId: existingFile.file_id,
      fileName: file.originalname,
    });
    const storagePath = await s3Storage.uploadBuffer({
      key: storageKey,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const updated = await prisma.documentFile.update({
      where: { file_id: fileId },
      data: {
        original_name: file.originalname,
        stored_name: this.sanitizeFileName(file.originalname),
        storage_path: storagePath,
        file_size: BigInt(file.size),
        mime_type: file.mimetype,
        checksum,
        uploaded_at: new Date(),
        uploaded_by: user.account.account_id,
        version_group_id: versionGroupId
      }
    });

    // Update metadata for this file
    await prisma.documentMetadata.deleteMany({
      where: { file_id: fileId }
    });

    try {
      const metadata = await this.documentMetadataService.extractMetadataFromBuffer(
        file.buffer,
        file.originalname
      );

      const metadataToSave: any = {
        file_id: updated.file_id,
        file_size: metadata.file_size ? BigInt(metadata.file_size) : null,
        file_type: metadata.file_type,
        mime_type: metadata.mime_type,
        author: metadata.author,
        creator: metadata.creator,
        producer: metadata.producer,
        creation_date: metadata.creation_date,
        modification_date: metadata.modification_date,
        is_encrypted: metadata.is_encrypted,
        checksum: metadata.checksum,
        version: metadata.version,
      };

      Object.keys(metadataToSave).forEach(key => metadataToSave[key] === undefined && delete metadataToSave[key]);

      const metadataRecord = await prisma.documentMetadata.create({
        data: metadataToSave,
      });

      console.log('Document metadata updated:', JSON.stringify(metadataRecord, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2
      ));
    } catch (error) {
      console.error('Failed to extract or save document metadata:', error);
    }

    // Delete previous file from disk after updating (skip if path is unchanged)
    if (previousPath && previousPath !== storagePath) {
      try {
        await deleteFile(previousPath);
      } catch (error) {
        console.error('Error deleting previous file from disk:', error);
      }
    }

    return {
      id: updated.file_id,
      name: updated.original_name,
      size: Number(updated.file_size),
      type: updated.mime_type,
      version: updated.version,
      isPrimary: updated.is_primary,
      uploadDate: updated.uploaded_at,
      versionGroupId: updated.version_group_id
    };
  }

  /**
   * Get document files with checkout info
   */
  async getFilesForDocument(documentId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    const files = await prisma.documentFile.findMany({
      where: { document_id: documentId },
      include: {
        checked_out_by: {
          include: {
            checked_out_by_account: {
              select: {
                account_id: true,
                user: {
                  select: {
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { uploaded_at: 'desc' },
    });

    return files.map((file: any) => {
      const checkoutInfo = file.checked_out_by?.[0];
      const checkedOutByAccount = checkoutInfo?.checked_out_by_account;

      return {
        id: file.file_id,
        name: file.original_name,
        size: Number(file.file_size),
        type: file.mime_type,
        version: file.version,
        isPrimary: file.is_primary,
        checksum: file.checksum,
        uploadDate: file.uploaded_at,
        downloadUrl: `/api/documents/${documentId}/files/${file.file_id}/download`,
        checkout: file.checkout,
        checkedOutBy: checkedOutByAccount
          ? {
            accountId: checkedOutByAccount.account_id,
            name: `${checkedOutByAccount.user.first_name} ${checkedOutByAccount.user.last_name}`.trim(),
          }
          : null,
        versionGroupId: file.version_group_id,
        documentGroupId: file.document_group_id,
        documentGroupName: file.document_group_name,
      };
    });
  }

  /**
   * Get document files
   */
  async getDocumentFiles(documentId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    const files = await prisma.documentFile.findMany({
      where: { document_id: documentId },
      orderBy: { uploaded_at: 'desc' }
    });

    return files.map((file: any) => ({
      id: file.file_id,
      name: file.original_name,
      size: Number(file.file_size),
      type: file.mime_type,
      version: file.version,
      isPrimary: file.is_primary,
      checksum: file.checksum,
      uploadDate: file.uploaded_at,
      downloadUrl: `/api/documents/${documentId}/files/${file.file_id}/download`,
      versionGroupId: file.version_group_id,
    }));
  }

  /**
   * Download document file
   */
  async downloadDocumentFile(documentId: string, fileId: string) {
    // Validate UUID format for document id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    const file = await prisma.documentFile.findFirst({
      where: {
        file_id: fileId,
        document_id: documentId
      }
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.storage_path.startsWith('s3://')) {
      const stream = await s3Storage.getObjectStream(file.storage_path);
      return {
        stream,
        fileName: file.original_name,
        mimeType: file.mime_type
      };
    }

    if (!fs.existsSync(file.storage_path)) {
      console.error(`File not found on disk: ${file.storage_path} for file_id: ${fileId}, document_id: ${documentId}`);
      throw new Error('File not found on disk');
    }

    const stream = fs.createReadStream(file.storage_path);
    return {
      stream,
      fileName: file.original_name,
      mimeType: file.mime_type
    };
  }

  /**
   * Delete document file
   */
  async deleteDocumentFile(documentId: string, fileId: string, userId: string) {
    const file = await prisma.documentFile.findFirst({
      where: {
        file_id: fileId,
        document_id: documentId
      }
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Delete file from disk
    try {
      await deleteFile(file.storage_path);
    } catch (error) {
      console.error('Error deleting file from disk:', error);
    }

    // Delete metadata from database
    await prisma.documentFile.delete({
      where: { file_id: fileId }
    });

    return { success: true };
  }

  /**
   * Create a new document (legacy method for backward compatibility)
   */
  async createDocument(documentData: any, userId: string) {
    // Verify user exists and get department
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        department_id: true,
        first_name: true,
        last_name: true,
        account: {
          select: {
            account_id: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.account?.account_id) {
      throw new Error('User account context missing');
    }

    // Create the document
    // Get document type name if type_id is provided
    let documentTypeName = documentData.document_type || 'General';
    if (documentData.type_id) {
      const docType = await prisma.documentType.findUnique({
        where: { type_id: documentData.type_id },
        select: { name: true }
      });
      if (docType) {
        documentTypeName = docType.name;
      }
    }

    const document = await this.createDocumentRecord(
      {
        title: documentData.document_name,
        description: documentData.description || null,
        document_type: documentTypeName,
        process_type_id: documentData.process_type_id || documentData.processTypeId || null,
        classification: documentData.classification,
        origin: documentData.origin,
        status: 'pending'
      } as any,
      user.department_id
    );

    // Create DocumentAdditionalDetails with work_flow_id in the format {"first": "departmentId"}
    const workflowObject = {
      first: user.department_id
    };

    await prisma.documentAdditionalDetails.create({
      data: {
        document_id: document.document_id,
        work_flow_id: workflowObject as any, // Initialize with creator's department as "first"
        remarks: documentData.remarks || null,
        account_id: user.account.account_id // Store the creator's account ID
      }
    });

    // Emit socket event to notify frontends of new document
    const io = getSocketInstance();
    if (io) {
      io.emit('documentAdded', {
        documentId: document.document_id,
        title: document.title,
        document_code: document.document_code,
        classification: document.classification,
        document_type: document.document_type,
        status: document.status,
        created_at: document.created_at,
        department_id: user.department_id,
        created_by: {
          first_name: user.first_name,
          last_name: user.last_name,
        },
      });
    } else {
      console.error('[DocumentService] Socket.IO instance not available. Could not emit documentAdded event.');
    }

    // Create a document trail entry for document creation
    const documentTrailsService = new DocumentTrailsService();
    try {
      await documentTrailsService.createDocumentTrail({
        document_id: document.document_id,
        from_department: user.department_id,
        to_department: user.department_id, // Document created in the same department
        user_id: userId,
        status: 'pending',
        remarks: `Document created by ${user.first_name} ${user.last_name}`
      });
    } catch (error) {
      console.error('Error creating document trail for document creation:', error);
    }

    // Send notifications for document creation
    const notificationService = new NotificationService();
    try {
      // Notify the creator that the document was created
      const notification = await notificationService.createDocumentCreatedNotification(
        userId,
        document.document_id,
        document.title
      );
    } catch (error) {
      console.error('Error creating notification for document creation:', error);
    }

    return document;
  }

  /**
   * Scan a directory and create documents from the files found.
   */
  async scanDocuments(directoryPath: string, userId: string): Promise<PrismaDocument[]> {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { account: { select: { account_id: true } } },
    });

    if (!user?.account?.account_id) {
      throw new Error('User not found or user account context missing');
    }

    const createdDocuments: PrismaDocument[] = [];
    const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(directoryPath, file.name);
      if (file.isDirectory()) {
        // Recursively scan subdirectories
        const subDirDocs = await this.scanDocuments(fullPath, userId);
        createdDocuments.push(...subDirDocs);
      } else {
        try {
          const fileStats = await fs.promises.stat(fullPath);
          const documentData = {
            title: path.basename(file.name, path.extname(file.name)),
            description: `Scanned document: ${file.name}`,
            classification: 'simple',
            origin: 'internal',
          };

          // Mimic Express.Multer.File object
          const multerFile: Express.Multer.File = {
            fieldname: 'file',
            originalname: file.name,
            encoding: '',
            mimetype: this.documentMetadataService.getMimeTypeFromExtension(path.extname(file.name)),
            size: fileStats.size,
            destination: directoryPath,
            filename: file.name,
            path: fullPath,
            stream: fs.createReadStream(fullPath),
            buffer: await fs.promises.readFile(fullPath),
          };

          const newDoc = await this.createDocumentWithFile(documentData, multerFile, userId);
          createdDocuments.push(newDoc);
        } catch (error) {
          console.error(`Failed to process scanned file ${fullPath}:`, error);
        }
      }
    }
    return createdDocuments;
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, updateData: any, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid document ID format');
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { account_id: true }
    });

    if (!user || !user.account_id) {
      throw new Error('User not found.');
    }

    const existingDocument = await prisma.document.findUnique({
      where: { document_id: id },
    });

    if (!existingDocument) {
      throw new Error('Document not found');
    }

    // Check if any of the document's files are checked out by another user
    const checkedOutFiles = await prisma.userCheckout.findMany({
      where: {
        file_id: {
          in: (await prisma.documentFile.findMany({
            where: { document_id: id },
            select: { file_id: true }
          })).map(file => file.file_id)
        },
        checked_out_by: { not: user.account_id }
      },
      include: {
        checked_out_by_account: {
          include: { user: true }
        }
      }
    });

    if (checkedOutFiles.length > 0) {
      const firstCheckedOutFile = checkedOutFiles[0];
      const userName = firstCheckedOutFile.checked_out_by_account?.user
        ? `${firstCheckedOutFile.checked_out_by_account.user.first_name} ${firstCheckedOutFile.checked_out_by_account.user.last_name}`
        : 'another user';
      throw new Error(`Document file is checked out by ${userName} and cannot be updated.`);
    }

    const updateFields: any = {
      updated_at: new Date()
    };

    if (updateData.name) updateFields.title = updateData.name;
    if (updateData.content !== undefined) updateFields.description = updateData.content;
    if (updateData.classification) updateFields.classification = updateData.classification;
    if (updateData.origin) updateFields.origin = updateData.origin;
    if (updateData.document_type) updateFields.document_type = updateData.document_type;
    if (updateData.process_type_id !== undefined) updateFields.process_type_id = updateData.process_type_id;

    const document = await prisma.document.update({
      where: { document_id: id },
      data: updateFields
    });

    // Emit socket event to notify frontends of document update
    const io = getSocketInstance();
    io.emit('documentUpdated', {
      documentId: document.document_id,
      title: document.title,
      document_code: document.document_code,
      classification: document.classification,
      document_type: document.document_type,
      status: document.status,
      updated_at: document.updated_at
    });

    return document;
  }

  /**
   * Creates signed documents based on existing placeholders for a user.
   */
  async signDocumentFromPlaceholders(documentId: string, userId: string, signatureData: string): Promise<{ signedCount: number }> {
    // 1. Get the user.
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, department_id: true }
    });

    if (!user) {
      throw new Error('User not found.');
    }

    // 2. Find placeholders assigned to the user or their department.
    const placeholders = await prisma.signaturePlaceholder.findMany({
      where: {
        document_id: documentId,
        OR: [
          { assigned_user_id: userId },
          { assigned_user_id: null, department_id: user.department_id },
          { assigned_user_id: null, department_id: null },
        ],
      },
    });

    if (placeholders.length === 0) {
      throw new Error('No signature placeholders found for this document.');
    }

    // 3. Prepare data for SignedDocument records.
    const signedDocumentsData = placeholders.map(p => ({
      document_id: p.document_id,
      documentFileFile_id: p.document_file_id,
      signee_id: userId,
      x_position: p.x_position,
      y_position: p.y_position,
      width: p.width,
      height: p.height,
      page_number: p.page_number,
      signature_data: signatureData,
    }));

    // 4. Create SignedDocument records and update placeholders status in a transaction.
    await prisma.$transaction(async (tx) => {
      await tx.signedDocument.createMany({
        data: signedDocumentsData,
      });

      await tx.signaturePlaceholder.updateMany({
        where: {
          placeholder_id: {
            in: placeholders.map(p => p.placeholder_id),
          },
        },
        data: {
          signature_status: true,
        },
      });
    });

    // Optionally, update document status or create a trail
    await auditService.logDocumentSigned(userId, documentId, {
      description: `Document signed by user ${userId}.`,
      status: 'signed',
    });

    console.log(`≡ƒôì [signDocumentFromPlaceholders] Successfully signed ${signedDocumentsData.length} placeholders for document ${documentId}`);

    return { signedCount: signedDocumentsData.length };
  }

  /**
   * Manually signs a document by creating a SignedDocument record with specified coordinates.
   */
  async createSignedDocument(
    documentId: string,
    userId: string,
    signatureData: string,
    x_position: number,
    y_position: number,
    width: number,
    height: number,
    page_number: number
  ) {
    // 1. Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return { success: false, error: 'Invalid document ID format' };
    }
    if (!uuidRegex.test(userId)) {
      return { success: false, error: 'Invalid user ID format' };
    }

    try {
      // 2. Verify user exists
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          department_id: true,
          first_name: true,
          last_name: true,
          account: { select: { email: true } },
        },
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // 3. Verify document exists
      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: {
          DocumentAdditionalDetails: true,
          files: {
            orderBy: [{ is_primary: 'desc' }, { uploaded_at: 'desc' }],
          },
        },
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      // 4. Determine which document file the signature is being applied to
      const targetDocumentFile = document.files.find(file => file.is_primary) || document.files[0];

      if (!targetDocumentFile) {
        return { success: false, error: 'Document has no files to sign' };
      }

      // 5. Create SignedDocument record
      const createdSignedDocument = await prisma.signedDocument.create({
        data: {
          document_id: documentId,
          documentFileFile_id: targetDocumentFile.file_id,
          signee_id: userId,
          x_position: x_position,
          y_position: y_position,
          width: width,
          height: height,
          page_number: page_number,
          signature_data: signatureData,
          // signed_at: new Date() // Automatically set by @default(now())
        },
      });

      // 5.5 Update the corresponding signature placeholder's status to true
      // Find the signature placeholder that matches the position and document file
      const EPSILON = 0.5; // Small tolerance for floating point comparisons
      const signaturePlaceholder = await prisma.signaturePlaceholder.findFirst({
        where: {
          document_file_id: targetDocumentFile.file_id,
          page_number: page_number,
          // Using approximate matching for positions due to potential floating point precision differences
          x_position: {
            gte: x_position - EPSILON,
            lte: x_position + EPSILON
          },
          y_position: {
            gte: y_position - EPSILON,
            lte: y_position + EPSILON
          },
          width: {
            gte: width - EPSILON,
            lte: width + EPSILON
          },
          height: {
            gte: height - EPSILON,
            lte: height + EPSILON
          }
        }
      });

      if (signaturePlaceholder) {
        await prisma.signaturePlaceholder.update({
          where: {
            placeholder_id: signaturePlaceholder.placeholder_id
          },
          data: {
            signature_status: true
          }
        });
      }

      // 6. Update document status to 'signed' and relevant details in DocumentAdditionalDetails
      // Ensure DocumentAdditionalDetails exists or create it
      let docAdditionalDetails = document.DocumentAdditionalDetails?.[0];

      if (docAdditionalDetails) {
        await prisma.documentAdditionalDetails.update({
          where: { detail_id: docAdditionalDetails.detail_id },
          data: {
            // Only update if not already signed via blockchain or other methods
            blockchain_status: docAdditionalDetails.blockchain_status || 'signed_manual',
            signed_at: new Date(),
            signed_by: userId,
            updated_at: new Date(),
          },
        });
      } else {
        // If no additional details exist, create a new one
        await prisma.documentAdditionalDetails.create({
          data: {
            document_id: documentId,
            blockchain_status: 'signed_manual',
            signed_at: new Date(),
            signed_by: userId,
            // You might want to initialize work_flow_id etc. here if necessary
          },
        });
      }

      // 7. Create a document trail entry for this action
      const documentTrailsService = new DocumentTrailsService();
      await documentTrailsService.createDocumentTrail({
        document_id: documentId,
        user_id: userId,
        from_department: user.department_id,
        to_department: user.department_id, // Assuming signed within the same department context
        status: 'signed',
        remarks: `Document manually signed by ${user.first_name} ${user.last_name} on page ${page_number}.`,
      });

      // 8. Emit socket event to notify frontends of document update (optional, but good for real-time UIs)
      const io = getSocketInstance();
      io.emit('documentUpdated', {
        documentId: documentId,
        status: 'signed',
        updatedBy: userId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, data: createdSignedDocument };
    } catch (error: any) {
      console.error('≡ƒôì [createSignedDocument] Error:', error);
      return { success: false, error: error.message || 'Failed to manually sign document' };
    }
  }

  /**
   * Delete a document (soft delete by changing status)
   */
  async deleteDocument(id: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid document ID format');
    }


    try {
      console.log('≡ƒôì [deleteDocument] Attempting to delete document:', id, 'by user:', userId);

      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true, department_id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prisma.$transaction(async (tx) => {
        await tx.document.update({
          where: { document_id: id },
          data: {
            status: 'deleted',
            deleted_at: new Date(), // Set deleted_at on the main document
            updated_at: new Date(),
          },
        });

        await tx.documentAdditionalDetails.updateMany({
          where: { document_id: id },
          data: {
            deleted_by: user.account_id,
            deleted_at: new Date(),
          },
        });
      });

      const documentTrailsService = new DocumentTrailsService();
      try {
        await documentTrailsService.createDocumentTrail({
          document_id: id,
          from_department: user.department_id,
          to_department: user.department_id,
          user_id: userId,
          status: 'deleted',
          remarks: 'Document moved to recycle bin'
        });
      } catch (error) {
        console.error('Error creating document trail for document deletion:', error);
      }

      // Emit socket event to notify frontends of document deletion
      const io = getSocketInstance();
      io.emit('documentDeleted', {
        documentId: id,
        deleted_at: new Date()
      });

      console.log('≡ƒôì [deleteDocument] Document successfully deleted:', id);
      return true;
    } catch (error: any) {
      // Handle case where document doesn't exist
      if (error.code === 'P2025') {
        console.log('≡ƒôì [deleteDocument] Document not found:', id);
        throw new Error('Document not found');
      }
      console.error('≡ƒôì [deleteDocument] Error:', error);
      throw error;
    }
  }

  /**
   * Get document types (stub method)
   */
  async getDocumentTypes() {
    return await prisma.documentType.findMany({
      where: {
        active: true
      }
    });
  }

  /**
   * Complete a document
   */
  async completeDocument(documentId: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return { success: false, error: 'Invalid document ID format' };
    }

    try {
      const document = await prisma.document.findUnique({
        where: { document_id: documentId }
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      const updatedDocument = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'completed',
          deleted_at: new Date(), // Automatically archive completed documents
          updated_at: new Date()
        }
      });

      // Create a document trail entry for document completion
      const documentTrailsService = new DocumentTrailsService();
      try {
        const completingUser = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { department_id: true, first_name: true, last_name: true }
        });

        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: completingUser?.department_id,
          to_department: completingUser?.department_id, // Completed in same department
          user_id: userId,
          status: 'completed',
          remarks: `Document completed by ${completingUser?.first_name} ${completingUser?.last_name}`
        });
      } catch (error) {
        console.error('Error creating document trail for document completion:', error);
      }

      await recordCompletionStatus(documentId, { userId });

      // Ensure ProcessStatus reflects completion (in case trail sync did not run)
      try {
        const processStatusService = new ProcessStatusService();
        await processStatusService.syncForDocument(documentId);
      } catch (syncError) {
        console.error('Error syncing ProcessStatus after completion:', syncError);
      }

      // Emit socket event for real-time updates
      const io = getSocketInstance();
      const emailService = new EmailService();
      if (io) {
        io.emit('documentUpdated', {
          documentId: documentId,
          status: 'completed',
          updatedBy: userId,
          timestamp: new Date().toISOString()
        });

        // Emit specific event for document completion notification
        // Get document details for the notification
        const document = await prisma.document.findUnique({
          where: { document_id: documentId },
          select: { title: true }
        });

        io.emit('documentCompleted', {
          documentId: documentId,
          documentTitle: document?.title || 'Untitled Document',
          completedBy: userId,
          timestamp: new Date().toISOString()
        });
      }

      // Send email notification about document completion
      // Get document details and related users
      const documentWithDetails = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: {
          DocumentAdditionalDetails: true
        }
      });

      if (documentWithDetails) {
        // Get the completing user's name
        const completingUser = await prisma.user.findUnique({
          where: { user_id: userId },
          include: { account: { select: { email: true } } }
        });

        const completingUserName = completingUser ? `${completingUser.first_name} ${completingUser.last_name}` : 'A colleague';

        // Find users who should be notified about the completion
        // This includes the original creator and any workflow participants
        const documentDetail = documentWithDetails.DocumentAdditionalDetails?.[0];
        let usersToNotify = [];

        // Add notifications based on available information
        // For now, we just notify the completing user that they completed the document

        // Send completion notifications
        const emailData: DocumentCompletedEmailData = {
          recipientEmail: completingUser?.account?.email || '', // Default to empty if no email
          recipientName: completingUserName,
          documentTitle: documentWithDetails.title,
          completedBy: completingUserName,
          documentUrl: `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/documents/${documentId}`,
          message: `A document has been marked as completed by ${completingUserName}.`
        };

        // Only send if we have a valid email
        if (emailData.recipientEmail) {
          // Send email notification asynchronously
          emailService.sendDocumentCompletedEmail(emailData).catch(err => {
            console.error(`Failed to send document completed email to ${emailData.recipientEmail}:`, err);
          });
        }

        // Send completion notifications via the notification service
        const notificationService = new NotificationService();
        try {
          // Get users who should be notified about the completion
          // This includes the original creator and any workflow participants
          const documentDetail = documentWithDetails.DocumentAdditionalDetails?.[0];

          if (documentDetail && documentDetail.work_flow_id) {
            const workflowDepartments = this.parseWorkflowDepartments(
              documentDetail.work_flow_id,
              'documentCompletionNotifications'
            );

            // Get users from departments that were in the workflow to notify them
            if (workflowDepartments.length > 0) {
              for (const deptId of workflowDepartments) {
                const workflowUsers = await prisma.user.findMany({
                  where: {
                    department_id: deptId,
                    active: true
                  },
                  select: {
                    user_id: true
                  }
                });

                for (const user of workflowUsers) {
                  await notificationService.createDocumentCompletedNotification(
                    user.user_id,
                    documentId,
                    documentWithDetails.title
                  );
                }
              }
            }
          }
        } catch (notificationError) {
          console.error('Error creating completion notifications:', notificationError);
        }
      }

      return {
        success: true,
        data: { message: 'Document completed successfully' }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to complete document'
      };
    }
  }

  /**
   * Uncomplete a document (revert from completed to pending status)
   */
  async uncompleteDocument(documentId: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return { success: false, error: 'Invalid document ID format' };
    }

    try {
      const document = await prisma.document.findUnique({
        where: { document_id: documentId }
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      // Check if document is actually completed
      if (document.status?.toLowerCase() !== 'completed') {
        return { success: false, error: 'Document is not in completed status' };
      }

      const updatedDocument = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'pending',
          deleted_at: null, // Remove archive date
          updated_at: new Date()
        }
      });

      // Create a document trail entry for document uncompletion
      const documentTrailsService = new DocumentTrailsService();
      try {
        const uncompletingUser = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { department_id: true, first_name: true, last_name: true }
        });

        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: uncompletingUser?.department_id,
          to_department: uncompletingUser?.department_id,
          user_id: userId,
          status: 'pending',
          remarks: `Document status reverted from completed by ${uncompletingUser?.first_name} ${uncompletingUser?.last_name}`
        });
      } catch (error) {
        console.error('Error creating document trail for document uncompletion:', error);
      }

      // Emit socket event for real-time updates
      const io = getSocketInstance();
      if (io) {
        io.emit('documentUpdated', {
          documentId: documentId,
          status: 'pending',
          updatedBy: userId,
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: { message: 'Document status reverted successfully' }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to uncomplete document'
      };
    }
  }

  /**
   * Cancel a document
   */
  async cancelDocument(documentId: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return { success: false, error: 'Invalid document ID format' };
    }

    try {
      const document = await prisma.document.findUnique({
        where: { document_id: documentId }
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      const updatedDocument = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'cancelled',
          updated_at: new Date()
        }
      });

      // Create a document trail entry for document cancellation
      const documentTrailsService = new DocumentTrailsService();
      try {
        const cancelingUser = await prisma.user.findUnique({
          where: { user_id: userId },
          select: { department_id: true, first_name: true, last_name: true }
        });

        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: cancelingUser?.department_id,
          to_department: cancelingUser?.department_id, // Canceled in same department
          user_id: userId,
          status: 'canceled',
          remarks: `Document canceled by ${cancelingUser?.first_name} ${cancelingUser?.last_name}`
        });
      } catch (error) {
        console.error('Error creating document trail for document cancellation:', error);
      }

      // Emit socket event for real-time updates
      const io = getSocketInstance();
      if (io) {
        io.emit('documentUpdated', {
          documentId: documentId,
          status: 'cancelled',
          updatedBy: userId,
          timestamp: new Date().toISOString()
        });

        io.emit('documentCanceled', {
          documentId: documentId,
          documentTitle: document.title,
          canceledBy: userId,
          timestamp: new Date().toISOString()
        });
      }

      return {
        success: true,
        data: { message: 'Document canceled successfully' }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to cancel document'
      };
    }
  }

  /**
   * Receive a document
   */
  async receiveDocument(documentId: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return { success: false, error: 'Invalid document ID format' };
    }

    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true, first_name: true, last_name: true }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: { DocumentAdditionalDetails: true },
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      if (document.status === 'cancelled') {
        return { success: false, error: 'Document is cancelled' };
      }

      // Update status to 'received'
      const updatedDocument = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          status: 'received',
          updated_at: new Date(),
        },
      });

      // Create a document trail entry for document received
      const documentTrailsService = new DocumentTrailsService();
      try {
        // For receiving, we want to identify the department that sent the document
        // This would typically be the last department in the workflow that was not the receiving department
        let fromDepartmentId: string | undefined = undefined;
        if (document.DocumentAdditionalDetails?.[0]?.work_flow_id) {
          const workflow = document.DocumentAdditionalDetails[0].work_flow_id as any;
          if (typeof workflow === 'object' && workflow !== null) {
            const workflowDepartments = Object.values(workflow) as string[];
            // Find the department that sent this document (the one before the current receiver)
            // For simplicity, if workflow has multiple departments, get the one that's not the receiver
            const deptIndex = workflowDepartments.lastIndexOf(user.department_id);
            if (deptIndex > 0 && workflowDepartments[deptIndex - 1]) {
              fromDepartmentId = workflowDepartments[deptIndex - 1];
            } else if (workflowDepartments.length > 1) {
              // If the receiving dept is not in the workflow, take the last department
              fromDepartmentId = workflowDepartments[workflowDepartments.length - 1];
            }
          }
        }

        await documentTrailsService.createDocumentTrail({
          document_id: documentId,
          from_department: fromDepartmentId,
          to_department: user.department_id,
          user_id: userId,
          status: 'received',
          remarks: `Document received by ${user.first_name} ${user.last_name} in ${user.department_id}`
        });
      } catch (error) {
        console.error('Error creating document trail for document received:', error);
      }

      const detail = document.DocumentAdditionalDetails[0];
      if (detail) {
        const receivedByUserIds = detail.received_by_departments ? (detail.received_by_departments as string[]) : [];
        if (!receivedByUserIds.includes(userId)) {
          receivedByUserIds.push(userId);
        }

        await prisma.documentAdditionalDetails.update({
          where: { detail_id: detail.detail_id },
          data: {
            received_by_departments: receivedByUserIds as any,
          },
        });

        if (user.department_id) {
          await recordReceiveStatus(documentId, {
            departmentId: user.department_id,
            userId
          });
        }
      }

      // Emit socket event
      const io = getSocketInstance();
      io.emit('documentUpdated', {
        documentId: documentId,
        status: 'received',
      });
      io.to(`user-${userId}`).emit('documentAddedToUser', {
        documentId,
      });

      // Send notification to the user who received the document
      const notificationService = new NotificationService();
      try {
        await notificationService.createDocumentReceivedNotification(
          userId,
          documentId,
          document.title
        );
      } catch (notificationError) {
        console.error('Error creating notification for document received:', notificationError);
      }

      return { success: true, data: updatedDocument };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }



  /**
   * Sign document with blockchain using DOCONCHAIN
   */
  async signDocumentWithBlockchain(
    documentId: string,
    userId: string,
    options: SignDocumentOptions | string | undefined = undefined
  ) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return { success: false, error: 'Invalid document ID format' };
    }

    let documentDetailRecord: any = null;

    try {
      const signOptions: SignDocumentOptions =
        typeof options === 'string' ? { signature: options } : options ?? {};

      console.log('≡ƒôì [signDocumentWithBlockchain] Signing document:', documentId, 'by user:', userId);

      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          account_id: true,
          first_name: true,
          last_name: true,
          department_id: true,
          account: {
            select: {
              email: true
            }
          }
        }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const document = await prisma.document.findUnique({
        where: { document_id: documentId },
        include: {
          DocumentAdditionalDetails: true
        }
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      documentDetailRecord = document.DocumentAdditionalDetails?.[0] || null;

      if (!documentDetailRecord) {
        return { success: false, error: 'Document details not found' };
      }

      if (documentDetailRecord.blockchain_status && ['processing', 'signed'].includes(documentDetailRecord.blockchain_status)) {
        return { success: false, error: 'Document has already been submitted to DocOnChain' };
      }

      const documentFiles = await prisma.documentFile.findMany({
        where: { document_id: documentId },
        orderBy: [
          { is_primary: 'desc' },
          { uploaded_at: 'desc' }
        ]
      });

      let documentFile = documentFiles.find((file: any) => !this.isPlaceholderFile(file));

      if (!documentFile) {
        const placeholder = documentFiles.find((file: any) => this.isPlaceholderFile(file));
        if (placeholder) {
          const primaryCandidate = documentFiles.find((file: any) => file.is_primary && file.file_id !== placeholder.file_id);
          documentFile = primaryCandidate || (documentFiles.length > 0 ? documentFiles[0] : undefined);
        } else if (documentFiles.length > 0) {
          documentFile = documentFiles[0];
        }
      }

      if (!documentFile) {
        const placeholderFile = await this.createPlaceholderDocumentFile(documentId, document, documentDetailRecord, user);
        if (placeholderFile) {
          documentFile = placeholderFile;
        }
      }

      if (!documentFile) {
        return { success: false, error: 'Document has no file to send to DocOnChain' };
      }

      let fileBuffer: Buffer;
      if (documentFile.storage_path.startsWith('s3://')) {
        fileBuffer = await s3Storage.getObjectBuffer(documentFile.storage_path);
      } else {
        if (!fs.existsSync(documentFile.storage_path)) {
          return { success: false, error: 'Document file is missing from storage' };
        }
        fileBuffer = await fs.promises.readFile(documentFile.storage_path);
      }
      const fileName = documentFile.original_name || path.basename(documentFile.storage_path);

      await prisma.documentAdditionalDetails.update({
        where: { detail_id: documentDetailRecord.detail_id },
        data: {
          blockchain_status: 'pending',
          updated_at: new Date()
        }
      });

      const doconchainService = new DoconchainService();

      const projectResult = await doconchainService.createProject(fileBuffer, fileName, {
        projectName: document.title,
        description: document.description || undefined
      });

      const projectEnvelope = projectResult?.raw as Record<string, any> | undefined;
      if (projectEnvelope && projectEnvelope.success === false) {
        throw new Error(projectEnvelope.message || 'Failed to create DocOnChain project');
      }

      const projectData = projectResult?.data;
      if (!projectData) {
        throw new Error('DocOnChain project creation returned no data');
      }

      const projectUuid = projectData.project_uuid || projectData.uuid;
      const transactionHash = projectData.transaction_hash || null;
      const redirectUrl = projectData.redirect_url || projectData.redirect_to || null;

      if (!projectUuid) {
        throw new Error('DocOnChain response did not include a project identifier');
      }

      await prisma.documentAdditionalDetails.update({
        where: { detail_id: documentDetailRecord.detail_id },
        data: {
          blockchain_project_uuid: projectUuid,
          blockchain_tx_hash: transactionHash,
          blockchain_redirect_url: redirectUrl,
          blockchain_status: 'draft',
          signed_at: null,
          signed_by: null,
          updated_at: new Date()
        }
      });

      documentDetailRecord = {
        ...documentDetailRecord,
        blockchain_project_uuid: projectUuid,
        blockchain_tx_hash: transactionHash,
        blockchain_redirect_url: redirectUrl,
        blockchain_status: 'draft'
      };

      const normaliseSignerInput = (input: DoconchainSignerInput): DoconchainSignerInput => ({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        signerRole: input.signerRole ?? 'Signer',
        type: input.type ?? 'GUEST',
        sequence: input.sequence ?? 1,
        company: input.company,
        jobTitle: input.jobTitle,
        country: input.country
      });

      const toSignerPayload = (input: DoconchainSignerInput): SignerPayload => ({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        signer_role: input.signerRole ?? 'Signer',
        type: input.type ?? 'GUEST',
        sequence: input.sequence ?? 1,
        company: input.company,
        job_title: input.jobTitle,
        country: input.country
      });

      const primarySignerInput: DoconchainSignerInput = normaliseSignerInput({
        email: signOptions.primarySigner?.email ?? user.account?.email ?? '',
        firstName: signOptions.primarySigner?.firstName ?? user.first_name,
        lastName: signOptions.primarySigner?.lastName ?? user.last_name,
        signerRole: signOptions.primarySigner?.signerRole ?? 'Signer',
        type: signOptions.primarySigner?.type ?? 'GUEST',
        sequence: signOptions.primarySigner?.sequence ?? 1,
        company: signOptions.primarySigner?.company,
        jobTitle: signOptions.primarySigner?.jobTitle,
        country: signOptions.primarySigner?.country
      });

      if (!primarySignerInput.email) {
        return { success: false, error: 'Primary signer email is required for DocOnChain' };
      }

      const additionalSignersRaw = signOptions.additionalSigners || [];
      for (const rawSigner of additionalSignersRaw) {
        if (!rawSigner.email || !rawSigner.firstName || !rawSigner.lastName) {
          return { success: false, error: 'Additional signers must include email, firstName, and lastName' };
        }
      }

      const additionalSigners = additionalSignersRaw.map(normaliseSignerInput);

      const signerPayloads: SignerPayload[] = [
        toSignerPayload(primarySignerInput),
        ...additionalSigners.map(toSignerPayload)
      ];

      const signerIdMap = new Map<string, number | string>();
      const extractSignerRecords = (payload: any): any[] => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (payload?.data && Array.isArray(payload.data?.data)) return payload.data.data;
        if (payload?.data) return [payload.data];
        return [];
      };

      for (const signerPayload of signerPayloads) {
        const response = await doconchainService.addSigner(projectUuid, signerPayload);
        const records = extractSignerRecords(response);
        const matched = records.find((record: any) => record?.email?.toLowerCase?.() === signerPayload.email.toLowerCase());
        if (matched?.id !== undefined) {
          signerIdMap.set(signerPayload.email.toLowerCase(), matched.id);
        }
      }

      if (signOptions.marks && signOptions.marks.length > 0) {
        for (const mark of signOptions.marks) {
          const resolvedSignerId =
            mark.signerId ??
            (mark.signerEmail ? signerIdMap.get(mark.signerEmail.toLowerCase()) : undefined);

          if (resolvedSignerId === undefined) {
            throw new Error(`Unable to resolve signer for DocOnChain mark (${mark.signerEmail ?? 'unknown'})`);
          }

          const markPayload: SignerMarkPayload = {
            type: mark.type,
            position_x: mark.positionX,
            position_y: mark.positionY,
            width: mark.width,
            height: mark.height,
            page_no: mark.pageNo
          };

          if (mark.value !== undefined) markPayload.value = mark.value;
          if (mark.fontStyle !== undefined) markPayload.font_style = mark.fontStyle;
          if (mark.fontSize !== undefined) markPayload.font_size = mark.fontSize;
          if (mark.attach !== undefined) markPayload.attach = mark.attach;

          await doconchainService.addSignerMark(projectUuid, resolvedSignerId, markPayload);
        }
      }

      let finalStatus = 'draft';
      if (signOptions.sendEmail === true) {
        await doconchainService.sendProject(projectUuid);
        finalStatus = 'processing';

        await prisma.documentAdditionalDetails.update({
          where: { detail_id: documentDetailRecord.detail_id },
          data: {
            blockchain_status: finalStatus,
            updated_at: new Date()
          }
        });

        documentDetailRecord = {
          ...documentDetailRecord,
          blockchain_status: finalStatus
        };
      }

      const signerSummary = signerPayloads.map((payload) => ({
        email: payload.email,
        id: signerIdMap.get(payload.email.toLowerCase()) ?? null
      }));

      console.log('≡ƒôì [signDocumentWithBlockchain] DocOnChain project initialised:', projectUuid);

      return {
        success: true,
        data: {
          message: finalStatus === 'processing'
            ? 'DocOnChain signing request sent successfully'
            : 'DocOnChain project created successfully',
          projectUuid,
          transactionHash,
          redirectUrl,
          status: finalStatus,
          signers: signerSummary
        }
      };
    } catch (error: any) {
      console.error('≡ƒôì [signDocumentWithBlockchain] Error:', error);

      try {
        const fallbackDetail = documentDetailRecord
          ? documentDetailRecord
          : await prisma.documentAdditionalDetails.findFirst({ where: { document_id: documentId } });

        if (fallbackDetail) {
          await prisma.documentAdditionalDetails.update({
            where: { detail_id: fallbackDetail.detail_id },
            data: {
              blockchain_status: 'failed',
              blockchain_redirect_url: null,
              updated_at: new Date()
            }
          });
        }
      } catch (updateError) {
        console.error('≡ƒôì [signDocumentWithBlockchain] Failed to update error status:', updateError);
      }

      return {
        success: false,
        error: error?.message || 'Failed to initialise DocOnChain signing'
      };
    }
  }

  /**
   * Get all documents accessible to a user (owned by department OR specifically shared to user)
   */
  async getAllAccessibleDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      console.log('≡ƒôì [getAllAccessibleDocuments] Request:', { userId, page, limit });

      // Get the user's information
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: {
          department_id: true,
          first_name: true,
          last_name: true,
          account: {
            select: {
              email: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get all document additional details
      const allDocumentDetails = await prisma.documentAdditionalDetails.findMany({
        include: {
          Document: true  // Include the related document to verify status
        }
      });

      console.log('≡ƒôì [getAllAccessibleDocuments] Total document details found:', allDocumentDetails.length);

      // Filter documents that the user can access:
      // 1. Documents originated by their department (first in workflow), OR
      // 2. Documents specifically shared to the user (user ID in received_by_departments)
      const accessibleDocumentDetails = allDocumentDetails.filter((detail: any) => {
        // Check if document is not deleted
        if (detail.Document?.status === 'deleted') {
          console.log('≡ƒôì [getAllAccessibleDocuments] Document is deleted, skipping:', detail.document_id);
          return false;
        }

        let hasDepartmentAccess = false;
        let hasUserAccess = false;

        // Check department-level access - document originated by user's department
        if (detail.work_flow_id) {
          let workflowDepartments: string[] = [];

          if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
            // New format: object with keys like "first", "second", etc.
            workflowDepartments = Object.values(detail.work_flow_id)
              .map((value: any) => (value == null ? '' : String(value)))
              .filter((value: string) => value.length > 0);
          } else if (typeof detail.work_flow_id === 'string') {
            // Could be either a JSON string of an array or a JSON string of an object
            const parsed = JSON.parse(detail.work_flow_id);
            if (Array.isArray(parsed)) {
              workflowDepartments = parsed;
            } else {
              // If it's an object, get its values
              workflowDepartments = Object.values(parsed);
            }
          } else if (Array.isArray(detail.work_flow_id)) {
            // Old format: array
            workflowDepartments = detail.work_flow_id
              .map((value: any) => (value == null ? '' : String(value)))
              .filter((value: string) => value.length > 0);
          } else {
            // Unexpected format
            workflowDepartments = [];
          }

          // Check if user's department is the first (originator) in the workflow
          if (workflowDepartments.length > 0 && workflowDepartments[0] === user.department_id) {
            hasDepartmentAccess = true;
            console.log('≡ƒôì [getAllAccessibleDocuments] Document owned by department:', detail.document_id);
          }
        }

        // Check user-specific access
        if (detail.received_by_departments) {
          let receivedByUsers: string[] = [];

          // Handle different possible formats of received_by_departments (which now stores user IDs)
          if (Array.isArray(detail.received_by_departments)) {
            receivedByUsers = detail.received_by_departments as string[];
            console.log('≡ƒôì [getAllAccessibleDocuments] Document received_by_users (array):', detail.document_id, receivedByUsers);
          } else if (typeof detail.received_by_departments === 'string' && detail.received_by_departments) {
            try {
              receivedByUsers = JSON.parse(detail.received_by_departments);
              console.log('≡ƒôì [getAllAccessibleDocuments] Document received_by_users (parsed):', detail.document_id, receivedByUsers);
            } catch (e) {
              console.error('≡ƒôì [getAllAccessibleDocuments] Error parsing received_by_departments for doc', detail.document_id, e);
              return false;
            }
          } else if (detail.received_by_departments && typeof detail.received_by_departments === 'object') {
            // If it's already parsed as an object/array
            receivedByUsers = detail.received_by_departments as string[];
            console.log('≡ƒôì [getAllAccessibleDocuments] Document received_by_users (object):', detail.document_id, receivedByUsers);
          } else {
            console.log('≡ƒôì [getAllAccessibleDocuments] Document has no received_by_users, continuing:', detail.document_id);
          }

          // Check if the current user is in the received_by_users list
          if (receivedByUsers.includes(userId)) {
            hasUserAccess = true;
          }
        }

        return hasDepartmentAccess || hasUserAccess;
      });

      const accessibleDocumentIds = accessibleDocumentDetails.map((detail: any) => detail.document_id);

      console.log('≡ƒôì [getAllAccessibleDocuments] Accessible document IDs:', accessibleDocumentIds.length, accessibleDocumentIds);

      if (accessibleDocumentIds.length === 0) {
        console.log('≡ƒôì [getAllAccessibleDocuments] No accessible documents found for user');
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: {
            document_id: {
              in: accessibleDocumentIds
            },
            status: {
              not: 'deleted' // Exclude deleted documents
            }
          },
          include: {
            files: true
          },
          orderBy: {
            created_at: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.document.count({
          where: {
            document_id: {
              in: accessibleDocumentIds
            },
            status: {
              not: 'deleted' // Exclude deleted documents from count
            }
          }
        })
      ]);

      console.log('≡ƒôì [getAllAccessibleDocuments] Documents found:', documents.length, 'Total count:', total);

      // Create a map of document details for quick lookup
      const documentDetailsMap = new Map();
      accessibleDocumentDetails.forEach((detail: any) => {
        documentDetailsMap.set(detail.document_id, detail);
      });

      // Transform documents to frontend format with QR codes and barcodes
      const transformedDocuments = await Promise.all(
        documents.map(async (doc) => {
          // Generate QR code
          let qrCode = '';
          try {
            qrCode = await QRCode.toDataURL(doc.document_code || doc.document_id, {
              width: 100,
              margin: 1
            });
          } catch (err) {
            console.error('QR Code generation error:', err);
          }

          // Generate barcode
          let barcode = '';
          try {
            const canvas = await bwipjs.toBuffer({
              bcid: 'code128',
              text: doc.document_code || doc.document_id,
              scale: 2,
              height: 10,
              includetext: false
            });
            barcode = `data:image/png;base64,${canvas.toString('base64')}`;
          } catch (err) {
            console.error('Barcode generation error:', err);
          }

          // Determine if document is owned or shared based on workflow
          const detail = documentDetailsMap.get(doc.document_id);
          let isOwned = false;
          let contactOrganization = 'N/A';

          if (detail) {
            // Check if user's department is the first in workflow (owned) or if it's shared
            if (detail.work_flow_id) {
              let workflowDepartments: string[] = [];

              if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
                // New format: object with keys like "first", "second", etc.
                workflowDepartments = Object.values(detail.work_flow_id)
                  .map((value: any) => (value == null ? '' : String(value)))
                  .filter((value: string) => value.length > 0);
              } else if (typeof detail.work_flow_id === 'string') {
                // Could be either a JSON string of an array or a JSON string of an object
                const parsed = JSON.parse(detail.work_flow_id);
                if (Array.isArray(parsed)) {
                  workflowDepartments = parsed;
                } else {
                  // If it's an object, get its values
                  workflowDepartments = Object.values(parsed);
                }
              } else if (Array.isArray(detail.work_flow_id)) {
                // Old format: array
                workflowDepartments = detail.work_flow_id
                  .map((value: any) => (value == null ? '' : String(value)))
                  .filter((value: string) => value.length > 0);
              } else {
                // Unexpected format
                workflowDepartments = [];
              }

              if (workflowDepartments.length > 0) {
                const originatorDeptId = workflowDepartments[0];  // The "first" department is the originator
                isOwned = (originatorDeptId === user.department_id);

                const originatorDept = await prisma.department.findUnique({
                  where: { department_id: originatorDeptId },
                  select: { name: true }
                });

                if (originatorDept) {
                  contactOrganization = originatorDept.name;
                }
              }
            }
          }

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title,
            documentId: doc.document_code,
            contactPerson: `${user.first_name} ${user.last_name}`,
            contactOrganization: contactOrganization,
            currentLocation: contactOrganization,
            type: (doc as any).document_type || 'General',
            classification: doc.classification,
            status: doc.status,
            origin: doc.origin,
            activity: isOwned ? 'created' : 'shared',
            activityTime: doc.created_at.toISOString()
          };
        })
      );

      console.log('≡ƒôì [getAllAccessibleDocuments] Returning', transformedDocuments.length, 'documents');
      return {
        data: transformedDocuments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('≡ƒôì [getAllAccessibleDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Bulk delete documents (hard delete)
   */
  async bulkDeleteDocuments(documentIds: string[], userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { department_id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const documentsToDelete = await prisma.document.findMany({
      where: {
        document_id: {
          in: documentIds,
        },
        status: 'deleted',
      },
      include: {
        files: true, // Include the document files to be deleted
      },
    });

    const idsToDelete = documentsToDelete.map(doc => doc.document_id);

    if (idsToDelete.length === 0) {
      return { count: 0 };
    }

    // First, delete any related records to avoid foreign key constraint violations
    const fileIds = documentsToDelete.flatMap(doc => doc.files.map(file => file.file_id));
    if (fileIds.length > 0) {
      // Delete UserCheckout records (checkout history) associated with these files
      await prisma.userCheckout.deleteMany({
        where: {
          file_id: {
            in: fileIds,
          },
        },
      });

      // Delete DocumentMetadata records associated with these files
      await prisma.documentMetadata.deleteMany({
        where: {
          file_id: {
            in: fileIds,
          },
        },
      });
    }


    // Delete associated files from the filesystem before deleting from database
    for (const document of documentsToDelete) {
      for (const file of document.files) {
        try {
          await deleteFile(file.storage_path);
          console.log(`≡ƒôì [bulkDeleteDocuments] File deleted from filesystem: ${file.storage_path}`);
        } catch (error) {
          console.error(`≡ƒôì [bulkDeleteDocuments] Error deleting file from filesystem: ${file.storage_path}`, error);
          // Continue with deletion even if file deletion fails
        }
      }
    }

    const deleted = await prisma.document.deleteMany({
      where: {
        document_id: {
          in: idsToDelete,
        },
      },
    });

    if (deleted.count > 0) {
      const documentTrailsService = new DocumentTrailsService();
      await Promise.all(
        idsToDelete.map((documentId) =>
          documentTrailsService.createDocumentTrail({
            document_id: documentId,
            from_department: user.department_id,
            to_department: user.department_id,
            user_id: userId,
            status: 'deleted',
            remarks: 'Document permanently deleted'
          })
        )
      );

      const io = getSocketInstance();
      io.emit('documentDeleted', {
        documentIds: idsToDelete,
        permanent: true,
      });
    }

    return deleted;
  }

  async getDocumentOcrData(documentId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    // Get OCR data associated with the document
    const ocrData = await prisma.oCR_Json.findMany({
      where: { documentDocument_id: documentId },
      orderBy: {
        created_at: 'desc' // Get most recent OCR data first
      }
    });

    return ocrData;
  }
}
