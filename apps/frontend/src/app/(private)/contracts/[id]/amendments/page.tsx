"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileEdit, Calendar, User, Plus, Eye } from "lucide-react";

export default function ContractAmendmentsPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();

  const contractInfo = {
    title: "Vendor Agreement - ABC Corp",
    originalDate: "2024-01-15",
    currentVersion: "1.3",
    status: "Active",
  };

  const amendments = [
    {
      id: "1",
      amendmentNumber: "Amendment #3",
      version: "1.3",
      title: "Pricing Update - Q4 2024",
      description: "Updated pricing structure and service level agreements for Q4 2024",
      effectiveDate: "2024-10-01",
      createdDate: "2024-09-15",
      createdBy: "John Doe",
      status: "Active",
      changes: [
        "Updated hourly rate from $150 to $165",
        "Added new service tier: Premium Support",
        "Modified response time SLA from 4h to 2h for critical issues",
      ],
      attachments: 2,
    },
    {
      id: "2",
      amendmentNumber: "Amendment #2",
      version: "1.2",
      title: "Scope Extension - Additional Services",
      description: "Extended scope to include cloud infrastructure management services",
      effectiveDate: "2024-06-01",
      createdDate: "2024-05-10",
      createdBy: "Jane Smith",
      status: "Active",
      changes: [
        "Added cloud infrastructure management to scope",
        "Included AWS and Azure platform support",
        "Extended contract term by 12 months",
      ],
      attachments: 3,
    },
    {
      id: "3",
      amendmentNumber: "Amendment #1",
      version: "1.1",
      title: "Payment Terms Adjustment",
      description: "Modified payment terms from net-30 to net-45 days",
      effectiveDate: "2024-03-01",
      createdDate: "2024-02-20",
      createdBy: "Bob Johnson",
      status: "Active",
      changes: [
        "Payment terms changed from net-30 to net-45",
        "Added early payment discount of 2%",
        "Updated invoice submission process",
      ],
      attachments: 1,
    },
    {
      id: "4",
      amendmentNumber: "Amendment #0 (Draft)",
      version: "1.0",
      title: "Service Level Agreement Update",
      description: "Proposed changes to service level guarantees and penalties",
      effectiveDate: "2025-01-01",
      createdDate: "2024-11-01",
      createdBy: "Sarah Wilson",
      status: "Draft",
      changes: [
        "Increase uptime guarantee from 99.5% to 99.9%",
        "Add performance penalties for SLA breaches",
        "Include quarterly business reviews",
      ],
      attachments: 1,
    },
  ];

  const stats = {
    totalAmendments: amendments.filter(a => a.status === "Active").length,
    draftAmendments: amendments.filter(a => a.status === "Draft").length,
    lastAmendment: "2024-10-01",
    currentVersion: "1.3",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/contracts/${params.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Contract Amendments</h1>
          <p className="text-muted-foreground">{contractInfo.title}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Amendment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Amendments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAmendments}</div>
            <p className="text-xs text-muted-foreground">Active amendments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Amendments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftAmendments}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Version</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentVersion}</div>
            <p className="text-xs text-muted-foreground">Latest version</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Amendment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lastAmendment}</div>
            <p className="text-xs text-muted-foreground">Effective date</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Amendment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {amendments.map((amendment) => (
              <div
                key={amendment.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{amendment.amendmentNumber}</h3>
                      <Badge variant={amendment.status === "Active" ? "default" : "secondary"}>
                        {amendment.status}
                      </Badge>
                      <Badge variant="outline">v{amendment.version}</Badge>
                    </div>
                    <p className="font-medium text-muted-foreground">{amendment.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{amendment.description}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </div>

                <div className="border-t pt-3 mt-3">
                  <h4 className="text-sm font-semibold mb-2">Key Changes:</h4>
                  <ul className="space-y-1">
                    {amendment.changes.map((change, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-6 mt-4 pt-3 border-t text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Effective: {amendment.effectiveDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Created by: {amendment.createdBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileEdit className="h-4 w-4" />
                    <span>{amendment.attachments} attachment{amendment.attachments !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amendment Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <div className="font-medium">Draft Amendment</div>
                <div className="text-sm text-muted-foreground">Create and document proposed changes</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <div className="font-medium">Legal Review</div>
                <div className="text-sm text-muted-foreground">Legal team reviews and approves changes</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <div className="font-medium">Stakeholder Approval</div>
                <div className="text-sm text-muted-foreground">Both parties approve amendment terms</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <div className="font-medium">Execute & Activate</div>
                <div className="text-sm text-muted-foreground">Sign and make amendment effective</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
