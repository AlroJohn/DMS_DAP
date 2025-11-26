import { prisma } from '../lib/prisma';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { DocumentService } from './document.service';

export class ArchiveService {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  /**
   * Archive a document by setting its deleted_at timestamp
   */
  async archiveDocument(documentId: string, archivedBy: string) {
    try {
      // Check if the document exists and is not already archived
      const document = await prisma.document.findUnique({
        where: { 
          document_id: documentId,
          deleted_at: null // Only archive documents that are not already archived
        }
      });

      if (!document) {
        throw new Error('Document not found or already archived');
      }

      // Update the document to mark it as archived
      const archivedDoc = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          deleted_at: new Date(), // Mark when it was archived
          restored_at: null,
          status: 'archive' // Using 'archive' status to represent archived (distinct from other statuses)
        }
      });

      // Create a document action log to track the archive action
      await prisma.documentAction.create({
        data: {
          action_name: 'archived',
          description: `Document ${document.title} was archived`,
          action_date: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      return archivedDoc;
    } catch (error) {
      console.error('Error archiving document:', error);
      throw error;
    }
  }

  /**
   * Restore an archived document by clearing its deleted_at timestamp
   */
  async restoreDocument(documentId: string, restoredByUserId: string) {
    try {
      // Check if the document exists and is archived
      const document = await prisma.document.findUnique({
        where: {
          document_id: documentId,
          deleted_at: { not: null } // Only restore documents that are archived
        }
      });

      if (!document) {
        throw new Error('Document not found or not archived');
      }

      // Get the user's account information to get the account_id
      // First, we need to find the user to get their account_id
      const user = await prisma.user.findUnique({
        where: { user_id: restoredByUserId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update the document to mark it as restored
      const restoredDoc = await prisma.document.update({
        where: { document_id: documentId },
        data: {
          deleted_at: null,
          restored_at: new Date(),
          restored_by: user.account_id, // Use account_id instead of user_id
          status: 'dispatch' // Reset to initial status after restoration
        }
      });

      // Create a document action log to track the restore action
      await prisma.documentAction.create({
        data: {
          action_name: 'restored',
          description: `Document ${document.title} was restored from archive`,
          action_date: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      return restoredDoc;
    } catch (error) {
      console.error('Error restoring document:', error);
      throw error;
    }
  }

  /**
   * Get all archived documents
   */
  async getArchivedDocuments() {
    try {
      // Get the archived documents
      const archivedDocs = await prisma.document.findMany({
        where: {
          status: 'archive', // Use the 'archive' status we set when archiving
        },
        include: {
          DocumentAdditionalDetails: true,
          files: {
            include: {
              DocumentMetadata: true,
              uploaded_by_account: {
                include: {
                  user: true // Include user info for contact person
                }
              }
            }
          },
          // Include document type info to get the name instead of just ID
        },
        orderBy: [
          { deleted_at: 'desc' }, // Order by archived date, newest first
          { created_at: 'desc' }  // Then by creation date
        ]
      });

      // Get document types to map IDs to names
      const documentTypeIds = archivedDocs.map(doc => doc.document_type);
      const documentTypes = await prisma.documentType.findMany({
        where: {
          type_id: { in: documentTypeIds }
        }
      });
      const typeMap = new Map(documentTypes.map(dt => [dt.type_id, dt.name]));

      // Process each document to add QR codes, barcodes, and proper names
      const processedDocs = await Promise.all(archivedDocs.map(async (doc) => {
        // Generate QR code - using document_code or fallback to document_id
        let qrCode = '';
        try {
          qrCode = await QRCode.toDataURL(doc.document_code || doc.document_id, {
            width: 100,
            margin: 1
          });
        } catch (err) {
          console.error('QR Code generation error:', err);
          // Fallback to empty QR code
        }

        // Generate barcode - using document_code or fallback to document_id
        let barcode = '';
        try {
          const canvas = await bwipjs.toBuffer({
            bcid: 'code128',
            text: doc.document_code || doc.document_id,
            scale: 2,
            height: 10,
            includetext: false
          });
          barcode = `data:image/png;base64,${canvas.toString('base64')}`; // Fixed: 'base8' -> 'base64'
        } catch (err) {
          console.error('Barcode generation error:', err);
          // Fallback to empty barcode
        }

        // Get the first file to determine contact person
        let contactPerson = 'N/A';
        let contactOrganization = 'N/A';

        if (doc.files && doc.files.length > 0) {
          const firstFile = doc.files[0]; // Take the first file
          if (firstFile.uploaded_by_account && firstFile.uploaded_by_account.user) {
            contactPerson = `${firstFile.uploaded_by_account.user.first_name} ${firstFile.uploaded_by_account.user.last_name}`;

            // If we have department info, we can get the org name
            if (firstFile.uploaded_by_account.user.department_id) {
              try {
                const department = await prisma.department.findUnique({
                  where: { department_id: firstFile.uploaded_by_account.user.department_id }
                });
                if (department) {
                  contactOrganization = department.name;
                }
              } catch (e) {
                console.error('Error fetching department:', e);
              }
            }
          }
        }

        // Map document type ID to name
        const typeName = typeMap.get(doc.document_type) || doc.document_type;

        // Get document type information to populate more fields
        let documentTypeDetail = null;
        try {
          documentTypeDetail = await prisma.documentType.findUnique({
            where: { type_id: doc.document_type }
          });
        } catch (e) {
          console.error('Error fetching document type detail:', e);
        }

        // Get classification and other document details with fallbacks
        const classification = doc.classification || 'Simple';
        const status = doc.status || 'archive'; // Explicitly set to archive status

        // Determine activity and activity time
        const activity = 'Archived';
        const activityTime = doc.deleted_at ? new Date(doc.deleted_at).toISOString() : new Date().toISOString();

        // Return the document with all the enriched fields that the frontend expects
        return {
          id: doc.document_id,
          document_id: doc.document_id,
          title: doc.title || 'Untitled Document',
          description: doc.description || '',
          document_code: doc.document_code,
          document_type: doc.document_type,
          type: documentTypeDetail?.name || doc.document_type, // Use the name instead of ID
          classification: classification,
          origin: doc.origin || 'external',
          status: status,
          created_at: doc.created_at.toISOString(),
          updated_at: doc.updated_at.toISOString(),
          deleted_at: doc.deleted_at ? doc.deleted_at.toISOString() : null,
          restored_at: doc.restored_at ? doc.restored_at.toISOString() : null,
          restored_by: doc.restored_by || null,

          // Fields expected by the DataTable
          qrCode,
          barcode,
          document: doc.title || 'Untitled Document',
          documentId: doc.document_code || doc.document_id,
          contactPerson,
          contactOrganization,
          currentLocation: 'Archive',
          activity,
          activityTime,
          deletedBy: 'System', // Placeholder - could be populated with actual deleted by info
          deletedAt: doc.deleted_at ? doc.deleted_at.toISOString() : new Date().toISOString(),
          restoredBy: doc.restored_by ? 'System' : undefined, // Placeholder
          restoredAt: doc.restored_at ? doc.restored_at.toISOString() : undefined,

          // Security and blockchain fields (with defaults)
          blockchainStatus: null,
          blockchainProjectUuid: undefined,
          blockchainTxHash: undefined,
          signedAt: undefined,
          lockStatus: undefined,
          lockedBy: undefined,
          lockedAt: undefined,
          ocrStatus: undefined,
          ocrProgress: undefined,
          integrityStatus: undefined,
          checksum: undefined,
          encryptionStatus: undefined,
        };
      }));

      return processedDocs;
    } catch (error) {
      console.error('Error fetching archived documents:', error);
      throw error;
    }
  }

  /**
   * Get a specific archived document
   */
  async getArchivedDocument(documentId: string) {
    try {
      const document = await prisma.document.findFirst({
        where: {
          document_id: documentId,
          status: 'archive' // Only archived documents
        },
        include: {
          DocumentAdditionalDetails: true,
          files: {
            include: {
              DocumentMetadata: true,
              uploaded_by_account: {
                include: {
                  user: true // Include user info for contact person
                }
              }
            }
          }
        }
      });

      if (!document) {
        return null;
      }

      // Generate QR code
      let qrCode = '';
      try {
        qrCode = await QRCode.toDataURL(document.document_code || document.document_id, {
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
          text: document.document_code || document.document_id,
          scale: 2,
          height: 10,
          includetext: false
        });
        barcode = `data:image/png;base64,${canvas.toString('base64')}`;
      } catch (err) {
        console.error('Barcode generation error:', err);
      }

      // Get contact info
      let contactPerson = 'N/A';
      let contactOrganization = 'N/A';

      if (document.files && document.files.length > 0) {
        const firstFile = document.files[0];
        if (firstFile.uploaded_by_account && firstFile.uploaded_by_account.user) {
          contactPerson = `${firstFile.uploaded_by_account.user.first_name} ${firstFile.uploaded_by_account.user.last_name}`;

          if (firstFile.uploaded_by_account.user.department_id) {
            try {
              const department = await prisma.department.findUnique({
                where: { department_id: firstFile.uploaded_by_account.user.department_id }
              });
              if (department) {
                contactOrganization = department.name;
              }
            } catch (e) {
              console.error('Error fetching department:', e);
            }
          }
        }
      }

      // Get document type information to populate more fields
      let documentTypeDetail = null;
      try {
        documentTypeDetail = await prisma.documentType.findUnique({
          where: { type_id: document.document_type }
        });
      } catch (e) {
        console.error('Error fetching document type detail:', e);
      }

      // Get classification and other document details with fallbacks
      const classification = document.classification || 'Simple';
      const status = document.status || 'archive'; // Explicitly set to archive status

      // Determine activity and activity time
      const activity = 'Archived';
      const activityTime = document.deleted_at ? new Date(document.deleted_at).toISOString() : new Date().toISOString();

      return {
        id: document.document_id,
        document_id: document.document_id,
        title: document.title || 'Untitled Document',
        description: document.description || '',
        document_code: document.document_code,
        document_type: document.document_type,
        type: documentTypeDetail?.name || document.document_type, // Use the name instead of ID
        classification: classification,
        origin: document.origin || 'external',
        status: status,
        created_at: document.created_at.toISOString(),
        updated_at: document.updated_at.toISOString(),
        deleted_at: document.deleted_at ? document.deleted_at.toISOString() : null,
        restored_at: document.restored_at ? document.restored_at.toISOString() : null,
        restored_by: document.restored_by || null,

        // Fields expected by the DataTable
        qrCode,
        barcode,
        document: document.title || 'Untitled Document',
        documentId: document.document_code || document.document_id,
        contactPerson,
        contactOrganization,
        currentLocation: 'Archive',
        activity,
        activityTime,
        deletedBy: 'System', // Placeholder - could be populated with actual deleted by info
        deletedAt: document.deleted_at ? document.deleted_at.toISOString() : new Date().toISOString(),
        restoredBy: document.restored_by ? 'System' : undefined, // Placeholder
        restoredAt: document.restored_at ? document.restored_at.toISOString() : undefined,

        // Security and blockchain fields (with defaults)
        blockchainStatus: null,
        blockchainProjectUuid: undefined,
        blockchainTxHash: undefined,
        signedAt: undefined,
        lockStatus: undefined,
        lockedBy: undefined,
        lockedAt: undefined,
        ocrStatus: undefined,
        ocrProgress: undefined,
        integrityStatus: undefined,
        checksum: undefined,
        encryptionStatus: undefined,
      };
    } catch (error) {
      console.error('Error fetching archived document:', error);
      throw error;
    }
  }
}