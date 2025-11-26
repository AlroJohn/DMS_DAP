import { Router } from 'express';
import { extractMetadata, upload } from '../controllers/document-metadata.controller';

const router = Router();

router.post('/metadata', upload.single('file'), extractMetadata);

export default router;