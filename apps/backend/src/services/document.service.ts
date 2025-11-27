import { prisma } from '../lib/prisma';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { getFileMetadata, deleteFile } from '../middleware/upload.middleware';
import { DoconchainService, SignerMarkPayload, SignerPayload, SignerRole } from './doconchain.service';
import { getSocketInstance } from '../socket';
import { EmailService, DocumentSharedEmailData, DocumentReleasedEmailData, DocumentCompletedEmailData } from './email.service';
import { DocumentMetadataService } from './document-metadata.service';
import { DocumentTrailsService } from './document-trails.service';
import { NotificationService } from './notification.service';
import { recordCompletionStatus, recordCreationStatus, recordReceiveStatus } from './workflow-status.service';
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
  private readonly prismaAny = prisma as any;
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
      console.error(`📍 [${context}] Error parsing work_flow_id:`, error);
    }

    return [];
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

      const uploadsDir = path.join(process.cwd(), 'uploads', 'generated');
      await fs.promises.mkdir(uploadsDir, { recursive: true });

      const storedName = `${documentId}-placeholder-${Date.now()}.pdf`;
      const storagePath = path.join(uploadsDir, storedName);
      await fs.promises.writeFile(storagePath, buffer);

      const checksum = await this.calculateChecksum(storagePath);

      const uploadedBy = user?.account_id ?? detail?.account_id;
      if (!uploadedBy) {
        throw new Error('Missing account reference for placeholder upload');
      }

      const created = await this.prismaAny.documentFile.create({
        data: {
          document_id: documentId,
          original_name: `${document?.document_code || documentId}-placeholder.pdf`,
          stored_name: storedName,
          storage_path: storagePath,
          file_size: BigInt(buffer.length),
          mime_type: 'application/pdf',
          checksum,
          is_primary: false,
          uploaded_by: uploadedBy,
        },
      });

      return created;
    } catch (error) {
      console.error('📍 [createPlaceholderDocumentFile] Failed to create placeholder document:', error);
      return null;
    }
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

      console.log('📍 [getOwnedDocuments] Total document details found:', documentDetails.length);

      // Filter documents where user's department is the FIRST in work_flow_id (owned/uploaded documents)
      const relevantDocumentIds = documentDetails
        .filter((detail: any) => {
          if (!detail.work_flow_id) {
            console.log('📍 [getOwnedDocuments] Document has no workflow, skipping:', detail.document_id);
            return false; // Exclude documents without workflow
          }

          // Parse the work_flow_id - handle both old array format and new object format
          try {
            let workflowDepartments: string[] = [];

            if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
              // New format: object with keys like "first", "second", etc.
              workflowDepartments = Object.values(detail.work_flow_id);
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
              workflowDepartments = detail.work_flow_id;
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is the FIRST entry in workflow (originated from this department)
            // In the new format, the "first" key corresponds to the first element
            const isOwned = workflowDepartments.length > 0 && workflowDepartments[0] === user.department_id;
            if (isOwned) {
              console.log('📍 [getOwnedDocuments] Document owned by department:', detail.document_id);
            }
            return isOwned;
          } catch (e) {
            console.error('📍 [getOwnedDocuments] Error parsing work_flow_id:', e);
            return false;
          }
        })
        .map((detail: any) => detail.document_id);

      console.log('📍 [getOwnedDocuments] Relevant document IDs:', relevantDocumentIds.length);

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
              notIn: ['deleted', 'intransit', 'dispatch']
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
              notIn: ['deleted', 'intransit', 'dispatch']
            }
          }
        })
      ]);

      console.log('📍 [getOwnedDocuments] Documents fetched:', documents.length, 'Total:', total);

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
            contactPerson: `${user.first_name} ${user.last_name}`,
            contactOrganization: department?.name || 'N/A',
            currentLocation: department?.name || 'N/A',
            type: (doc as any).document_type || 'General',
            classification: doc.classification,
            status: doc.status,
            activity: 'created',
            activityTime: doc.created_at.toISOString()
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
      console.error('📍 [getOwnedDocuments] Error:', error);
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

      console.log('📍 [getAllDocuments] Total document details found:', documentDetails.length);

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
                workflowDepartments = Object.values(detail.work_flow_id);
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
                workflowDepartments = detail.work_flow_id;
              } else {
                // Unexpected format
                workflowDepartments = [];
              }

              // Store workflow for later use - use the array of departments
              documentWorkflowMap.set(detail.document_id, workflowDepartments);

              // Check if user's department is the FIRST entry in workflow (originated from this department)
              hasDepartmentAccess = workflowDepartments.length > 0 && workflowDepartments[0] === user.department_id;
            } catch (e) {
              console.error('📍 [getAllDocuments] Error parsing work_flow_id:', e);
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
              console.error('📍 [getAllDocuments] Error parsing received_by_departments:', e);
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

      console.log('📍 [getAllDocuments] Relevant document IDs:', relevantDocumentIds.length);

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
              not: 'deleted' // Exclude deleted documents
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
              not: 'deleted' // Exclude deleted documents from count
            }
          }
        })
      ]);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const documentTypeIds = [...new Set(documents.map(doc => doc.document_type).filter(id => id && uuidRegex.test(id)))];
      console.log('📍 [getAllDocuments] Filtered documentTypeIds:', documentTypeIds);
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

          // Check if document is owned by current department (first in workflow) or specifically shared to the user
          const workflow = documentWorkflowMap.get(doc.document_id);
          const receivedByUsers = documentReceivedByUsersMap.get(doc.document_id) || [];
          const isOwned = (workflow && workflow.length > 0 && workflow[0] === user.department_id) || receivedByUsers.includes(userId);

          // Get blockchain info
          const blockchainInfo = documentBlockchainMap.get(doc.document_id) || {};

          return {
            id: doc.document_id,
            qrCode,
            barcode,
            document: doc.title || 'Untitled',
            documentId: doc.document_code || doc.document_id,
            contactPerson: `${user.first_name} ${user.last_name}`,
            contactOrganization: department?.name || 'N/A',
            currentLocation: department?.name || 'N/A',
            type: documentTypeMap.get(doc.document_type) || (doc as any).document_type || 'General',
            classification: doc.classification,
            status: doc.status,
            activity: new Date(doc.created_at).toLocaleDateString(),
            activityTime: new Date(doc.created_at).toLocaleString(),
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
      console.error('📍 [getAllDocuments] Error:', error);
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
        files: true,
        DocumentAdditionalDetails: {
          orderBy: {
            created_at: 'asc'
          },
          take: 1 // Get the first/oldest detail for origin info
        }
      }
    });

    if (!document) {
      return null;
    }

    // Get document type info
    const documentType = await prisma.documentType.findUnique({
      where: { name: document.document_type }
    });

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
      const workflow = document.DocumentAdditionalDetails[0].work_flow_id;
      if (workflow && Array.isArray(workflow) && workflow.length > 0) {
        // Try to get first department from workflow
        const firstStep = workflow[0];
        if (firstStep && typeof firstStep === 'object' && 'department_id' in firstStep) {
          try {
            originatingDept = await prisma.department.findUnique({
              where: { department_id: firstStep.department_id as string },
              select: { name: true, department_id: true }
            });
          } catch (e) {
            console.error('Error fetching originating department:', e);
          }
        }

        // Try to get last department from workflow
        const lastStep = workflow[workflow.length - 1];
        if (lastStep && typeof lastStep === 'object' && 'department_id' in lastStep) {
          try {
            currentDept = await prisma.department.findUnique({
              where: { department_id: lastStep.department_id as string },
              select: { name: true, department_id: true }
            });
          } catch (e) {
            console.error('Error fetching current department:', e);
          }
        }
      }
    }

    // Build the detail object to match frontend expectations
    const detail = {
      document_code: document.document_code,
      document_name: document.title,
      classification: document.classification,
      origin: document.origin,
      delivery: null, // Not available in current schema
      created_by: null, // Not directly stored
      document_type: documentType ? {
        name: documentType.name
      } : null,
      department: originatingDept ? {
        name: originatingDept.name
      } : null,
      created_by_account: null // Not directly available in schema
    };

    const blockchainDetail = document.DocumentAdditionalDetails?.[0] as any;

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

      console.log('📍 [getCompletedDocuments] Request:', { userId, page, limit });

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
              workflowDepartments = Object.values(detail.work_flow_id);
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
              workflowDepartments = detail.work_flow_id;
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is in the workflow
            return workflowDepartments.includes(user.department_id);
          } catch (e) {
            console.error('📍 [getCompletedDocuments] Error parsing work_flow_id:', e);
            return false;
          }
        })
        .map((detail: any) => detail.document_id);

      console.log('📍 [getCompletedDocuments] Completed document IDs in workflow:', completedDocumentIds.length);

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

      console.log('📍 [getCompletedDocuments] Documents fetched:', documents.length, 'Total:', total);

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
            contactPerson: 'N/A',
            contactOrganization: 'N/A',
            type: 'General',
            classification: doc.classification,
            status: doc.status,
            activity: new Date(doc.created_at).toLocaleDateString(),
            activityTime: new Date(doc.created_at).toLocaleString(),
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
      console.error('📍 [getCompletedDocuments] Error:', error);
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

    return await prisma.document.findMany({
      where: whereCondition,
      include: {
        files: true
      }
    });
  }

  /**
   * Get received documents for a user's department
   * These are documents the user's department received from other departments
   */
  async getReceivedDocuments(userId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      console.log('📍 [getReceivedDocuments] Request:', { userId, page, limit });

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
              workflowDepartments = Object.values(detail.work_flow_id);
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
              workflowDepartments = detail.work_flow_id;
            } else {
              // Unexpected format
              workflowDepartments = [];
            }

            // Check if user's department is in workflow but NOT the first (received from others)
            const isInWorkflow = workflowDepartments.includes(user.department_id);
            const isNotOriginator = workflowDepartments.length > 0 && workflowDepartments[0] !== user.department_id;

            // Check if received by this department (acknowledged)
            let receivedByDepartments: string[] = [];
            if (detail.received_by_departments) {
              try {
                receivedByDepartments = Array.isArray(detail.received_by_departments)
                  ? detail.received_by_departments
                  : JSON.parse(detail.received_by_departments as any);
              } catch (e) {
                console.error('📍 [getReceivedDocuments] Error parsing received_by_departments:', e);
              }
            }

            const hasBeenReceived = receivedByDepartments.includes(user.department_id);

            return isInWorkflow && isNotOriginator && hasBeenReceived;
          } catch (e) {
            console.error('📍 [getReceivedDocuments] Error parsing work_flow_id:', e);
            return false;
          }
        })
        .map((detail: any) => detail.document_id);

      console.log('📍 [getReceivedDocuments] Received document IDs:', receivedDocumentIds.length);

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

      console.log('📍 [getReceivedDocuments] Documents fetched:', documents.length, 'Total:', total);

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
            contactPerson: 'N/A',
            contactOrganization: 'N/A',
            type: 'General',
            classification: doc.classification,
            status: 'received',
            activity: new Date(doc.created_at).toLocaleDateString(),
            activityTime: doc.created_at.toISOString()
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
      console.error('📍 [getReceivedDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Create a new document with file upload
   */
  async createDocumentWithFile(documentData: any, file: Express.Multer.File | undefined, userId: string) {
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

    // Generate unique document code
    const documentCode = `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create the document
    const document = await prisma.document.create({
      data: {
        title: documentData.document_name || documentData.title,
        description: documentData.description || null,
        document_code: documentCode,
        document_type: documentData.type_id || documentData.document_type || 'General',
        classification: documentData.classification,
        origin: documentData.origin,
        status: 'dispatch'
      } as any
    });

    // Create DocumentAdditionalDetails with work_flow_id in the format {"first": "departmentId"}
    const workflowObject = {
      first: user.department_id
    };

    await prisma.documentAdditionalDetails.create({
      data: {
        document_id: document.document_id,
        work_flow_id: workflowObject as any, // Initialize with creator's department as "first"
        remarks: documentData.remarks || null
      }
    });

    await recordCreationStatus(document.document_id, {
      departmentId: user.department_id,
      accountId: user.account.account_id,
      status: document.status
    });

    // If file is uploaded, save file metadata
    if (file) {
      const fileMetadata = getFileMetadata(file);

      const existingFileCount = await this.prismaAny.documentFile.count({
        where: { document_id: document.document_id }
      });

      const checksum = await this.calculateChecksum(fileMetadata.path);

      // Generate a unique version_group_id for this file
      const newVersionGroupId = crypto.randomUUID();

      const createdFile = await this.prismaAny.documentFile.create({
        data: {
          document_id: document.document_id,
          original_name: fileMetadata.originalName,
          stored_name: fileMetadata.filename,
          storage_path: fileMetadata.path,
          file_size: BigInt(fileMetadata.size),
          mime_type: fileMetadata.mimetype,
          checksum,
          is_primary: existingFileCount === 0,
          uploaded_by: user.account.account_id,
          version_group_id: newVersionGroupId
        }
      });

      // Extract and save document metadata
      try {
        const metadata = await this.documentMetadataService.extractMetadata(fileMetadata.path);

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

        const metadataRecord = await this.prismaAny.documentMetadata.create({
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
        status: 'dispatch',
        remarks: `Document created by ${user.first_name} ${user.last_name} with file upload`
      });
    } catch (error) {
      console.error('Error creating document trail for document creation:', error);
    }

    // Emit socket event to notify frontends of new document
    const io = getSocketInstance();
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
        last_name: user.last_name
      }
    });

    return document;
  }

  /**
   * Upload multiple files to existing document
   */
  async uploadFilesToDocument(documentId: string, files: Express.Multer.File[], userId: string, versionGroupId?: string) {
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

    // This variable will be used if we're branching (versionGroupId provided)
    // If not branching, each file will get its own version_group_id in the loop
    let branchingVersionGroupId: string | null = null;
    if (versionGroupId) {
      // Use the provided versionGroupId for branching
      branchingVersionGroupId = versionGroupId;
    }

    const existingFiles = await this.prismaAny.documentFile.findMany({
      where: { document_id: documentId },
      orderBy: { uploaded_at: 'asc' }
    });

    let hasRealFile = existingFiles.some((file: any) => !this.isPlaceholderFile(file));
    const existingCount = existingFiles.length;

    // If we're branching (versionGroupId provided), find existing files in this version group to determine the next version
    let nextVersionInGroup = 1;
    if (versionGroupId) {
      const existingFilesInGroup = await this.prismaAny.documentFile.findMany({
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

    const uploadedFiles = [];

    for (const [index, file] of files.entries()) {
      const fileMetadata = getFileMetadata(file);
      const checksum = await this.calculateChecksum(fileMetadata.path);

      // For branching, increment the version number within the same group
      // For new uploads (not branching), each file gets its own version group with version 1.0
      const version = versionGroupId
        ? `1.${nextVersionInGroup + index}`  // Branching: increment within group (e.g., 1.4, 1.5...)
        : `1.0`;  // New file in new group: all get version 1.0

      // If branching, use the same version group; otherwise, each file gets its own version group
      const currentFileVersionGroupId = branchingVersionGroupId || crypto.randomUUID();

      const shouldBePrimary = !hasRealFile && index === 0;

      const created = await this.prismaAny.documentFile.create({
        data: {
          document_id: documentId,
          original_name: fileMetadata.originalName,
          stored_name: fileMetadata.filename,
          storage_path: fileMetadata.path,
          file_size: BigInt(fileMetadata.size),
          mime_type: fileMetadata.mimetype,
          checksum,
          version,
          is_primary: shouldBePrimary,
          uploaded_by: user.account.account_id,
          version_group_id: currentFileVersionGroupId
        }
      });

      if (shouldBePrimary) {
        hasRealFile = true;
        await this.prismaAny.documentFile.updateMany({
          where: {
            document_id: documentId,
            file_id: { not: created.file_id }
          },
          data: { is_primary: false }
        });
      }

      // Extract and save document metadata for this file
      try {
        const metadata = await this.documentMetadataService.extractMetadata(fileMetadata.path);

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

        const metadataRecord = await this.prismaAny.documentMetadata.create({
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
   * Get document files with checkout info
   */
  async getFilesForDocument(documentId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      throw new Error('Invalid document ID format');
    }

    const files = await this.prismaAny.documentFile.findMany({
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

    const files = await this.prismaAny.documentFile.findMany({
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

    const file = await this.prismaAny.documentFile.findFirst({
      where: {
        file_id: fileId,
        document_id: documentId
      }
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.storage_path)) {
      // Log the discrepancy between database and file system
      console.error(`File not found on disk: ${file.storage_path} for file_id: ${fileId}, document_id: ${documentId}`);
      throw new Error('File not found on disk');
    }

    return {
      filePath: file.storage_path,
      fileName: file.original_name,
      mimeType: file.mime_type
    };
  }

  /**
   * Delete document file
   */
  async deleteDocumentFile(documentId: string, fileId: string, userId: string) {
    const file = await this.prismaAny.documentFile.findFirst({
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
    await this.prismaAny.documentFile.delete({
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
        last_name: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create the document
    const document = await prisma.document.create({
      data: {
        title: documentData.document_name,
        description: documentData.description || null,
        document_code: `DOC-${Date.now()}`, // Generate unique code
        document_type: documentData.type_id || 'General',
        classification: documentData.classification,
        origin: documentData.origin,
        status: 'dispatch'
      } as any
    });

    // Create DocumentAdditionalDetails with work_flow_id in the format {"first": "departmentId"}
    const workflowObject = {
      first: user.department_id
    };

    await prisma.documentAdditionalDetails.create({
      data: {
        document_id: document.document_id,
        work_flow_id: workflowObject as any, // Initialize with creator's department as "first"
        remarks: documentData.remarks || null
      }
    });

    // Emit socket event to notify frontends of new document
    const io = getSocketInstance();
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
        last_name: user.last_name
      }
    });

    // Create a document trail entry for document creation
    const documentTrailsService = new DocumentTrailsService();
    try {
      await documentTrailsService.createDocumentTrail({
        document_id: document.document_id,
        from_department: user.department_id,
        to_department: user.department_id, // Document created in the same department
        user_id: userId,
        status: 'dispatch',
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
   * Delete a document (soft delete by changing status)
   */
  async deleteDocument(id: string, userId: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid document ID format');
    }

    try {
      console.log('📍 [deleteDocument] Attempting to delete document:', id, 'by user:', userId);

      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prisma.$transaction(async (tx) => {
        await tx.document.update({
          where: { document_id: id },
          data: {
            status: 'deleted',
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

      // Emit socket event to notify frontends of document deletion
      const io = getSocketInstance();
      io.emit('documentDeleted', {
        documentId: id,
        deleted_at: new Date()
      });

      console.log('📍 [deleteDocument] Document successfully deleted:', id);
      return true;
    } catch (error: any) {
      // Handle case where document doesn't exist
      if (error.code === 'P2025') {
        console.log('📍 [deleteDocument] Document not found:', id);
        throw new Error('Document not found');
      }
      console.error('📍 [deleteDocument] Error:', error);
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
          status: 'canceled',
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
          status: 'canceled',
          updatedBy: userId,
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

      console.log('📍 [signDocumentWithBlockchain] Signing document:', documentId, 'by user:', userId);

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

      const documentFiles = await this.prismaAny.documentFile.findMany({
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
        documentFile = await this.createPlaceholderDocumentFile(documentId, document, documentDetailRecord, user);
      }

      if (!documentFile) {
        return { success: false, error: 'Document has no file to send to DocOnChain' };
      }

      if (!fs.existsSync(documentFile.storage_path)) {
        return { success: false, error: 'Document file is missing from storage' };
      }

      const fileBuffer = await fs.promises.readFile(documentFile.storage_path);
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

      await this.prismaAny.documentAdditionalDetails.update({
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

      console.log('📍 [signDocumentWithBlockchain] DocOnChain project initialised:', projectUuid);

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
      console.error('📍 [signDocumentWithBlockchain] Error:', error);

      try {
        const fallbackDetail = documentDetailRecord
          ? documentDetailRecord
          : await prisma.documentAdditionalDetails.findFirst({ where: { document_id: documentId } });

        if (fallbackDetail) {
          await this.prismaAny.documentAdditionalDetails.update({
            where: { detail_id: fallbackDetail.detail_id },
            data: {
              blockchain_status: 'failed',
              blockchain_redirect_url: null,
              updated_at: new Date()
            }
          });
        }
      } catch (updateError) {
        console.error('📍 [signDocumentWithBlockchain] Failed to update error status:', updateError);
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

      console.log('📍 [getAllAccessibleDocuments] Request:', { userId, page, limit });

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

      console.log('📍 [getAllAccessibleDocuments] Total document details found:', allDocumentDetails.length);

      // Filter documents that the user can access:
      // 1. Documents originated by their department (first in workflow), OR
      // 2. Documents specifically shared to the user (user ID in received_by_departments)
      const accessibleDocumentDetails = allDocumentDetails.filter((detail: any) => {
        // Check if document is not deleted
        if (detail.Document?.status === 'deleted') {
          console.log('📍 [getAllAccessibleDocuments] Document is deleted, skipping:', detail.document_id);
          return false;
        }

        let hasDepartmentAccess = false;
        let hasUserAccess = false;

        // Check department-level access - document originated by user's department
        if (detail.work_flow_id) {
          let workflowDepartments: string[] = [];

          if (typeof detail.work_flow_id === 'object' && detail.work_flow_id !== null) {
            // New format: object with keys like "first", "second", etc.
            workflowDepartments = Object.values(detail.work_flow_id);
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
            workflowDepartments = detail.work_flow_id;
          } else {
            // Unexpected format
            workflowDepartments = [];
          }

          // Check if user's department is the first (originator) in the workflow
          if (workflowDepartments.length > 0 && workflowDepartments[0] === user.department_id) {
            hasDepartmentAccess = true;
            console.log('📍 [getAllAccessibleDocuments] Document owned by department:', detail.document_id);
          }
        }

        // Check user-specific access
        if (detail.received_by_departments) {
          let receivedByUsers: string[] = [];

          // Handle different possible formats of received_by_departments (which now stores user IDs)
          if (Array.isArray(detail.received_by_departments)) {
            receivedByUsers = detail.received_by_departments as string[];
            console.log('📍 [getAllAccessibleDocuments] Document received_by_users (array):', detail.document_id, receivedByUsers);
          } else if (typeof detail.received_by_departments === 'string' && detail.received_by_departments) {
            try {
              receivedByUsers = JSON.parse(detail.received_by_departments);
              console.log('📍 [getAllAccessibleDocuments] Document received_by_users (parsed):', detail.document_id, receivedByUsers);
            } catch (e) {
              console.error('📍 [getAllAccessibleDocuments] Error parsing received_by_departments for doc', detail.document_id, e);
              return false;
            }
          } else if (detail.received_by_departments && typeof detail.received_by_departments === 'object') {
            // If it's already parsed as an object/array
            receivedByUsers = detail.received_by_departments as string[];
            console.log('📍 [getAllAccessibleDocuments] Document received_by_users (object):', detail.document_id, receivedByUsers);
          } else {
            console.log('📍 [getAllAccessibleDocuments] Document has no received_by_users, continuing:', detail.document_id);
          }

          // Check if the current user is in the received_by_users list
          if (receivedByUsers.includes(userId)) {
            hasUserAccess = true;
          }
        }

        return hasDepartmentAccess || hasUserAccess;
      });

      const accessibleDocumentIds = accessibleDocumentDetails.map((detail: any) => detail.document_id);

      console.log('📍 [getAllAccessibleDocuments] Accessible document IDs:', accessibleDocumentIds.length, accessibleDocumentIds);

      if (accessibleDocumentIds.length === 0) {
        console.log('📍 [getAllAccessibleDocuments] No accessible documents found for user');
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

      console.log('📍 [getAllAccessibleDocuments] Documents found:', documents.length, 'Total count:', total);

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
                workflowDepartments = Object.values(detail.work_flow_id);
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
                workflowDepartments = detail.work_flow_id;
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
            activity: isOwned ? 'created' : 'shared',
            activityTime: doc.created_at.toISOString()
          };
        })
      );

      console.log('📍 [getAllAccessibleDocuments] Returning', transformedDocuments.length, 'documents');
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
      console.error('📍 [getAllAccessibleDocuments] Error:', error);
      throw error;
    }
  }

  /**
   * Bulk delete documents (hard delete)
   */
  async bulkDeleteDocuments(documentIds: string[], userId: string) {
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
          console.log(`📍 [bulkDeleteDocuments] File deleted from filesystem: ${file.storage_path}`);
        } catch (error) {
          console.error(`📍 [bulkDeleteDocuments] Error deleting file from filesystem: ${file.storage_path}`, error);
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

    return deleted;
  }
}
