import { prisma } from '../lib/prisma';
import { fileUploadService } from './file-upload.service';

export interface HomeCMSData {
  logo_url?: string;
  video_url?: string;
  vision?: string;
  mission?: string;
  welcome_title?: string;
  welcome_text?: string;
}

export class HomeCMSService {
  /**
   * Get the active CMS content
   */
  async getActiveCMS() {
    try {
      const cms = await prisma.homeCMS.findFirst({
        where: { is_active: true },
        orderBy: { updated_at: "desc" },
      });

      return cms;
    } catch (error) {
      console.error("Error fetching active CMS:", error);
      throw new Error("Failed to fetch CMS content");
    }
  }

  /**
   * Create or update CMS content (superadmin only)
   */
  async upsertCMS(data: HomeCMSData, userId: string) {
    try {
      // Check if there's an existing active CMS
      const existingCMS = await prisma.homeCMS.findFirst({
        where: { is_active: true },
      });

      if (existingCMS) {
        // Delete old files if URLs are being changed
        await this.deleteOldFiles(existingCMS, data);

        // Update existing CMS
        return await prisma.homeCMS.update({
          where: { cms_id: existingCMS.cms_id },
          data: {
            ...data,
            updated_by: userId,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new CMS
        return await prisma.homeCMS.create({
          data: {
            ...data,
            created_by: userId,
            updated_by: userId,
            is_active: true,
          },
        });
      }
    } catch (error) {
      console.error("Error upserting CMS:", error);
      throw new Error("Failed to save CMS content");
    }
  }

  /**
   * Delete old files when CMS data is updated
   */
  private async deleteOldFiles(existingCMS: any, newData: HomeCMSData) {
    try {
      // Check if logo_url is being changed
      if (newData.logo_url && existingCMS.logo_url && newData.logo_url !== existingCMS.logo_url) {
        console.log(`Logo URL changed, deleting old logo: ${existingCMS.logo_url}`);
        await this.deleteFileByUrl(existingCMS.logo_url);
        console.log(`Old logo deleted successfully`);
      }

      // Check if video_url is being changed
      if (newData.video_url && existingCMS.video_url && newData.video_url !== existingCMS.video_url) {
        console.log(`Video URL changed, deleting old video: ${existingCMS.video_url}`);
        await this.deleteFileByUrl(existingCMS.video_url);
        console.log(`Old video deleted successfully`);
      }
    } catch (error) {
      console.error("Error deleting old files:", error);
      // Don't throw error, just log it - we don't want to prevent CMS update if file deletion fails
    }
  }

  /**
   * Delete file by URL from database and S3 (public method)
   */
  async deleteFileByUrl(fileUrl: string) {
    try {
      console.log(`🔍 Searching for file in database: ${fileUrl}`);
      
      // Find the file record by URL
      const file = await prisma.uploadedFile.findFirst({
        where: { 
          file_url: fileUrl,
          related_entity: "home_cms",
          is_deleted: false 
        },
      });

      if (file) {
        console.log(`📁 Found file in database (ID: ${file.file_id}), proceeding to delete from S3 and database`);
        // Permanently delete the file (from S3 and database)
        await fileUploadService.permanentlyDeleteFile(file.file_id);
        console.log(`✅ Successfully deleted old file from S3 bucket and database: ${fileUrl}`);
      } else {
        console.warn(`⚠️ File not found in database (may have been manually deleted): ${fileUrl}`);
      }
    } catch (error: any) {
      console.error(`❌ Error deleting file by URL ${fileUrl}:`, error.message || error);
      // Don't throw - we log the error but don't want to stop the CMS update
    }
  }

  /**
   * Get all CMS versions (for history/audit)
   */
  async getAllCMS() {
    try {
      return await prisma.homeCMS.findMany({
        orderBy: { updated_at: "desc" },
      });
    } catch (error) {
      console.error("Error fetching all CMS:", error);
      throw new Error("Failed to fetch CMS history");
    }
  }

  /**
   * Delete CMS content
   */
  async deleteCMS(cmsId: string) {
    try {
      return await prisma.homeCMS.delete({
        where: { cms_id: cmsId },
      });
    } catch (error) {
      console.error("Error deleting CMS:", error);
      throw new Error("Failed to delete CMS content");
    }
  }
}

export const homeCMSService = new HomeCMSService();
