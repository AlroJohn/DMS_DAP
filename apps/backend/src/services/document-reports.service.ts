import { PrismaClient } from '@prisma/client';
import { DocumentFile } from '@prisma/client';

const prisma = new PrismaClient();

export class DocumentReportsService {
  /**
   * Get version history report for all documents
   */
  async getVersionHistoryReport() {
    try {
      // Get all document files grouped by document to show version history
      const documentsWithVersions = await prisma.document.findMany({
        include: {
          files: {
            include: {
              uploaded_by_account: {
                include: {
                  user: true
                }
              },
              DocumentMetadata: true
            },
            orderBy: {
              version: 'asc' // Order by version number
            }
          },
          document_trails: {
            include: {
              user: true,
              documentAction: true
            },
            orderBy: {
              action_date: 'desc'
            },
            take: 1 // Get the most recent trail for each document
          }
        }
      });

      // Calculate statistics
      const totalVersions = documentsWithVersions.reduce(
        (sum, doc) => sum + doc.files.length, 
        0
      );
      
      const currentMonth = new Date();
      currentMonth.setDate(1); // Set to first day of month
      currentMonth.setHours(0, 0, 0, 0);
      
      const versionsThisMonth = documentsWithVersions.reduce(
        (sum, doc) => 
          sum + doc.files.filter(file => 
            file.uploaded_at >= currentMonth
          ).length, 
        0
      );
      
      const avgVersionsPerDoc = documentsWithVersions.length > 0 
        ? parseFloat((totalVersions / documentsWithVersions.length).toFixed(1)) 
        : 0;

      // Get recent version changes (last 10)
      const recentChanges = await prisma.documentFile.findMany({
        include: {
          Document: true,
          uploaded_by_account: {
            include: {
              user: true
            }
          }
        },
        orderBy: {
          uploaded_at: 'desc'
        },
        take: 10
      });

      return {
        statistics: {
          totalVersions,
          versionsThisMonth,
          avgVersionsPerDoc
        },
        recentChanges: recentChanges.map(file => ({
          fileId: file.file_id,
          fileName: file.original_name,
          documentTitle: file.Document.title,
          documentCode: file.Document.document_code,
          version: file.version,
          uploadedAt: file.uploaded_at,
          uploadedBy: file.uploaded_by_account?.user 
            ? `${file.uploaded_by_account.user.first_name} ${file.uploaded_by_account.user.last_name}`
            : 'Unknown User'
        }))
      };
    } catch (error) {
      console.error('Error getting version history report:', error);
      throw error;
    }
  }

  /**
   * Get version history for a specific document
   */
  async getDocumentVersionHistory(identifier: string) {
    try {
      // Check if the identifier looks like a UUID or a document code
      // A UUID has a specific format: 8-4-4-4-12 hex characters separated by hyphens
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      let document;
      if (isUUID) {
        // If it's a UUID, search by document_id
        document = await prisma.document.findUnique({
          where: { document_id: identifier },
          include: {
            files: {
              include: {
                uploaded_by_account: {
                  include: {
                    user: true
                  }
                },
                DocumentMetadata: true
              },
              orderBy: {
                version: 'asc' // Order by version number
              }
            }
          }
        });
      } else {
        // If it's not a UUID, search by document_code
        document = await prisma.document.findUnique({
          where: { document_code: identifier },
          include: {
            files: {
              include: {
                uploaded_by_account: {
                  include: {
                    user: true
                  }
                },
                DocumentMetadata: true
              },
              orderBy: {
                version: 'asc' // Order by version number
              }
            }
          }
        });
      }

      if (!document) {
        throw new Error('Document not found');
      }

      return {
        documentId: document.document_id,
        documentTitle: document.title,
        documentCode: document.document_code,
        versions: document.files.map(file => ({
          fileId: file.file_id,
          fileName: file.original_name,
          version: file.version,
          fileSize: file.file_size,
          uploadedAt: file.uploaded_at,
          uploadedBy: file.uploaded_by_account?.user
            ? `${file.uploaded_by_account.user.first_name} ${file.uploaded_by_account.user.last_name}`
            : 'Unknown User',
          mimeType: file.mime_type,
          metadata: file.DocumentMetadata
        }))
      };
    } catch (error) {
      console.error('Error getting document version history:', error);
      throw error;
    }
  }

  /**
   * Get version comparison between two document versions
   */
  async compareDocumentVersions(fileId1: string, fileId2: string) {
    try {
      const file1 = await prisma.documentFile.findUnique({
        where: { file_id: fileId1 },
        include: {
          Document: true,
          uploaded_by_account: {
            include: {
              user: true
            }
          },
          DocumentMetadata: true
        }
      });

      const file2 = await prisma.documentFile.findUnique({
        where: { file_id: fileId2 },
        include: {
          Document: true,
          uploaded_by_account: {
            include: {
              user: true
            }
          },
          DocumentMetadata: true
        }
      });

      if (!file1 || !file2) {
        throw new Error('One or both files not found');
      }

      if (file1.document_id !== file2.document_id) {
        throw new Error('Cannot compare files from different documents');
      }

      return {
        documentId: file1.document_id,
        documentTitle: file1.Document.title,
        version1: {
          fileId: file1.file_id,
          fileName: file1.original_name,
          version: file1.version,
          uploadedAt: file1.uploaded_at,
          uploadedBy: file1.uploaded_by_account?.user 
            ? `${file1.uploaded_by_account.user.first_name} ${file1.uploaded_by_account.user.last_name}`
            : 'Unknown User',
          fileSize: file1.file_size,
          metadata: file1.DocumentMetadata
        },
        version2: {
          fileId: file2.file_id,
          fileName: file2.original_name,
          version: file2.version,
          uploadedAt: file2.uploaded_at,
          uploadedBy: file2.uploaded_by_account?.user 
            ? `${file2.uploaded_by_account.user.first_name} ${file2.uploaded_by_account.user.last_name}`
            : 'Unknown User',
          fileSize: file2.file_size,
          metadata: file2.DocumentMetadata
        }
      };
    } catch (error) {
      console.error('Error comparing document versions:', error);
      throw error;
    }
  }
}