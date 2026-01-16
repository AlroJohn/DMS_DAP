import { Permission } from "@dms/types";
import { useAuth } from "./use-auth";

export const useHasPermission = (permission: Permission): boolean => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Check if user has the specific permission
  return user.permissions?.includes(permission) || false;
};

export const useHasAnyPermission = (permissions: Permission[]): boolean => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Check if user has any of the specified permissions
  return permissions.some(permission => user.permissions?.includes(permission));
};

export const useHasAllPermissions = (permissions: Permission[]): boolean => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // Check if user has all of the specified permissions
  return permissions.every(permission => user.permissions?.includes(permission));
};
