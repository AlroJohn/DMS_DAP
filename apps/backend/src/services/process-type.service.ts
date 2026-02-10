import { prisma } from '../lib/prisma';

export const createProcessType = async (data: {
  code: string;
  name: string;
  description?: string;
  duration_value?: number;
  duration_unit?: string;
  origin_department_id?: string | null;
  is_active?: boolean;
}) => {
  return await prisma.processType.create({
    data,
    include: {
      originDepartment: {
        include: {
          group: true,
          center: true,
        },
      },
    },
  });
};

export const getAllProcessTypes = async () => {
  return await prisma.processType.findMany({
    include: {
      originDepartment: {
        include: {
          group: true,
          center: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });
};

export const getProcessTypeById = async (id: string) => {
  return await prisma.processType.findUnique({
    where: { process_type_id: id },
    include: {
      originDepartment: {
        include: {
          group: true,
          center: true,
        },
      },
    },
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
    origin_department_id?: string | null;
    is_active?: boolean;
  }
) => {
  return await prisma.processType.update({
    where: { process_type_id: id },
    data,
    include: {
      originDepartment: {
        include: {
          group: true,
          center: true,
        },
      },
    },
  });
};

export const deleteProcessType = async (id: string) => {
  return await prisma.processType.delete({
    where: { process_type_id: id },
  });
};
