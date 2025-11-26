"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User as UserIcon,
  Mail,
  Building2,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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

interface ViewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const ViewUserModal: React.FC<ViewUserModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Viewing information for {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Account Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                user.active && user.account.is_active ? "bg-green-100" : "bg-red-100"
              }`}>
                {user.active && user.account.is_active ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">Account Status</h3>
                <p className="text-sm text-gray-500">
                  {user.active && user.account.is_active ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
            <Badge
              variant={user.active && user.account.is_active ? "default" : "destructive"}
            >
              {user.active && user.account.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <UserIcon className="h-4 w-4 mr-2" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">First Name</p>
                <p className="font-medium">{user.first_name}</p>
              </div>
              {user.middle_name && (
                <div>
                  <p className="text-xs text-gray-500">Middle Name</p>
                  <p className="font-medium">{user.middle_name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Last Name</p>
                <p className="font-medium">{user.last_name}</p>
              </div>
              {user.user_name && (
                <div>
                  <p className="text-xs text-gray-500">Username</p>
                  <p className="font-medium">@{user.user_name}</p>
                </div>
              )}
              {user.title && (
                <div>
                  <p className="text-xs text-gray-500">Title</p>
                  <p className="font-medium">{user.title}</p>
                </div>
              )}
              {user.type && (
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium capitalize">{user.type}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Account Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Account Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Email Address</p>
                <p className="font-medium">{user.account.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email Verified</p>
                <div className="flex items-center space-x-2">
                  <Badge variant={user.account.email_verified ? "default" : "destructive"}>
                    {user.account.email_verified ? "Verified" : "Not Verified"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Account ID</p>
                <p className="font-medium text-xs font-mono">{user.account_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">User ID</p>
                <p className="font-medium text-xs font-mono">{user.user_id}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Organization Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Organization Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium">{user.department.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department Code</p>
                <p className="font-medium">{user.department.code}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Roles & Permissions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Roles & Permissions
            </h3>
            <div>
              <p className="text-xs text-gray-500 mb-2">Assigned Roles</p>
              <div className="flex flex-wrap gap-2">
                {user.user_roles && user.user_roles.length > 0 ? (
                  user.user_roles.map((ur) => (
                    <Badge key={ur.role.role_id} variant="secondary">
                      {ur.role.name} ({ur.role.code})
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No roles assigned</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Activity Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Last Login</p>
                <p className="font-medium">
                  {user.account.last_login
                    ? new Date(user.account.last_login).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Account Created</p>
                <p className="font-medium">
                  {new Date(user.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Updated</p>
                <p className="font-medium">
                  {new Date(user.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewUserModal;

