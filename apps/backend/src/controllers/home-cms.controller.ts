import { Request, Response } from "express";
import { homeCMSService } from "../services/home-cms.service";

export class HomeCMSController {
  /**
   * Get active CMS content (public access)
   */
  async getActiveCMS(req: Request, res: Response) {
    try {
      const cms = await homeCMSService.getActiveCMS();
      
      if (!cms) {
        return res.status(200).json({
          success: true,
          data: null,
          message: "No CMS content found",
        });
      }

      return res.status(200).json({
        success: true,
        data: cms,
      });
    } catch (error: any) {
      console.error("Error in getActiveCMS:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch CMS content",
      });
    }
  }

  /**
   * Create or update CMS content (superadmin only)
   */
  async upsertCMS(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { logo_url, video_url, vision, mission, welcome_title, welcome_text } = req.body;

      const cms = await homeCMSService.upsertCMS(
        {
          logo_url,
          video_url,
          vision,
          mission,
          welcome_title,
          welcome_text,
        },
        userId
      );

      return res.status(200).json({
        success: true,
        data: cms,
        message: "CMS content saved successfully",
      });
    } catch (error: any) {
      console.error("Error in upsertCMS:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to save CMS content",
      });
    }
  }

  /**
   * Get all CMS history (superadmin only)
   */
  async getAllCMS(req: Request, res: Response) {
    try {
      const cmsList = await homeCMSService.getAllCMS();

      return res.status(200).json({
        success: true,
        data: cmsList,
      });
    } catch (error: any) {
      console.error("Error in getAllCMS:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch CMS history",
      });
    }
  }

  /**
   * Delete CMS content (superadmin only)
   */
  async deleteCMS(req: Request, res: Response) {
    try {
      const { cmsId } = req.params;

      if (!cmsId) {
        return res.status(400).json({
          success: false,
          message: "CMS ID is required",
        });
      }

      await homeCMSService.deleteCMS(cmsId);

      return res.status(200).json({
        success: true,
        message: "CMS content deleted successfully",
      });
    } catch (error: any) {
      console.error("Error in deleteCMS:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete CMS content",
      });
    }
  }
}

export const homeCMSController = new HomeCMSController();
