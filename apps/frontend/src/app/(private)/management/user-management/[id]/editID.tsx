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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  user_id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  user_name?: string;
  title?: string;
  type?: string;
  avatar?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  account: {
    email: string;
    is_active: boolean;
    email_verified: boolean;
    last_login?: string;
  };
  department: {
    department_id: string;
    name: string;
    code: string;
  };
  user_roles?: {
    role: {
      role_id: string;
      name: string;
      code: string;
    };
  }[];
}

interface Department {
  department_id: string;
  name: string;
  code: string;
}

interface Role {
  role_id: string;
  name: string;
  code: string;
  description?: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  departments: Department[];
  roles: Role[];
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  departments,
  roles,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: user.account.email,
    first_name: user.first_name,
    last_name: user.last_name,
    middle_name: user.middle_name || "",
    user_name: user.user_name || "",
    title: user.title || "",
    type: user.type || "",
    department_id: user.department.department_id,
    role_id: user.user_roles?.[0]?.role.role_id || "",
    active: user.active,
    is_active: user.account.is_active,
    change_password: false,
    new_password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when user prop changes
  useEffect(() => {
    setFormData({
      email: user.account.email,
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name || "",
      user_name: user.user_name || "",
      title: user.title || "",
      type: user.type || "",
      department_id: user.department.department_id,
      role_id: user.user_roles?.[0]?.role.role_id || "",
      active: user.active,
      is_active: user.account.is_active,
      change_password: false,
      new_password: "",
      confirm_password: "",
    });
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.first_name) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.department_id) {
      newErrors.department_id = "Department is required";
    }

    if (!formData.role_id) {
      newErrors.role_id = "Role is required";
    }

    if (formData.change_password) {
      if (!formData.new_password) {
        newErrors.new_password = "New password is required";
      } else if (formData.new_password.length < 8) {
        newErrors.new_password = "Password must be at least 8 characters";
      }

      if (formData.new_password !== formData.confirm_password) {
        newErrors.confirm_password = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken') || document.cookie
        .split(';')
        .find(c => c.trim().startsWith('accessToken='))
        ?.split('=')[1];

      const updateData: any = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || undefined,
        user_name: formData.user_name || undefined,
        title: formData.title || undefined,
        type: formData.type || undefined,
        department_id: formData.department_id,
        role_id: formData.role_id,
        active: formData.active,
        is_active: formData.is_active,
      };

      if (formData.change_password && formData.new_password) {
        updateData.password = formData.new_password;
      }

      const response = await fetch(`/api/admin/users/${user.user_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "User updated successfully");
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Error updating user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update information for {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Account Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="user@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="change_password"
                checked={formData.change_password}
                onCheckedChange={(checked) => handleCheckboxChange("change_password", checked as boolean)}
              />
              <Label htmlFor="change_password" className="text-sm font-normal">
                Change Password
              </Label>
            </div>

            {formData.change_password && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">
                    New Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="new_password"
                    name="new_password"
                    type="password"
                    value={formData.new_password}
                    onChange={handleInputChange}
                    placeholder="Min. 8 characters"
                    className={errors.new_password ? "border-red-500" : ""}
                  />
                  {errors.new_password && (
                    <p className="text-xs text-red-500">{errors.new_password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    placeholder="Re-enter password"
                    className={errors.confirm_password ? "border-red-500" : ""}
                  />
                  {errors.confirm_password && (
                    <p className="text-xs text-red-500">{errors.confirm_password}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Personal Information */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700">Personal Information</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="John"
                  className={errors.first_name ? "border-red-500" : ""}
                />
                {errors.first_name && (
                  <p className="text-xs text-red-500">{errors.first_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleInputChange}
                  placeholder="M."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className={errors.last_name ? "border-red-500" : ""}
                />
                {errors.last_name && (
                  <p className="text-xs text-red-500">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user_name">Username</Label>
                <Input
                  id="user_name"
                  name="user_name"
                  value={formData.user_name}
                  onChange={handleInputChange}
                  placeholder="johndoe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Manager"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Organization Information */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700">Organization Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department_id">
                  Department <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.department_id} 
                  onValueChange={(value) => handleSelectChange("department_id", value)}
                >
                  <SelectTrigger className={errors.department_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.department_id} value={dept.department_id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && (
                  <p className="text-xs text-red-500">{errors.department_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role_id">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.role_id} 
                  onValueChange={(value) => handleSelectChange("role_id", value)}
                >
                  <SelectTrigger className={errors.role_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.role_id} value={role.role_id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role_id && (
                  <p className="text-xs text-red-500">{errors.role_id}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-700">Status</h3>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => handleCheckboxChange("active", checked as boolean)}
                />
                <Label htmlFor="active" className="text-sm font-normal">
                  User Active
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleCheckboxChange("is_active", checked as boolean)}
                />
                <Label htmlFor="is_active" className="text-sm font-normal">
                  Account Active
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
                  Updating...
                </>
              ) : (
                "Update User"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;

