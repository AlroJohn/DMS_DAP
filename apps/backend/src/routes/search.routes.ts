import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authMiddleware as authenticateToken } from '../middleware/auth-middleware'; // Using the correct auth middleware

const router = Router();

// Public search route (requires authentication)
router.get('/', authenticateToken, SearchController.searchDocuments);

// Save a search query (requires authentication)
router.post('/save', authenticateToken, SearchController.saveSearch);

// Get all saved searches for the current user (requires authentication)
router.get('/saved', authenticateToken, SearchController.getSavedSearches);

// Get a specific saved search by ID (requires authentication)
router.get('/saved/:searchId', authenticateToken, SearchController.getSavedSearch);

// Update a saved search (requires authentication)
router.put('/saved/:searchId', authenticateToken, SearchController.updateSavedSearch);

// Delete a saved search (requires authentication)
router.delete('/saved/:searchId', authenticateToken, SearchController.deleteSavedSearch);

// Execute a saved search (requires authentication)
router.post('/saved/:searchId/execute', authenticateToken, SearchController.executeSavedSearch);

export default router;