"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PermissionCheckboxGroup from "@/components/auth/permission-checkbox-group";
import { PermissionDefinition } from "@dms/types";

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    role_id?: string;
    name: string;
    code: string;
    description?: string;
    is_system_role?: boolean;
    permissions: PermissionDefinition[];
  };
  availablePermissions: PermissionDefinition[];
}

interface FormData {
  name: string;
  code: string;
  description: string;
  is_system_role: boolean;
  selectedPermissionIds: string[];
}

const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  availablePermissions,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: "",
    description: "",
    is_system_role: false,
    selectedPermissionIds: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          code: initialData.code,
          description: initialData.description || "",
          is_system_role: initialData.is_system_role || false,
          selectedPermissionIds: initialData.permissions.map(
            (p) => p.permission_id
          ),
        });
      } else {
        setFormData({
          name: "",
          code: "",
          description: "",
          is_system_role: false,
          selectedPermissionIds: [],
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePermissionChange = (permissionId: string, isChecked: boolean) => {
    setFormData((prev) => {
      const newSelected = isChecked
        ? [...prev.selectedPermissionIds, permissionId]
        : prev.selectedPermissionIds.filter((id) => id !== permissionId);
      return { ...prev, selectedPermissionIds: newSelected };
    });
    if (errors.selectedPermissionIds) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.selectedPermissionIds;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Role name is required";
    }
    if (!formData.code.trim()) {
      newErrors.code = "Role code is required";
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(formData.code.trim())) {
      newErrors.code =
        "Code must be uppercase, alphanumeric with underscores, starting with a letter";
    }
    if (formData.selectedPermissionIds.length === 0) {
      newErrors.selectedPermissionIds =
        "At least one permission must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const groupPermissions = (permissions: PermissionDefinition[]) => {
    const grouped: Record<string, PermissionDefinition[]> = {};
    permissions.forEach((p) => {
      const resourceType = p.resource_type || "General"; // Default group if resource_type is missing
      if (!grouped[resourceType]) {
        grouped[resourceType] = [];
      }
      grouped[resourceType].push(p);
    });
    return grouped;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please correct the errors in the form.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = initialData?.role_id
        ? `/api/admin/roles/${initialData.role_id}`
        : "/api/admin/roles";
      const method = initialData?.role_id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code.toUpperCase(),
          description: formData.description,
          isSystemRole: formData.is_system_role,
          permissions: formData.selectedPermissionIds,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(
          result.message ||
            `Role ${initialData ? "updated" : "created"} successfully!`
        );
        onSuccess();
        onClose();
      } else {
        throw new Error(
          result.message ||
            `Failed to ${initialData ? "update" : "create"} role.`
        );
      }
    } catch (error: any) {
      console.error("Error saving role:", error);
      toast.error(
        error.message ||
          `An unexpected error occurred while ${
            initialData ? "updating" : "creating"
          } the role.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedPermissions = groupPermissions(availablePermissions);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Role" : "Create New Role"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? `Edit the details for ${initialData.name}`
              : "Create a new role and assign permissions."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-grow overflow-hidden"
        >
          <div className="grid grid-cols-2 gap-4 p-2 flex-shrink-0">
            <div className="space-y-2">
              <Label htmlFor="name">
                Role Name<span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">
                Role Code<span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className={errors.code ? "border-red-500" : ""}
                readOnly={initialData?.is_system_role} // Prevent changing code for system roles
              />
              {errors.code && (
                <p className="text-xs text-red-500">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {initialData?.is_system_role && (
              <div className="text-sm text-red-600">
                This is a system role. Its code cannot be changed.
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_system_role"
                name="is_system_role"
                checked={formData.is_system_role}
                onCheckedChange={(checked) =>
                  handleInputChange({
                    target: {
                      name: "is_system_role",
                      value: checked,
                      type: "checkbox",
                    },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
                disabled={initialData?.is_system_role} // Prevent changing system role status
              />
              <Label htmlFor="is_system_role" className="text-sm font-normal">
                System Role (Cannot be deleted or modified extensively)
              </Label>
            </div>
          </div>

          <div className="space-y-4 flex-grow overflow-y-auto">
            <h3 className="text-lg font-semibold">
              Permissions<span className="text-red-500">*</span>
            </h3>
            <div className="rounded-md border p-4 grid gap-4">
              {Object.entries(groupedPermissions).map(
                ([resourceType, permissions]) => (
                  <PermissionCheckboxGroup
                    key={resourceType}
                    title={`${resourceType
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())} Permissions`}
                    permissions={permissions.map((p) => ({
                      id: p.permission_id,
                      name: p.permission,
                      description: p.description,
                    }))}
                    selectedPermissions={formData.selectedPermissionIds}
                    onPermissionChange={handlePermissionChange}
                  />
                )
              )}
            </div>
            {errors.selectedPermissionIds && (
              <p className="text-xs text-red-500">
                {errors.selectedPermissionIds}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 flex-shrink-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : initialData ? (
                "Update Role"
              ) : (
                "Create Role"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleFormModal;
