import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class CounterService {
  async getDepartmentCount() {
    return await prisma.department.count();
  }

  async getDocumentTypeCount() {
    return await prisma.documentType.count();
  }

  async getDocumentActionCount() {
    return await prisma.documentAction.count();
  }

  async getUserCount() {
    return await prisma.user.count();
  }
}

export default new CounterService();
