"use client"

import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { BadgeCheck, Camera, Mail, Shield, User as UserIcon, ArrowLeft, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { SignaturePad } from "@/components/signature-pad"
import { PenTool } from "lucide-react"
import { ChangePasswordModal } from "@/components/modals/change-password-modal"

export default function AccountPage() {
  const { user, isLoading, login } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSavingSignature, setIsSavingSignature] = React.useState(false)
  const [signature, setSignature] = React.useState<string | null>(user?.signature || null)
  const [formData, setFormData] = React.useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  })
  const [showChangePassword, setShowChangePassword] = React.useState(false)
  const [passwordData, setPasswordData] = React.useState({
    new_password: "",
    confirm_new_password: "",
  })
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = React.useState(false)
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)

  React.useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user?.phone || "",
      })
      setSignature(user?.signature || null)
    }
  }, [user])

  const handleSave = async () => {
    if (!user) {
      toast.error("User data not available")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          // Note: email and phone updates may require separate endpoints
        }),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      let result;

      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json()
        } catch (e) {
          console.error('JSON parsing error:', e)
          console.error('Response status:', response.status)
          console.error('Response headers:', [...response.headers.entries()])

          // If JSON parsing fails, create a default result object
          result = {
            success: response.ok,
            error: { message: 'Invalid JSON response from server' }
          }
        }
      } else {
        // If not JSON, create a default result object
        try {
          const text = await response.text()
          console.error('Non-JSON response received:', text)
          console.error('Response status:', response.status)
          console.error('Response headers:', [...response.headers.entries()])

          result = {
            success: response.ok,
            error: { message: text || 'Response not in JSON format' }
          }
        } catch (e) {
          console.error('Text parsing error:', e)
          console.error('Response status:', response.status)

          // If text parsing also fails, create a basic result
          result = {
            success: response.ok,
            error: { message: 'Unable to read response from server' }
          }
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update profile')
      }

      toast.success('Profile updated successfully')
      setIsEditing(false)

      // Refetch user data to get the latest information
      if (login) {
        login()
      }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    })
    setIsEditing(false)
  }

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.first_name) {
      return user.first_name[0].toUpperCase()
    }
    return user?.email?.[0]?.toUpperCase() || "U"
  }

  const getUserDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user?.first_name) {
      return user.first_name
    }
    return user?.email?.split("@")[0] || "User"
  }

  const getPrimaryRole = () => {
    if (user?.roles && user.roles.length > 0) {
      return user.roles[0].name || user.roles[0].code || user.roles[0]
    }
    return null
  }


  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading account information...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if user is not available
  if (!user) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-2">Failed to load account information</p>
            <p className="text-muted-foreground text-sm mb-4">Please try refreshing the page</p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleSaveSignature() {
    if (!user || !signature) {
      toast.error("Please create a signature first")
      return
    }

    setIsSavingSignature(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signature,
        }),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      let result;

      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json()
        } catch (e) {
          console.error('JSON parsing error:', e)
          console.error('Response status:', response.status)
          console.error('Response headers:', [...response.headers.entries()])

          // If JSON parsing fails, create a default result object
          result = {
            success: response.ok,
            error: { message: 'Invalid JSON response from server' }
          }
        }
      } else {
        // If not JSON, create a default result object
        try {
          const text = await response.text()
          console.error('Non-JSON response received:', text)
          console.error('Response status:', response.status)
          console.error('Response headers:', [...response.headers.entries()])

          result = {
            success: response.ok,
            error: { message: text || 'Response not in JSON format' }
          }
        } catch (e) {
          console.error('Text parsing error:', e)
          console.error('Response status:', response.status)

          // If text parsing also fails, create a basic result
          result = {
            success: response.ok,
            error: { message: 'Unable to read response from server' }
          }
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to save signature')
      }

      toast.success('Signature saved successfully')

      // Refetch user data to get the latest information
      if (login) {
        login()
      }
    } catch (error: any) {
      console.error('Error saving signature:', error)
      toast.error(error.message || 'Failed to save signature')
    } finally {
      setIsSavingSignature(false)
    }
  }

  async function handleClearSignature() {
    if (!user) {
      return
    }

    setIsSavingSignature(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: null,
        }),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      let result;

      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json()
        } catch (e) {
          console.error('JSON parsing error:', e)
          console.error('Response status:', response.status)
          console.error('Response headers:', [...response.headers.entries()])

          // If JSON parsing fails, create a default result object
          result = {
            success: response.ok,
            error: { message: 'Invalid JSON response from server' }
          }
        }
      } else {
        // If not JSON, create a default result object
        try {
          const text = await response.text()
          console.error('Non-JSON response received:', text)
          console.error('Response status:', response.status)
          console.error('Response headers:', [...response.headers.entries()])

          result = {
            success: response.ok,
            error: { message: text || 'Response not in JSON format' }
          }
        } catch (e) {
          console.error('Text parsing error:', e)
          console.error('Response status:', response.status)

          // If text parsing also fails, create a basic result
          result = {
            success: response.ok,
            error: { message: 'Unable to read response from server' }
          }
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to clear signature')
      }

      setSignature(null)
      toast.success('Signature cleared successfully')

      // Refetch user data to get the latest information
      if (login) {
        login()
      }
    } catch (error: any) {
      console.error('Error clearing signature:', error)
      toast.error(error.message || 'Failed to clear signature')
    } finally {
      setIsSavingSignature(false)
    }
  }


  return (
    <>
      <div className="w-full max-w-8xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Profile Card - spans full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your public profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatar || undefined} alt={getUserDisplayName()} />
                  <AvatarFallback className="text-2xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0"
                  onClick={() => {/* TODO: Implement image upload */}}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium">
                  {getUserDisplayName()}
                </p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {getPrimaryRole() && (
                  <Badge variant="secondary" className="gap-1 mt-2">
                    <Shield className="h-3 w-3" />
                    {getPrimaryRole()}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled={true}
                  className="flex-1"
                  title="Email cannot be changed"
                />
                <Badge variant="secondary" className="shrink-0 gap-1 h-10 px-3">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                disabled={!isEditing}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Account Details
            </CardTitle>
            <CardDescription>Information about your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="mt-1 font-mono text-xs">{user?.id || user?.user_id || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                <p className="mt-1">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                <p className="mt-1">
                  <Badge variant={user?.active ? "default" : "secondary"}>
                    {user?.active ? "Active" : "Inactive"}
                  </Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Digital Signature
            </CardTitle>
            <CardDescription>Create or update your digital signature for document signing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignaturePad
              value={signature || undefined}
              onChange={setSignature}
              width={600}
              height={200}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSaveSignature}
                disabled={isSavingSignature || !signature}
              >
                {isSavingSignature ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Signature"
                )}
              </Button>
              {signature && (
                <Button
                  variant="outline"
                  onClick={handleClearSignature}
                  disabled={isSavingSignature}
                >
                  Clear Signature
                </Button>
              )}
            </div>
            {signature && (
              <p className="text-xs text-muted-foreground">
                Your signature will be used when signing documents. You can update it at any time.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowChangePassword(true)}
            >
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Two-Factor Authentication
            </Button>
            <Separator />
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div> {/* Close the grid container */}
    </div> {/* Close the main container */}

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => {
          setShowChangePassword(false);
          // Reset password data in the modal will be handled internally
          // Reset visibility states
          setShowCurrentPassword(false);
          setShowNewPassword(false);
          setShowConfirmNewPassword(false);
        }}
      />
    </>
  );
}