import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PermissionCheckboxGroupProps {
  title: string;
  permissions: { id: string; name: string; description?: string }[];
  selectedPermissions: string[];
  onPermissionChange: (permissionId: string, isChecked: boolean) => void;
}

const PermissionCheckboxGroup: React.FC<PermissionCheckboxGroupProps> = ({
  title,
  permissions,
  selectedPermissions,
  onPermissionChange,
}) => {
  // Check if all permissions in this group are selected
  const allSelected = permissions.every(permission => 
    selectedPermissions.includes(permission.id)
  );
  
  // Check if some (but not all) permissions in this group are selected
  const someSelected = permissions.some(permission => 
    selectedPermissions.includes(permission.id)
  ) && !allSelected;

  // Handle select all/unselect all for this group
  const handleSelectAllChange = (checked: boolean) => {
    permissions.forEach(permission => {
      if (checked !== selectedPermissions.includes(permission.id)) {
        onPermissionChange(permission.id, checked);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={`select-all-${title.replace(/\s+/g, '-').toLowerCase()}`}
          checked={allSelected}
          onCheckedChange={handleSelectAllChange}
          indeterminate={someSelected}
        />
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-6">
        {permissions.map((permission) => (
          <div key={permission.id} className="flex items-center space-x-2">
            <Checkbox
              id={permission.id}
              checked={selectedPermissions.includes(permission.id)}
              onCheckedChange={(checked) =>
                onPermissionChange(permission.id, checked as boolean)
              }
            />
            <Label
              htmlFor={permission.id}
              className="text-sm font-normal cursor-pointer"
            >
              {permission.name}
              {permission.description && (
                <span className="text-xs text-gray-500 ml-1">
                  ({permission.description})
                </span>
              )}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PermissionCheckboxGroup;
