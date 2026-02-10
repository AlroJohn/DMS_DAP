import { Request, Response } from 'express';
import { createProcessType, updateProcessType, getAllProcessTypes, getProcessTypeById, deleteProcessType } from '../services/process-type.service';

const getStringValue = (param: string | string[] | undefined): string | undefined => {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
};

export const createProcessTypeHandler = async (req: Request, res: Response) => {
  try {
    const { code, name, description, duration_value, duration_unit, origin_department_id, is_active } = req.body;

    const processType = await createProcessType({
      code,
      name,
      description,
      duration_value: duration_value ? parseInt(duration_value) : undefined,
      duration_unit,
      origin_department_id: origin_department_id || null,
      is_active,
    });

    res.status(201).json(processType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create process type' });
  }
};

export const getAllProcessTypesHandler = async (req: Request, res: Response) => {
  try {
    const processTypes = await getAllProcessTypes();
    res.json(processTypes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch process types' });
  }
};

export const getProcessTypeByIdHandler = async (req: Request, res: Response) => {
  try {
    const id = getStringValue(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Process type ID is required' });
    }
    const processType = await getProcessTypeById(id);

    if (!processType) {
      return res.status(404).json({ error: 'Process type not found' });
    }

    res.json(processType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch process type' });
  }
};

export const updateProcessTypeHandler = async (req: Request, res: Response) => {
  try {
    const id = getStringValue(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Process type ID is required' });
    }
    const { code, name, description, duration_value, duration_unit, origin_department_id, is_active } = req.body;

    const processType = await updateProcessType(id, {
      code,
      name,
      description,
      duration_value: duration_value ? parseInt(duration_value) : undefined,
      duration_unit,
      origin_department_id: origin_department_id || null,
      is_active,
    });

    res.json(processType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update process type' });
  }
};

export const deleteProcessTypeHandler = async (req: Request, res: Response) => {
  try {
    const id = getStringValue(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Process type ID is required' });
    }
    await deleteProcessType(id);
    res.json({ message: 'Process type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete process type' });
  }
};
