"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  Building,
  User,
  ArrowRight,
  Clock,
  Download,
  ChevronLeft,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface DocumentTrailDetail {
  id: string;
  documentId: string;
  actionDate: string;
  user: string;
  fromDepartment: string;
  toDepartment: string;
  status: string;
  remarks: string;
}

interface DocumentInfo {
  id: string;
  title: string;
  code: string;
  type: string;
  classification: string;
  status: string;
  createdAt: string;
}

export default function DocumentTrailsDetailPage() {
  const { documentId } = useParams();
  const router = useRouter();
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [trails, setTrails] = useState<DocumentTrailDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  useEffect(() => {
    const fetchDocumentTrails = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/documents/documents/${documentId}/trails`,
          {
            credentials: "include",
          }
        );
        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Failed to load document trail data");
        }

        setDocumentInfo(result?.data?.documentInfo ?? null);
        setTrails(Array.isArray(result?.data?.trails) ? result.data.trails : []);
      } catch (error) {
        console.error("Error fetching document trails:", error);
        toast.error("Failed to load document trail data");
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchDocumentTrails();
    }
  }, [documentId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "dispatch":
        return "bg-blue-100 text-blue-800";
      case "intransit":
        return "bg-yellow-100 text-yellow-800";
      case "received":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "deleted":
        return "bg-red-100 text-red-800";
      case "archive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "dispatch":
        return "Dispatched";
      case "intransit":
        return "In Transit";
      case "received":
        return "Received";
      case "completed":
        return "Completed";
      case "deleted":
        return "Deleted";
      case "archive":
        return "Archived";
      default:
        return status;
    }
  };

  const handleExport = () => {
    if (!documentInfo || trails.length === 0) {
      toast.error("No document data to export");
      return;
    }

    // Create a new PDF instance
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text("Document Trail History Report", 14, 20);

    // Add document info
    doc.setFontSize(12);
    doc.text(`Document Title: ${documentInfo.title}`, 14, 35);
    doc.text(`Document Code: ${documentInfo.code}`, 14, 42);
    doc.text(`Document Type: ${documentInfo.type}`, 14, 49);
    doc.text(`Classification: ${documentInfo.classification}`, 14, 56);
    doc.text(`Status: ${getStatusText(documentInfo.status)}`, 14, 63);
    doc.text(`Created: ${format(new Date(documentInfo.createdAt), "MMM d, yyyy h:mm a")}`, 14, 70);

    // Add subtitle with date
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 80);

    // Prepare table data for trails
    const tableColumn = [
      "Action Date",
      "User",
      "From Department",
      "To Department",
      "Status",
      "Remarks"
    ];

    const tableRows = trails.map((trail) => [
      format(new Date(trail.actionDate), "MMM d, yyyy h:mm a"),
      trail.user,
      trail.fromDepartment,
      trail.toDepartment,
      getStatusText(trail.status),
      trail.remarks
    ]);

    // Add table
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 90,
      styles: {
        fontSize: 9,
        cellPadding: 5
      },
      headStyles: {
        fillColor: [59, 130, 246], // blue-500
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // gray-50
      }
    });

    // Save the PDF
    doc.save(`document-trail-${documentInfo.code || documentId}.pdf`);

    toast.success("PDF exported successfully!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading document trails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.back()}
          className="w-fit"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Document Trail Details
          </h1>
          <p className="text-muted-foreground">
            Complete history for document {documentId}
          </p>
        </div>
      </div>

      {documentInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Title</p>
                <p className="text-base font-semibold">{documentInfo.title}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Code</p>
                <p className="text-base font-semibold">{documentInfo.code}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-base font-semibold">{documentInfo.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Classification</p>
                <p className="text-base font-semibold capitalize">{documentInfo.classification}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={getStatusColor(documentInfo.status)}>
                  {getStatusText(documentInfo.status)}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-base font-semibold">
                  {format(
                    new Date(documentInfo.createdAt),
                    "MMM d, yyyy h:mm a"
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Trail History</h2>
        <Button onClick={handleExport} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export Trail
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {trails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto text-muted" />
                <p className="mt-2">No trail history found</p>
                <p className="text-sm">
                  This document has no recorded trail history
                </p>
              </div>
            ) : (
              trails.map((trail, index) => (
                <div key={trail.id} className="flex gap-4">
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-primary p-2">
                      <FileText className="h-4 w-4 text-primary-foreground" />
                    </div>
                    {index < trails.length - 1 && (
                      <div className="h-full w-0.5 bg-muted-foreground/30 mt-2"></div>
                    )}
                  </div>

                  <div className="flex-1 pb-6">
                    <div className="bg-muted/50 rounded-lg p-4 border">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <Badge className={getStatusColor(trail.status)}>
                          {getStatusText(trail.status)}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(
                              new Date(trail.actionDate),
                              "MMM d, yyyy h:mm a"
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="font-medium">{trail.user}</span>{" "}
                            performed this action
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            From:{" "}
                            <span className="font-medium">
                              {trail.fromDepartment}
                            </span>
                            <ArrowRight className="h-3 w-3 mx-1 inline" />
                            To:{" "}
                            <span className="font-medium">
                              {trail.toDepartment}
                            </span>
                          </span>
                        </div>

                        {trail.remarks && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">
                              Remarks:
                            </p>
                            <p className="text-sm">{trail.remarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
