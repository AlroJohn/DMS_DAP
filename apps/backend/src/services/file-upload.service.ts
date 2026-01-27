import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../lib/prisma";
import * as crypto from "crypto";
import * as path from "path";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "dap-dms";

export interface FileUploadData {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  fileType: string; // logo, video, document, etc.
  uploadedBy?: string;
  relatedEntity?: string; // e.g., "home_cms", "document"
  relatedId?: string;
}

export interface UploadedFileResponse {
  file_id: string;
  file_url: string;
  file_path: string;
  original_name: string;
  file_size: number;
  mime_type: string;
}

export class FileUploadService {
  /**
   * Upload file to S3 and store metadata in database
   */
  async uploadFile(data: FileUploadData): Promise<UploadedFileResponse> {
    try {
      const { buffer, originalName, mimeType, fileType, uploadedBy, relatedEntity, relatedId } = data;

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString("hex");
      const ext = path.extname(originalName);
      const storedName = `${timestamp}-${randomString}${ext}`;
      const filePath = `${fileType}/${storedName}`;

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
        Body: buffer,
        ContentType: mimeType,
        // ACL: "public-read", // Make file publicly accessible if needed
      });

      await s3Client.send(uploadCommand);

      // Generate public URL
      const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;

      // Store metadata in database
      const uploadedFile = await prisma.uploadedFile.create({
        data: {
          original_name: originalName,
          stored_name: storedName,
          file_path: filePath,
          file_url: fileUrl,
          file_size: buffer.length,
          mime_type: mimeType,
          file_type: fileType,
          bucket_name: BUCKET_NAME,
          storage_type: "s3",
          uploaded_by: uploadedBy,
          related_entity: relatedEntity,
          related_id: relatedId,
        },
      });

      return {
        file_id: uploadedFile.file_id,
        file_url: uploadedFile.file_url,
        file_path: uploadedFile.file_path,
        original_name: uploadedFile.original_name,
        file_size: Number(uploadedFile.file_size),
        mime_type: uploadedFile.mime_type,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("Failed to upload file");
    }
  }

  /**
   * Get file metadata by ID
   */
  async getFileById(fileId: string) {
    try {
      return await prisma.uploadedFile.findUnique({
        where: { file_id: fileId, is_deleted: false },
      });
    } catch (error) {
      console.error("Error fetching file:", error);
      throw new Error("Failed to fetch file");
    }
  }

  /**
   * Get files by related entity
   */
  async getFilesByEntity(relatedEntity: string, relatedId?: string) {
    try {
      return await prisma.uploadedFile.findMany({
        where: {
          related_entity: relatedEntity,
          related_id: relatedId,
          is_deleted: false,
        },
        orderBy: { created_at: "desc" },
      });
    } catch (error) {
      console.error("Error fetching files:", error);
      throw new Error("Failed to fetch files");
    }
  }

  /**
   * Soft delete file (mark as deleted in DB)
   */
  async softDeleteFile(fileId: string) {
    try {
      return await prisma.uploadedFile.update({
        where: { file_id: fileId },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
        },
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new Error("Failed to delete file");
    }
  }

  /**
   * Permanently delete file from S3 and database
   */
  async permanentlyDeleteFile(fileId: string) {
    try {
      const file = await prisma.uploadedFile.findUnique({
        where: { file_id: fileId },
      });

      if (!file) {
        console.warn(`File not found in database: ${fileId}`);
        throw new Error("File not found");
      }

      console.log(`Deleting file from S3 bucket: ${file.bucket_name}/${file.file_path}`);

      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: file.bucket_name,
        Key: file.file_path,
      });

      await s3Client.send(deleteCommand);
      console.log(`File deleted from S3 bucket: ${file.file_path}`);

      // Delete from database
      await prisma.uploadedFile.delete({
        where: { file_id: fileId },
      });
      console.log(`File deleted from database: ${fileId}`);

      return { success: true, message: "File permanently deleted from S3 and database" };
    } catch (error: any) {
      console.error("Error permanently deleting file:", error);
      throw new Error(`Failed to permanently delete file: ${error.message}`);
    }
  }

  /**
   * Get file statistics
   */
  async getFileStats(uploadedBy?: string) {
    try {
      const where = uploadedBy 
        ? { uploaded_by: uploadedBy, is_deleted: false }
        : { is_deleted: false };

      const [totalFiles, totalSize, filesByType] = await Promise.all([
        prisma.uploadedFile.count({ where }),
        prisma.uploadedFile.aggregate({
          where,
          _sum: { file_size: true },
        }),
        prisma.uploadedFile.groupBy({
          by: ["file_type"],
          where,
          _count: true,
          _sum: { file_size: true },
        }),
      ]);

      return {
        total_files: totalFiles,
        total_size: Number(totalSize._sum.file_size || 0),
        by_type: filesByType.map((item) => ({
          file_type: item.file_type,
          count: item._count,
          size: Number(item._sum.file_size || 0),
        })),
      };
    } catch (error) {
      console.error("Error fetching file stats:", error);
      throw new Error("Failed to fetch file statistics");
    }
  }
}

export const fileUploadService = new FileUploadService();
