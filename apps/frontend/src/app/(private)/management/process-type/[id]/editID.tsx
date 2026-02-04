"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

interface ProcessType {
  process_type_id: string;
  name: string;
  description?: string;
  duration_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EditProcessType() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_days: "",
    is_active: true,
  });

  useEffect(() => {
    fetchProcessType();
  }, [params.id]);

  const fetchProcessType = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/process-type/${params.id}`);
      
      if (response.ok) {
        const data: ProcessType = await response.json();
        setFormData({
          name: data.name,
          description: data.description || "",
          duration_days: data.duration_days?.toString() || "",
          is_active: data.is_active,
        });
      } else {
        toast.error("Failed to fetch process type");
        router.push("/management/process-type");
      }
    } catch (error) {
      console.error("Error fetching process type:", error);
      toast.error("Error fetching process type");
      router.push("/management/process-type");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const response = await fetch(`/api/process-type/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
        }),
      });

      if (response.ok) {
        toast.success("Process type updated successfully");
        router.push("/management/process-type");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update process type");
      }
    } catch (error) {
      console.error("Error updating process type:", error);
      toast.error("Error updating process type");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/management/process-type")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Process Type</h1>
          <p className="text-gray-500">Update process type information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Process Type Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter process type name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter process type description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_days">Duration (Days)</Label>
              <Input
                id="duration_days"
                name="duration_days"
                type="number"
                min="0"
                value={formData.duration_days}
                onChange={handleInputChange}
                placeholder="e.g., 7, 14, 30"
              />
              <p className="text-sm text-gray-500">
                Specify the expected duration for this process in days
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked as boolean }))
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/management/process-type")}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
