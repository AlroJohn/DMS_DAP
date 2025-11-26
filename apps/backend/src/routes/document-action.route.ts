import { Router } from 'express';
import { DocumentActionController } from '../controllers/document-action.controller';
import { authMiddleware } from '../middleware/auth-middleware';
import { permissionMiddleware } from '../middleware/permission.middleware';

const router = Router();
const documentActionController = new DocumentActionController();

router.use(authMiddleware);

router.get(
  '/',
  permissionMiddleware(['document_action_read'], 'document_action'),
  documentActionController.getAllDocumentActions.bind(documentActionController)
);

router.get(
  '/:id',
  permissionMiddleware(['document_action_read'], 'document_action'),
  documentActionController.getDocumentActionById.bind(documentActionController)
);

router.post(
  '/',
  permissionMiddleware(['document_action_create'], 'document_action'),
  documentActionController.createDocumentAction.bind(documentActionController)
);

router.put(
  '/:id',
  permissionMiddleware(['document_action_edit'], 'document_action'),
  documentActionController.updateDocumentAction.bind(documentActionController)
);

router.delete(
  '/:id',
  permissionMiddleware(['document_action_delete'], 'document_action'),
  documentActionController.deleteDocumentAction.bind(documentActionController)
);

router.patch(
  '/:id/toggle-status',
  permissionMiddleware(['document_action_edit'], 'document_action'),
  documentActionController.toggleDocumentActionStatus.bind(documentActionController)
);

export default router;
