import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth-middleware';
import { DocumentActionService } from '../services/document-action.service';

export class DocumentActionController {
  private documentActionService: DocumentActionService;

  constructor() {
    this.documentActionService = new DocumentActionService();
  }

  async getAllDocumentActions(req: Request, res: Response) {
    try {
      // Check if there's a query parameter to get only active actions
      const { activeOnly } = req.query;
      let documentActions;

      if (activeOnly === 'true') {
        documentActions = await this.documentActionService.getActiveDocumentActions();
      } else {
        documentActions = await this.documentActionService.getAllDocumentActions();
      }

      res.json({ success: true, data: documentActions });
    } catch (error) {
      console.error('Error fetching document actions:', error);
      res.status(500).json({ success: false, message: 'Error fetching document actions', error: (error as Error).message });
    }
  }

  async getDocumentActionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const documentAction = await this.documentActionService.getDocumentActionById(id);
      if (!documentAction) {
        return res.status(404).json({ success: false, message: 'Document action not found' });
      }
      res.json({ success: true, data: documentAction });
    } catch (error) {
      console.error('Error fetching document action:', error);
      res.status(500).json({ success: false, message: 'Error fetching document action', error: (error as Error).message });
    }
  }

  async createDocumentAction(req: Request, res: Response) {
    try {
      const { action_name, description, sender_tag, recipient_tag, action_date, status } = req.body;
      if (!action_name) {
        return res.status(400).json({ success: false, message: 'Action name is required' });
      }
      const newDocumentAction = await this.documentActionService.createDocumentAction({
        action_name,
        description,
        sender_tag,
        recipient_tag,
        action_date: action_date ? new Date(action_date) : undefined,
        status,
      });
      res.status(201).json({ success: true, message: 'Document action created successfully', data: newDocumentAction });
    } catch (error) {
      console.error('Error creating document action:', error);
      res.status(500).json({ success: false, message: 'Error creating document action', error: (error as Error).message });
    }
  }

  async updateDocumentAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action_name, description, sender_tag, recipient_tag, action_date, status } = req.body;
      const updatedDocumentAction = await this.documentActionService.updateDocumentAction(id, {
        action_name,
        description,
        sender_tag,
        recipient_tag,
        action_date: action_date ? new Date(action_date) : undefined,
        status,
      });
      if (!updatedDocumentAction) {
        return res.status(404).json({ success: false, message: 'Document action not found' });
      }
      res.json({ success: true, message: 'Document action updated successfully', data: updatedDocumentAction });
    } catch (error) {
      console.error('Error updating document action:', error);
      res.status(500).json({ success: false, message: 'Error updating document action', error: (error as Error).message });
    }
  }

  async deleteDocumentAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedDocumentAction = await this.documentActionService.deleteDocumentAction(id);
      if (!deletedDocumentAction) {
        return res.status(404).json({ success: false, message: 'Document action not found' });
      }
      res.json({ success: true, message: 'Document action deleted successfully', data: deletedDocumentAction });
    } catch (error) {
      console.error('Error deleting document action:', error);
      res.status(500).json({ success: false, message: 'Error deleting document action', error: (error as Error).message });
    }
  }

  async toggleDocumentActionStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedAction = await this.documentActionService.toggleDocumentActionStatus(id);
      res.json({
        success: true,
        message: `Document action ${updatedAction.status ? 'activated' : 'deactivated'} successfully`,
        data: updatedAction,
      });
    } catch (error) {
      console.error('Error toggling document action status:', error);
      res.status(500).json({ success: false, message: 'Error toggling document action status', error: (error as Error).message });
    }
  }
}
