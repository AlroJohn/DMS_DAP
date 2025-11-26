import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth-middleware';
import { SearchService, SearchParams } from '../services/search.service';
import { PrismaClient } from '@prisma/client';

/**
 * Search controller to handle search-related API requests
 */
export class SearchController {
  private static prisma = new PrismaClient();

  /**
   * Search documents based on query and filters
   */
  static async searchDocuments(req: Request, res: Response): Promise<void> {
    try {
      const searchParams: SearchParams = {
        query: req.query.query as string,
        documentType: req.query.documentType as string,
        department: req.query.department as string,
        status: req.query.status as string,
        signatureStatus: req.query.signatureStatus as string,
        classification: req.query.classification as string,
        origin: req.query.origin as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        sortBy: req.query.sortBy as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };

      // Ensure page and limit are properly defined with defaults
      searchParams.page = searchParams.page || 1;
      searchParams.limit = searchParams.limit || 20;

      // Validate pagination parameters
      if (searchParams.page < 1) searchParams.page = 1;
      if (searchParams.limit < 1 || searchParams.limit > 100) searchParams.limit = 20;

      console.log('Search parameters received:', searchParams); // Debug logging
      const result = await SearchService.searchDocuments(searchParams);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in searchDocuments controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search documents',
        error: error instanceof Error ? error.message : 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.stack : undefined })
      });
    }
  }

  /**
   * Save a search query
   */
  static async saveSearch(req: Request, res: Response): Promise<void> {
    try {
      console.log('Received saveSearch request:', {
        body: req.body,
        userId: (req as AuthRequest).user?.id
      });

      const { name, description, query, filters } = req.body;

      // Validate required fields
      if (!name || !query) {
        console.log('Validation failed:', { name: !!name, query: !!query });
        res.status(400).json({
          success: false,
          message: 'Name and query are required to save a search'
        });
        return;
      }

      // Extract user info from request (assuming it's added by authentication middleware)
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        console.log('User not authenticated');
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Need to get the account ID from the user ID
      // The User model has account_id field that references the Account table
      const user = await SearchController.prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true }
      });

      if (!user || !user.account_id) {
        console.log(`User with ID ${userId} not found`);
        res.status(404).json({
          success: false,
          message: 'User not found or account ID missing'
        });
        return;
      }

      console.log('Saving search with params:', { 
        userId, 
        accountId: user.account_id,
        name, 
        query, 
        filters 
      });

      // Now pass the account ID, not the user ID, to the service
      const savedSearch = await SearchService.saveSearch(user.account_id, name, description || null, query, filters);

      res.status(201).json({
        success: true,
        data: savedSearch
      });
    } catch (error) {
      console.error('Error in saveSearch controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save search',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all saved searches for the current user
   */
  static async getSavedSearches(req: Request, res: Response): Promise<void> {
    try {
      // Extract user info from request (assuming it's added by authentication middleware)
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Need to get the account ID from the user ID
      // The User model has account_id field that references the Account table
      const user = await SearchController.prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true }
      });

      if (!user || !user.account_id) {
        res.status(404).json({
          success: false,
          message: 'User not found or account ID missing'
        });
        return;
      }

      const savedSearches = await SearchService.getSavedSearches(user.account_id);

      res.status(200).json({
        success: true,
        data: savedSearches
      });
    } catch (error) {
      console.error('Error in getSavedSearches controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve saved searches',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific saved search by ID
   */
  static async getSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const { searchId } = req.params;

      // Extract user info from request (assuming it's added by authentication middleware)
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Need to get the account ID from the user ID
      // The User model has account_id field that references the Account table
      const user = await SearchController.prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true }
      });

      if (!user || !user.account_id) {
        res.status(404).json({
          success: false,
          message: 'User not found or account ID missing'
        });
        return;
      }

      const savedSearch = await SearchService.getSavedSearch(searchId, user.account_id);

      if (!savedSearch) {
        res.status(404).json({
          success: false,
          message: 'Saved search not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: savedSearch
      });
    } catch (error) {
      console.error('Error in getSavedSearch controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve saved search',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a saved search
   */
  static async deleteSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const { searchId } = req.params;

      // Extract user info from request (assuming it's added by authentication middleware)
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Need to get the account ID from the user ID
      // The User model has account_id field that references the Account table
      const user = await SearchController.prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true }
      });

      if (!user || !user.account_id) {
        res.status(404).json({
          success: false,
          message: 'User not found or account ID missing'
        });
        return;
      }

      const result = await SearchService.deleteSavedSearch(searchId, user.account_id);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Saved search not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Saved search deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteSavedSearch controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete saved search',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a saved search
   */
  static async updateSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const { searchId } = req.params;
      const { name, description, query, filters, isFavorite, isScheduled, scheduleFrequency } = req.body;

      // Extract user info from request (assuming it's added by authentication middleware)
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Need to get the account ID from the user ID
      // The User model has account_id field that references the Account table
      const user = await SearchController.prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true }
      });

      if (!user || !user.account_id) {
        res.status(404).json({
          success: false,
          message: 'User not found or account ID missing'
        });
        return;
      }

      const updates = {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(query !== undefined && { query }),
        ...(filters !== undefined && { filters }),
        ...(isFavorite !== undefined && { isFavorite }),
        ...(isScheduled !== undefined && { isScheduled }),
        ...(scheduleFrequency !== undefined && { scheduleFrequency })
      };

      const updatedSearch = await SearchService.updateSavedSearch(searchId, user.account_id, updates);

      if (!updatedSearch) {
        res.status(404).json({
          success: false,
          message: 'Saved search not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedSearch
      });
    } catch (error) {
      console.error('Error in updateSavedSearch controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update saved search',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Execute a saved search by ID
   */
  static async executeSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const { searchId } = req.params;

      // Extract user info from request (assuming it's added by authentication middleware)
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Need to get the account ID from the user ID
      // The User model has account_id field that references the Account table
      const user = await SearchController.prisma.user.findUnique({
        where: { user_id: userId },
        select: { account_id: true }
      });

      if (!user || !user.account_id) {
        res.status(404).json({
          success: false,
          message: 'User not found or account ID missing'
        });
        return;
      }

      const result = await SearchService.executeSavedSearch(searchId, user.account_id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in executeSavedSearch controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute saved search',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}