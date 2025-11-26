import { Request, Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: any
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(meta && { meta })
  };
  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(details && { details })
    }
  };
  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  paginatedData: PaginatedResponse<T>,
  statusCode: number = 200
): Response => {
  const response: ApiResponse<T[]> = {
    success: true,
    data: paginatedData.data,
    meta: {
      page: paginatedData.pagination.page,
      limit: paginatedData.pagination.limit,
      total: paginatedData.pagination.total
    }
  };
  return res.status(statusCode).json(response);
};

/**
 * Extract pagination parameters from query
 */
export const getPaginationParams = (req: Request) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const sortBy = req.query.sortBy as string || 'created_at';
  const sortOrder = (req.query.sortOrder as string) || 'desc';
  
  return {
    page,
    limit,
    sortBy,
    sortOrder: sortOrder as 'asc' | 'desc',
    offset: (page - 1) * limit
  };
};

/**
 * Generate pagination metadata
 */
export const generatePaginationMeta = (
  page: number,
  limit: number,
  total: number
) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

/**
 * Validate required fields in request body
 */
export const validateRequiredFields = (
  body: any,
  requiredFields: string[]
): string[] => {
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      missingFields.push(field);
    }
  });
  
  return missingFields;
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
