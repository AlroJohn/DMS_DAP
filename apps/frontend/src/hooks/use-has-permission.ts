import { Permission } from "@dms/types";

export const useHasPermission = (permission: Permission): boolean => {
  // TODO: Implement actual permission logic here.
  // This hook should check the user's roles/permissions from a global state or context.
  console.warn(`Using mocked permission check for: ${permission}`);
  return true; // Always return true for now
};
