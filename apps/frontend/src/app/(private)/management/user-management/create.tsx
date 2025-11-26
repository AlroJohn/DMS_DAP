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
import { Loader2, UserPlus, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: Department[];
  roles: Role[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  departments,
  roles,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationMode, setCreationMode] = useState<"manual" | "invite">("manual");
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    user_name: "",
    title: "",
    type: "",
    department_id: "",
    role_id: "",
    password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  const resetForm = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      middle_name: "",
      user_name: "",
      title: "",
      type: "",
      department_id: "",
      role_id: "",
      password: "",
      confirm_password: "",
    });
    setErrors({});
    setCreationMode("manual");
  };

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const email = formData.email.trim();
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format";
    }

    // Name validation
    const firstName = formData.first_name.trim();
    if (!firstName) {
      newErrors.first_name = "First name is required";
    } else if (firstName.length < 1 || firstName.length > 50) {
      newErrors.first_name = "First name must be between 1 and 50 characters";
    }

    const lastName = formData.last_name.trim();
    if (!lastName) {
      newErrors.last_name = "Last name is required";
    } else if (lastName.length < 1 || lastName.length > 50) {
      newErrors.last_name = "Last name must be between 1 and 50 characters";
    }

    // Username validation (optional but if provided, should be valid) - only for manual creation
    if (creationMode === "manual") {
      const userName = formData.user_name.trim();
      if (userName && (userName.length < 3 || userName.length > 20)) {
        newErrors.user_name = "Username must be between 3 and 20 characters";
      }
      if (userName && !/^[a-zA-Z0-9_]+$/.test(userName)) {
        newErrors.user_name = "Username can only contain letters, numbers, and underscores";
      }
    }

    // Department validation
    if (!formData.department_id) {
      newErrors.department_id = "Department is required";
    }

    // Role validation
    if (!formData.role_id) {
      newErrors.role_id = "Role is required";
    }

    // Password validation - only for manual creation
    if (creationMode === "manual") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
      }

      // Confirm password validation
      if (formData.password !== formData.confirm_password) {
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

      if (creationMode === "manual") {
        // Manual user creation with password
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            middle_name: formData.middle_name.trim() || undefined,
            user_name: formData.user_name.trim() || undefined,
            title: formData.title.trim() || undefined,
            type: formData.type || undefined,
            department_id: formData.department_id,
            role_id: formData.role_id,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          toast.success("User created successfully");
          onSuccess();
          onClose();
        } else {
          handleCreateUserError(response, result);
        }
      } else {
        // Invitation mode
        const response = await fetch("/api/admin/invitations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formData.email.trim(),
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            department_id: formData.department_id,
            role_id: formData.role_id,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          toast.success("Invitation sent successfully! The user will receive an email to sign up with Google.");
          onSuccess();
          onClose();
        } else {
          handleInvitationError(response, result);
        }
      }
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error(creationMode === "manual" ? "Error creating user" : "Error sending invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUserError = (response: Response, result: any) => {
    if (response.status === 409) {
      if (result.error?.message?.includes('Email')) {
        setErrors({ email: 'Email already exists' });
        toast.error("Email already exists");
      } else if (result.error?.message?.includes('Username')) {
        setErrors({ user_name: 'Username already exists' });
        toast.error("Username already exists");
      } else {
        toast.error(result.error?.message || "Failed to create user");
      }
    } else if (response.status === 403) {
      toast.error("You don't have permission to create users");
    } else if (response.status === 400) {
      toast.error(result.error?.message || "Invalid input data");
    } else {
      toast.error(result.error?.message || "Failed to create user");
    }
  };

  const handleInvitationError = (response: Response, result: any) => {
    if (response.status === 409) {
      if (result.error?.message?.includes('Email')) {
        setErrors({ email: 'Email already exists or invitation already sent' });
        toast.error("Email already exists or invitation already sent");
      } else {
        toast.error(result.error?.message || "Failed to send invitation");
      }
    } else if (response.status === 403) {
      toast.error("You don't have permission to send invitations");
    } else if (response.status === 400) {
      toast.error(result.error?.message || "Invalid input data");
    } else {
      toast.error(result.error?.message || "Failed to send invitation");
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a user manually or send an invitation for Google signup
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={creationMode} onValueChange={(value) => setCreationMode(value as "manual" | "invite")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Manual Creation
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Invitation
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <TabsContent value="manual" className="space-y-4 mt-0">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Min. 8 chars, 1 upper, 1 lower, 1 number"
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {errors.password && (
                      <p className="text-xs text-red-500">{errors.password}</p>
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
              </div>
            </TabsContent>

            <TabsContent value="invite" className="space-y-4 mt-0">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Mail className="h-4 w-4" />
                    <h4 className="font-semibold">Google Account Invitation</h4>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    An invitation email will be sent to the user. They can then sign up using their Google account.
                  </p>
                </div>
                
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
              </div>
            </TabsContent>

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

            <div className={`grid ${creationMode === "manual" ? "grid-cols-3" : "grid-cols-2"} gap-4`}>
              {creationMode === "manual" && (
                <div className="space-y-2">
                  <Label htmlFor="user_name">Username</Label>
                  <Input
                    id="user_name"
                    name="user_name"
                    value={formData.user_name}
                    onChange={handleInputChange}
                    placeholder="johndoe"
                    className={errors.user_name ? "border-red-500" : ""}
                  />
                  {errors.user_name && (
                    <p className="text-xs text-red-500">{errors.user_name}</p>
                  )}
                </div>
              )}

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
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <SelectItem key={dept.department_id} value={dept.department_id}>
                          {dept.name} ({dept.code})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        Loading departments...
                      </SelectItem>
                    )}
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
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <SelectItem key={role.role_id} value={role.role_id}>
                          {role.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        Loading roles...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {errors.role_id && (
                  <p className="text-xs text-red-500">{errors.role_id}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {creationMode === "manual" ? "Creating..." : "Sending Invitation..."}
                </>
              ) : (
                <>
                  {creationMode === "manual" ? (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;

