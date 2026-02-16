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
  process_code?: string;
  description?: string;
  duration_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  origin_department?: string;
}

export default function ViewProcessType({ id }: { id?: string }) {
  const params = useParams();
  const router = useRouter();
  const [processType, setProcessType] = useState<ProcessType | null>(null);
  const [loading, setLoading] = useState(true);

  const routeId = id ?? (params as any)?.id;

  useEffect(() => {
    if (routeId) fetchProcessType();
  }, [routeId]);

  const fetchProcessType = async () => {
    try {
      setLoading(true);
      if (!routeId) {
        toast.error("Invalid process type id");
        router.push("/management/process-type");
        return;
      }

      const response = await fetch(`/api/process-type/${routeId}`);
      
      if (response.ok) {
        const data = await response.json();
        // Handle response format { success: true, data: {...} }
        setProcessType(data.success ? data.data : data);
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

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return iso;
    }
  };

  const formatDuration = (days?: number) => {
    if (days == null) return "Not specified";
    const totalMinutes = Math.round(days * 24 * 60);
    const d = Math.floor(totalMinutes / (24 * 60));
    const h = Math.floor((totalMinutes % (24 * 60)) / 60);
    const m = totalMinutes % 60;
    const parts: string[] = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    return parts.length ? parts.join(' ') : '0m';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
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
    <div className="p-2 space-y-4 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Process Type Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {processType.process_code && (
              <div>
                <label className="text-sm font-medium text-gray-500">Process Code</label>
                <p className="mt-1 text-base font-semibold">{processType.process_code}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="mt-1 text-base font-semibold wrap-break-word">{processType.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="flex items-center gap-2 mt-1">
                {processType.is_active ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <Badge variant="default" className="text-green-600">Active</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-gray-400" />
                    <Badge variant="secondary">Inactive</Badge>
                  </>
                )}
              </div>
            </div>

            {processType.origin_department && (
              <div>
                <label className="text-sm font-medium text-gray-500">Origin Department</label>
                <div className="mt-1">
                  <Badge variant="secondary">{processType.origin_department}</Badge>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500">Duration</label>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-5 w-5 text-blue-600" />
                <p className="text-base font-semibold">{formatDuration(processType.duration_days)}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-5 w-5 text-gray-600" />
                <p className="text-base">{formatDate(processType.created_at)}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-5 w-5 text-gray-600" />
                <p className="text-base">{formatDate(processType.updated_at)}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <label className="text-sm font-medium text-gray-500">Description</label>
            <p className="mt-2 text-base leading-relaxed">
              {processType.description || "No description provided"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
