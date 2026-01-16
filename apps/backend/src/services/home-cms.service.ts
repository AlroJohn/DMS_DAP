import { prisma } from '../lib/prisma';

const prismaAny = prisma as any;

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
      const cms = await prismaAny.homeCMS.findFirst({
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
      const existingCMS = await prismaAny.homeCMS.findFirst({
        where: { is_active: true },
      });

      if (existingCMS) {
        // Update existing CMS
        return await prismaAny.homeCMS.update({
          where: { cms_id: existingCMS.cms_id },
          data: {
            ...data,
            updated_by: userId,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new CMS
        return await prismaAny.homeCMS.create({
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
   * Get all CMS versions (for history/audit)
   */
  async getAllCMS() {
    try {
      return await prismaAny.homeCMS.findMany({
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
      return await prismaAny.homeCMS.delete({
        where: { cms_id: cmsId },
      });
    } catch (error) {
      console.error("Error deleting CMS:", error);
      throw new Error("Failed to delete CMS content");
    }
  }
}

export const homeCMSService = new HomeCMSService();
