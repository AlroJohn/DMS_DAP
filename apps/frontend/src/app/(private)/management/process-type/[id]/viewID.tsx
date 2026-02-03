"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit, Clock, Calendar, CheckCircle2, XCircle } from "lucide-react";
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

export default function ViewProcessType() {
  const params = useParams();
  const router = useRouter();
  const [processType, setProcessType] = useState<ProcessType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProcessType();
  }, [params.id]);

  const fetchProcessType = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/process-type/${params.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setProcessType(data);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!processType) {
    return (
      <div className="p-6">
        <p>Process type not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
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
            <h1 className="text-3xl font-bold">{processType.name}</h1>
            <p className="text-gray-500">Process Type Details</p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/management/process-type/${params.id}/edit`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-lg font-semibold">{processType.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="text-base">
                {processType.description || "No description provided"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="flex items-center gap-2 mt-1">
                {processType.is_active ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <Badge variant="default">Active</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-gray-400" />
                    <Badge variant="secondary">Inactive</Badge>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duration & Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Duration</label>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-5 w-5 text-blue-600" />
                <p className="text-lg font-semibold">
                  {processType.duration_days ? `${processType.duration_days} days` : "Not specified"}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-5 w-5 text-gray-600" />
                <p className="text-base">
                  {new Date(processType.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-5 w-5 text-gray-600" />
                <p className="text-base">
                  {new Date(processType.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Process Type ID</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-sm bg-gray-100 px-3 py-1 rounded">
            {processType.process_type_id}
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
