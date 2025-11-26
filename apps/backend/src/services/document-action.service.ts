import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DocumentActionService {
  async getAllDocumentActions() {
    return prisma.documentAction.findMany();
  }

  async getActiveDocumentActions() {
    return prisma.documentAction.findMany({
      where: {
        status: true,
      },
    });
  }

  async getDocumentActionById(id: string) {
    return prisma.documentAction.findUnique({
      where: { document_action_id: id },
    });
  }

  async createDocumentAction(data: {
    action_name: string;
    description?: string;
    sender_tag?: string;
    recipient_tag?: string;
    action_date?: Date;
    status?: boolean;
  }) {
    return prisma.documentAction.create({ data });
  }

  async updateDocumentAction(
    id: string,
    data: {
      action_name?: string;
      description?: string;
      sender_tag?: string;
      recipient_tag?: string;
      action_date?: Date;
      status?: boolean;
    }
  ) {
    return prisma.documentAction.update({
      where: { document_action_id: id },
      data,
    });
  }

  async deleteDocumentAction(id: string) {
    return prisma.documentAction.delete({
      where: { document_action_id: id },
    });
  }

  async toggleDocumentActionStatus(id: string) {
    const existingAction = await prisma.documentAction.findUnique({
      where: { document_action_id: id },
    });

    if (!existingAction) {
      throw new Error('Document action not found');
    }

    const updatedAction = await prisma.documentAction.update({
      where: { document_action_id: id },
      data: { status: !existingAction.status },
    });

    return updatedAction;
  }
}
