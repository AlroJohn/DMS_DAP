import { prisma } from '../lib/prisma';

class CounterService {
  async getDepartmentCount() {
    return await prisma.department.count({
      where: { active: true }
    });
  }

  async getDocumentTypeCount() {
    return await prisma.documentType.count({
      where: { active: true }
    });
  }

  async getDocumentActionCount() {
    return await prisma.documentAction.count({
      where: { status: true }
    });
  }

  async getUserCount() {
    return await prisma.user.count({
      where: {
        active: true,
        account: {
          is_active: true
        }
      }
    });
  }

  async getProcessTypeCount() {
    return await prisma.processType.count({
      where: { is_active: true }
    });
  }
}

export default new CounterService();
