import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DocumentTypeService {
  // Get all document types with pagination and search
  async getAllDocumentTypes(page: number = 1, limit: number = 10, search: string = '') {
    try {
      const skip = (page - 1) * limit;
      
      const whereClause: any = {};
      
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      const documentTypes = await prisma.documentType.findMany({
        where: whereClause,
        orderBy: {
          name: 'asc',
        },
        skip,
        take: limit,
      });
      
      const totalCount = await prisma.documentType.count({ where: whereClause });
      
      return {
        data: documentTypes,
        meta: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching document types:', error);
      throw new Error('Failed to fetch document types');
    }
  }

  // Get document type by ID
  async getDocumentTypeById(typeId: string) {
    try {
      const documentType = await prisma.documentType.findUnique({
        where: { type_id: typeId },
      });
      
      if (!documentType) {
        throw new Error('Document type not found');
      }
      
      return documentType;
    } catch (error) {
      console.error('Error fetching document type:', error);
      throw new Error('Failed to fetch document type');
    }
  }

  // Create new document type
  async createDocumentType(name: string, description: string = '', active: boolean = true) {
    try {
      // Validate required fields
      if (!name) {
        throw new Error('Document type name is required');
      }
      
      // Check if document type with same name already exists
      const existingType = await prisma.documentType.findUnique({
        where: { name: name.trim() },
      });
      
      if (existingType) {
        throw new Error('Document type with this name already exists');
      }
      
      const documentType = await prisma.documentType.create({
        data: {
          name: name.trim(),
          description,
          active,
        },
      });
      
      return documentType;
    } catch (error) {
      console.error('Error creating document type:', error);
      throw new Error('Failed to create document type');
    }
  }

  // Update document type
  async updateDocumentType(typeId: string, name?: string, description?: string, active?: boolean) {
    try {
      // Find existing document type
      const existingType = await prisma.documentType.findUnique({
        where: { type_id: typeId },
      });
      
      if (!existingType) {
        throw new Error('Document type not found');
      }
      
      // Check if name is being changed and if it already exists
      if (name && name !== existingType.name) {
        const duplicateName = await prisma.documentType.findUnique({
          where: { name: name.trim() },
        });
        
        if (duplicateName) {
          throw new Error('Document type with this name already exists');
        }
      }
      
      const updatedType = await prisma.documentType.update({
        where: { type_id: typeId },
        data: {
          name: name ? name.trim() : undefined,
          description: description !== undefined ? description : undefined,
          active: active !== undefined ? active : undefined,
        },
      });
      
      return updatedType;
    } catch (error) {
      console.error('Error updating document type:', error);
      throw new Error('Failed to update document type');
    }
  }

  // Delete document type (hard delete)
  async deleteDocumentType(typeId: string) {
    try {
      // Find existing document type
      const existingType = await prisma.documentType.findUnique({
        where: { type_id: typeId },
      });
      
      if (!existingType) {
        throw new Error('Document type not found');
      }
      
      // Hard delete the document type
      const deletedType = await prisma.documentType.delete({
        where: { type_id: typeId },
      });
      
      return deletedType;
    } catch (error) {
      console.error('Error deleting document type:', error);
      throw new Error('Failed to delete document type');
    }
  }

  // Toggle document type status
  async toggleDocumentTypeStatus(typeId: string) {
    try {
      // Find existing document type
      const existingType = await prisma.documentType.findUnique({
        where: { type_id: typeId },
      });
      
      if (!existingType) {
        throw new Error('Document type not found');
      }
      
      // Toggle status
      const toggledType = await prisma.documentType.update({
        where: { type_id: typeId },
        data: { active: !existingType.active },
      });
      
      return toggledType;
    } catch (error) {
      console.error('Error toggling document type status:', error);
      throw new Error('Failed to toggle document type status');
    }
  }
}