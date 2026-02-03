import { Request, Response } from 'express';
import { createProcessType, updateProcessType, getAllProcessTypes, getProcessTypeById, deleteProcessType } from '../services/process-type.service';

export const createProcessTypeHandler = async (req: Request, res: Response) => {
  try {
    const { name, description, duration_days, is_active } = req.body;
    
    const processType = await createProcessType({
      name,
      description,
      duration_days: duration_days ? parseInt(duration_days) : undefined,
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
    const { id } = req.params;
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
    const { id } = req.params;
    const { name, description, duration_days, is_active } = req.body;
    
    const processType = await updateProcessType(id, {
      name,
      description,
      duration_days: duration_days ? parseInt(duration_days) : undefined,
      is_active,
    });
    
    res.json(processType);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update process type' });
  }
};

export const deleteProcessTypeHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteProcessType(id);
    res.json({ message: 'Process type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete process type' });
  }
};