import { Request, Response } from 'express';
import { DocumentReportsService } from '../services/document-reports.service';

const documentReportsService = new DocumentReportsService();

export const getUsageReport = async (req: Request, res: Response) => {
  try {
    const { dateRange } = req.query;
    const report = await documentReportsService.getUsageReport(dateRange as string || '30days');
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting usage report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve usage report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getVersionHistoryReport = async (req: Request, res: Response) => {
  try {
    const report = await documentReportsService.getVersionHistoryReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error getting version history report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve version history report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getDocumentVersionHistory = async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }

    const versionHistory = await documentReportsService.getDocumentVersionHistory(documentId);
    res.json({
      success: true,
      data: versionHistory
    });
  } catch (error) {
    console.error('Error getting document version history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document version history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const compareDocumentVersions = async (req: Request, res: Response) => {
  try {
    const { fileId1, fileId2 } = req.body;
    
    if (!fileId1 || !fileId2) {
      return res.status(400).json({
        success: false,
        message: 'Both fileId1 and fileId2 are required in the request body'
      });
    }

    const comparison = await documentReportsService.compareDocumentVersions(fileId1, fileId2);
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error comparing document versions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare document versions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};