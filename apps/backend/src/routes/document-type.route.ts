import { Router } from 'express';
import { DocumentTypeController } from '../controllers/document-type.controller';
import { authMiddleware } from '../middleware/auth-middleware';
import { permissionMiddleware } from '../middleware/permission.middleware';

const router = Router();
const documentTypeController = new DocumentTypeController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply permission checks for different actions
router.get('/', 
  permissionMiddleware(['document_type_read'], 'document_type'),
  documentTypeController.getAllDocumentTypes.bind(documentTypeController)
);

router.get('/:id', 
  permissionMiddleware(['document_type_read'], 'document_type'),
  documentTypeController.getDocumentTypeById.bind(documentTypeController)
);

router.post('/', 
  permissionMiddleware(['document_type_create'], 'document_type'),
  documentTypeController.createDocumentType.bind(documentTypeController)
);

router.put('/:id', 
  permissionMiddleware(['document_type_edit'], 'document_type'),
  documentTypeController.updateDocumentType.bind(documentTypeController)
);

router.delete('/:id', 
  permissionMiddleware(['document_type_delete'], 'document_type'),
  documentTypeController.deleteDocumentType.bind(documentTypeController)
);

router.patch('/:id/toggle-status', 
  permissionMiddleware(['document_type_edit'], 'document_type'),
  documentTypeController.toggleDocumentTypeStatus.bind(documentTypeController)
);

export default router;