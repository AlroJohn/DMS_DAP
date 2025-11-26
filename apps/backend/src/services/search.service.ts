import { PrismaClient } from '@prisma/client';
import { Document, DocumentMetadata, DocumentAdditionalDetails, Department } from '@prisma/client';

const prisma = new PrismaClient();

// Define types for search parameters and results
export interface SearchParams {
  query?: string;
  documentType?: string;
  department?: string;
  status?: string;
  signatureStatus?: string;
  classification?: string;
  origin?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface SearchDocument {
  id: string;
  title: string;
  description: string;
  type: string;
  department: string;
  status: string;
  modified: string;
  signed: boolean;
  verified: boolean;
}

export interface SearchResult {
  documents: SearchDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Interface for saved searches
export interface SavedSearch {
  id: string;
  name: string;
  description: string | null;
  query: string;
  filters: Record<string, any>;
  createdDate: Date;
  lastRun: Date;
  results: number;
  isFavorite: boolean;
  isScheduled: boolean;
  scheduleFrequency: string | null;
}

/**
 * Search service to handle document search queries
 */
export class SearchService {
  /**
   * Search documents based on various criteria
   */
  static async searchDocuments(params: SearchParams): Promise<SearchResult> {
    const {
      query,
      documentType,
      department,
      status,
      signatureStatus,
      classification,
      origin,
      dateFrom,
      dateTo,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = params;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where clause based on search parameters
    const whereClause: any = {
      deleted_at: null // Only include documents that are not deleted
    };
    
    // Add search query condition if provided and not empty
    if (query && query.trim() !== '') {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { document_code: { contains: query, mode: 'insensitive' } }
          ]
        }
      ];
    }

    // Add document type filter
    if (documentType && documentType !== 'all' && documentType.trim() !== '') {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          document_type: { contains: documentType, mode: 'insensitive' }
        }
      ];
    }

    // Add department filter - Documents are connected to Accounts through DocumentFile
    if (department && department !== 'all') {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          files: {
            some: {
              uploaded_by_account: {
                department: {
                  OR: [
                    { name: { contains: department, mode: 'insensitive' } },
                    { code: { contains: department, mode: 'insensitive' } }
                  ],
                  active: true // Only include active departments
                }
              }
            }
          }
        }
      ];
    }

    // Add status filter
    if (status && status !== 'all' && status.trim() !== '') {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          status: status
        }
      ];
    }

    // Add classification filter
    if (classification && classification !== 'all' && classification.trim() !== '') {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          classification: classification
        }
      ];
    }

    // Add origin filter
    if (origin && origin !== 'all' && origin.trim() !== '') {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          origin: origin
        }
      ];
    }

    // Add signature status filter
    if (signatureStatus && signatureStatus !== 'all' && signatureStatus.trim() !== '') {
      if (signatureStatus === 'signed') {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            DocumentAdditionalDetails: {
              some: {
                signed_at: { not: null }
              }
            }
          }
        ];
      } else if (signatureStatus === 'unsigned') {
        // For unsigned, we need documents where either:
        // 1. They have no DocumentAdditionalDetails, OR
        // 2. All DocumentAdditionalDetails have signed_at as null
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              {
                DocumentAdditionalDetails: {
                  none: {}
                }
              },
              {
                DocumentAdditionalDetails: {
                  every: {
                    signed_at: null
                  }
                }
              }
            ]
          }
        ];
      } else if (signatureStatus === 'blockchain-verified') {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            DocumentAdditionalDetails: {
              some: {
                blockchain_status: 'signed'
              }
            }
          }
        ];
      }
    }

    // Add date range filters
    if (dateFrom || dateTo) {
      const dateFilter: any = { created_at: {} };

      if (dateFrom && dateFrom.trim() !== '') {
        const fromDate = new Date(dateFrom);
        if (isNaN(fromDate.getTime())) {
          throw new Error(`Invalid date format for dateFrom: ${dateFrom}`);
        }
        dateFilter.created_at.gte = fromDate;
      }
      if (dateTo && dateTo.trim() !== '') {
        const toDate = new Date(dateTo);
        if (isNaN(toDate.getTime())) {
          throw new Error(`Invalid date format for dateTo: ${dateTo}`);
        }
        dateFilter.created_at.lte = toDate;
      }

      // Only add the date filter if it has actual date constraints
      if (Object.keys(dateFilter.created_at).length > 0) {
        whereClause.AND = [
          ...(whereClause.AND || []),
          dateFilter
        ];
      }
    }

    // Define ordering based on sortBy parameter
    let orderBy: any = {};
    switch (sortBy) {
      case 'date':
        orderBy = { created_at: 'desc' };
        break;
      case 'name':
        orderBy = { title: 'asc' };
        break;
      case 'type':
        orderBy = { document_type: 'asc' };
        break;
      case 'relevance':
      default:
        // For relevance, we'll use the default ordering or by updated_at
        orderBy = { updated_at: 'desc' };
        break;
    }

    try {
      console.log('Search query where clause:', JSON.stringify(whereClause, null, 2)); // Debug line

      // Execute the search query with the built where clause
      const documents = await prisma.document.findMany({
        where: whereClause,
        include: {
          // DocumentMetadata is related through DocumentFile, not directly to Document
          DocumentAdditionalDetails: {
            take: 1 // Only get one additional detail record to avoid unnecessary data
          },
          files: {
            include: {
              DocumentMetadata: true, // Include document metadata through the files relation
              uploaded_by_account: {
                include: {
                  department: true
                }
              }
            },
            take: 1 // Just get the first file to access department info
          }
        },
        orderBy,
        skip: offset,
        take: limit
      });

      // Get total count for pagination
      const total = await prisma.document.count({ where: whereClause });

      console.log(`Found ${documents.length} documents out of total ${total}`); // Debug logging

      // Transform the Prisma result to match the SearchDocument interface
      const searchResults: SearchDocument[] = documents.map(doc => {
        // Get department name from the first file if available
        const departmentName = doc.files && doc.files.length > 0
          ? doc.files[0]?.uploaded_by_account?.department?.name || 'Unknown'
          : 'Unknown';

        // Get signature information from the first additional detail if available
        const additionalDetail = doc.DocumentAdditionalDetails && doc.DocumentAdditionalDetails.length > 0
          ? doc.DocumentAdditionalDetails[0]
          : null;

        return {
          id: doc.document_id,
          title: doc.title,
          description: doc.description || '',
          type: doc.document_type,
          department: departmentName,
          status: doc.status,
          classification: doc.classification,
          origin: doc.origin,
          modified: formatDate(doc.updated_at),
          signed: !!additionalDetail?.signed_at,
          verified: additionalDetail?.blockchain_status === 'signed'
        };
      });

      return {
        documents: searchResults,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error searching documents:', error);
      console.error('Where clause that caused error:', JSON.stringify(whereClause, null, 2));
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error', error instanceof Error ? error.stack : '');
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save a search query for later use
   */
  static async saveSearch(accountId: string, name: string, description: string | null, query: string, filters: Record<string, any>): Promise<SavedSearch> {
    try {
      // Create or update a saved search
      const savedSearch = await prisma.savedSearch.create({
        data: {
          name,
          description,
          query,
          filters: filters as any, // Prisma will handle JSON serialization
          created_by: accountId,
          last_run: new Date(),
          results_count: 0, // Initially 0, will be updated when executed
          is_favorite: false,
          is_scheduled: false,
          schedule_frequency: null
        }
      });

      // Transform to SavedSearch interface
      return {
        id: savedSearch.search_id,
        name: savedSearch.name,
        description: savedSearch.description,
        query: savedSearch.query,
        filters: savedSearch.filters as Record<string, any>,
        createdDate: savedSearch.created_at,
        lastRun: savedSearch.last_run,
        results: savedSearch.results_count,
        isFavorite: savedSearch.is_favorite,
        isScheduled: savedSearch.is_scheduled,
        scheduleFrequency: savedSearch.schedule_frequency
      };
    } catch (error) {
      console.error('Error saving search:', error);
      throw new Error('Failed to save search');
    }
  }

  /**
   * Get all saved searches for a user
   */
  static async getSavedSearches(accountId: string): Promise<SavedSearch[]> {
    try {
      const savedSearches = await prisma.savedSearch.findMany({
        where: {
          created_by: accountId
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return savedSearches.map(search => ({
        id: search.search_id,
        name: search.name,
        description: search.description,
        query: search.query,
        filters: search.filters as Record<string, any>,
        createdDate: search.created_at,
        lastRun: search.last_run,
        results: search.results_count,
        isFavorite: search.is_favorite,
        isScheduled: search.is_scheduled,
        scheduleFrequency: search.schedule_frequency
      }));
    } catch (error) {
      console.error('Error retrieving saved searches:', error);
      throw new Error('Failed to retrieve saved searches');
    }
  }

  /**
   * Get a specific saved search by ID
   */
  static async getSavedSearch(searchId: string, accountId: string): Promise<SavedSearch | null> {
    try {
      const savedSearch = await prisma.savedSearch.findFirst({
        where: {
          search_id: searchId,
          created_by: accountId
        }
      });

      if (!savedSearch) {
        return null;
      }

      return {
        id: savedSearch.search_id,
        name: savedSearch.name,
        description: savedSearch.description,
        query: savedSearch.query,
        filters: savedSearch.filters as Record<string, any>,
        createdDate: savedSearch.created_at,
        lastRun: savedSearch.last_run,
        results: savedSearch.results_count,
        isFavorite: savedSearch.is_favorite,
        isScheduled: savedSearch.is_scheduled,
        scheduleFrequency: savedSearch.schedule_frequency
      };
    } catch (error) {
      console.error('Error retrieving saved search:', error);
      throw new Error('Failed to retrieve saved search');
    }
  }

  /**
   * Delete a saved search
   */
  static async deleteSavedSearch(searchId: string, accountId: string): Promise<boolean> {
    try {
      await prisma.savedSearch.delete({
        where: {
          search_id: searchId,
          created_by: accountId
        }
      });

      return true;
    } catch (error) {
      console.error('Error deleting saved search:', error);
      return false;
    }
  }

  /**
   * Update a saved search
   */
  static async updateSavedSearch(
    searchId: string,
    accountId: string,
    updates: Partial<{
      name: string;
      description: string | null;
      query: string;
      filters: Record<string, any>;
      isFavorite: boolean;
      isScheduled: boolean;
      scheduleFrequency: string | null;
    }>
  ): Promise<SavedSearch | null> {
    try {
      const updatedSearch = await prisma.savedSearch.update({
        where: {
          search_id: searchId,
          created_by: accountId
        },
        data: {
          ...updates,
          last_run: updates.query || updates.filters ? new Date() : undefined
        }
      });

      return {
        id: updatedSearch.search_id,
        name: updatedSearch.name,
        description: updatedSearch.description,
        query: updatedSearch.query,
        filters: updatedSearch.filters as Record<string, any>,
        createdDate: updatedSearch.created_at,
        lastRun: updatedSearch.last_run,
        results: updatedSearch.results_count,
        isFavorite: updatedSearch.is_favorite,
        isScheduled: updatedSearch.is_scheduled,
        scheduleFrequency: updatedSearch.schedule_frequency
      };
    } catch (error) {
      console.error('Error updating saved search:', error);
      return null;
    }
  }

  /**
   * Execute a saved search by ID
   */
  static async executeSavedSearch(searchId: string, accountId: string): Promise<SearchResult> {
    try {
      const savedSearch = await prisma.savedSearch.findFirst({
        where: {
          search_id: searchId,
          created_by: accountId
        }
      });

      if (!savedSearch) {
        throw new Error('Saved search not found');
      }

      // Parse filters from the saved search
      const filters = savedSearch.filters as Record<string, any>;
      
      // Execute the search with the saved parameters
      const result = await this.searchDocuments({
        query: savedSearch.query,
        ...filters
      });

      // Update the last run and results count
      await prisma.savedSearch.update({
        where: {
          search_id: searchId,
          created_by: accountId
        },
        data: {
          last_run: new Date(),
          results_count: result.total
        }
      });

      return result;
    } catch (error) {
      console.error('Error executing saved search:', error);
      throw new Error('Failed to execute saved search');
    }
  }
}

/**
 * Helper function to format date as a human-readable string
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays <= 7) {
    return `${diffDays} days ago`;
  } else {
    // Format as MM/DD/YYYY
    return date.toLocaleDateString();
  }
}

// Define the SavedSearch model if it doesn't exist yet
// This would typically be defined in the Prisma schema
// For now, we'll create a temporary schema extension if needed