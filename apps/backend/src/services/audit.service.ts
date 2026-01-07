

import { prisma } from '../lib/prisma';

interface TrailLogDetails {
  description?: string;
  fromDepartmentId?: string;
  toDepartmentId?: string;
  status?: string;
}

class AuditService {
  private async getUserDepartmentId(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { department_id: true },
      });
      return user?.department_id ?? null;
    } catch (error) {
      console.error('Failed to resolve user department:', error);
      return null;
    }
  }

  private async createDocumentTrail(
    userId: string,
    documentId: string,
    status: string,
    details: TrailLogDetails = {}
  ) {
    try {
      const userDepartmentId = await this.getUserDepartmentId(userId);
      const fromDepartment = details.fromDepartmentId ?? userDepartmentId ?? undefined;
      const toDepartment = details.toDepartmentId ?? userDepartmentId ?? undefined;

      await prisma.documentTrail.create({
        data: {
          document_id: documentId,
          user_id: userId,
          from_department: fromDepartment,
          to_department: toDepartment,
          status,
          remarks: details.description,
        },
      });
    } catch (error) {
      console.error('Failed to create document trail:', error);
    }
  }

  async logDocumentCreated(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'dispatch', {
      description: details.description ?? 'Document created',
      ...details,
    });
  }

  async logDocumentReleased(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'intransit', {
      description: details.description ?? 'Document released',
      ...details,
    });
  }

  async logDocumentReceived(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'received', {
      description: details.description ?? 'Document received',
      ...details,
    });
  }

  async logDocumentDeleted(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'deleted', {
      description: details.description ?? 'Document deleted',
      ...details,
    });
  }

  async logDocumentArchived(userId: string, documentId: string, details: TrailLogDetails = {}) {
    return this.createDocumentTrail(userId, documentId, details.status ?? 'archive', {
      description: details.description ?? 'Document archived',
      ...details,
    });
  }
}

export const auditService = new AuditService();
