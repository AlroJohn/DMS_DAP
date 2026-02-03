import { prisma } from '../lib/prisma';

export const createProcessType = async (data: {
  code: string;
  name: string;
  description?: string;
  duration_value?: number;
  duration_unit?: string;
  is_active?: boolean;
}) => {
  return await prisma.processType.create({
    data,
  });
};

export const getAllProcessTypes = async () => {
  return await prisma.processType.findMany({
    orderBy: {
      created_at: 'desc',
    },
  });
};

export const getProcessTypeById = async (id: string) => {
  return await prisma.processType.findUnique({
    where: { process_type_id: id },
  });
};

export const updateProcessType = async (
  id: string,
  data: {
    code?: string;
    name?: string;
    description?: string;
    duration_value?: number;
    duration_unit?: string;
    is_active?: boolean;
  }
) => {
  return await prisma.processType.update({
    where: { process_type_id: id },
    data,
  });
};

export const deleteProcessType = async (id: string) => {
  return await prisma.processType.delete({
    where: { process_type_id: id },
  });
};