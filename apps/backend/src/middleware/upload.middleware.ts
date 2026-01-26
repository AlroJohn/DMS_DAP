import multer from 'multer';
import fs from 'fs';
import { s3Storage } from '../services/storage/s3.service';

// File filter for allowed file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/avi',
    'video/mov'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

// Configure multer to keep files in memory for S3 upload
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files per upload
  }
});

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Middleware for multiple file upload
export const uploadMultiple = upload.array('files', 10);

// Helper function to get file metadata
export const getFileMetadata = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path ?? '',
    uploadDate: new Date()
  };
};

// Helper function to delete file
export const deleteFile = async (filePath: string): Promise<void> => {
  if (filePath.startsWith('s3://')) {
    await s3Storage.deleteObject(filePath);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && (err as NodeJS.ErrnoException).code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
