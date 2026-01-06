import { prisma } from '../lib/prisma';
import { DocumentService } from './document.service';

export class DashboardService {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  async getDashboardStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { department_id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const departmentId = user.department_id;

    // Use existing services to get counts
    const ownedDocuments = await this.documentService.getOwnedDocuments(userId, 1, 1);
    const inTransitDocuments = await prisma.document.count({ where: { status: 'in-transit' } });
    const receivedDocuments = await this.documentService.getReceivedDocuments(userId, 1, 1);
    const completedDocuments = await this.documentService.getCompletedDocuments(userId, 1, 1);

    const documentStats = {
      owned: ownedDocuments.pagination.total,
      inTransit: inTransitDocuments,
      shared: receivedDocuments.pagination.total, // Assuming received are shared
      archive: await prisma.document.count({ where: { status: 'archive' } }),
      recycleBin: await prisma.document.count({ where: { status: 'deleted' } }),
      total: await prisma.document.count({ where: { status: { notIn: ['deleted', 'archive'] } } }),
      completed: completedDocuments.pagination.total,
    };

    const documentTrends = await this.getDocumentTrends(departmentId);
    const recentDocuments = await this.getRecentDocuments(userId);

    // Mock data for other stats until they are implemented
    const stats = {
        documentStats: documentStats,
        recentActivity: 5, 
        pendingApprovals: 5,
        activeWorkflows: 5,
        collaborators: 10,
        storageUsage: { used: 50, total: 100, percentage: 50 },
        complianceStatus: 98,
        systemActivity: [],
        topDocuments: [],
        departmentPerformance: [
            { name: 'Human Resources', documentsProcessed: 120, efficiency: 95 },
            { name: 'Finance', documentsProcessed: 90, efficiency: 88 },
            { name: 'IT', documentsProcessed: 150, efficiency: 98 },
        ],
        workflowStats: {
            totalWorkflows: 20,
            completedWorkflows: 15,
            pendingWorkflows: 3,
            inProgressWorkflows: 2,
        },
        recentDocuments: recentDocuments,
        documentTrends: documentTrends,
    };

    return stats;
  }

  private async getDocumentTrends(departmentId: string) {
    const trends = await prisma.document.groupBy({
      by: ['created_at'],
      where: {
        DocumentAdditionalDetails: {
          some: {
            work_flow_id: {
              string_contains: `"${departmentId}"`
            }
          }
        }
      },
      _count: {
        document_id: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // This is a simplified version. A real implementation should group by month.
    return trends.map(t => ({
        month: new Date(t.created_at).toLocaleString('default', { month: 'short' }),
        active: t._count.document_id,
        archived: 0, // Placeholder
    }));
  }

  private async getRecentDocuments(userId: string) {
    const { data } = await this.documentService.getAllDocuments(userId, 1, 5);
    return data.map(doc => ({
        id: doc.id,
        title: doc.document,
        sender: {
            name: doc.contactPerson,
            initials: doc.contactPerson.substring(0,2),
        },
        timeAgo: this.formatTimeAgo(doc.activityTime),
    }));
  }

    private formatTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) {
            return Math.floor(interval) + " years ago";
        }
        interval = seconds / 2592000;
        if (interval > 1) {
            return Math.floor(interval) + " months ago";
        }
        interval = seconds / 86400;
        if (interval > 1) {
            return Math.floor(interval) + " days ago";
        }
        interval = seconds / 3600;
        if (interval > 1) {
            return Math.floor(interval) + " hours ago";
        }
        interval = seconds / 60;
        if (interval > 1) {
            return Math.floor(interval) + " minutes ago";
        }
        return Math.floor(seconds) + " seconds ago";
    }
}