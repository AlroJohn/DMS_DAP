

import { AuditActionType } from '@prisma/client';

interface AuditLogDetails {
  oldValues?: object;
  newValues?: object;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  async createAuditLog(
    userId: string,
    documentId: string,
    action: AuditActionType,
    details: AuditLogDetails = {}
  ) {
    try {
      await prisma.documentAuditTrail.create({
        data: {
          user_id: userId,
          document_id: documentId,
          action_type: action,
          action_description: details.description,
          old_values: details.oldValues,
          new_values: details.newValues,
          ip_address: details.ipAddress,
          user_agent: details.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit trail:', error);
      // Depending on the application's needs, you might want to throw the error
      // or handle it gracefully. For now, we'll log it.
    }
  }
}

export const auditService = new AuditService();
