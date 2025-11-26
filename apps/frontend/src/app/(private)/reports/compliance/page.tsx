import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, XCircle, AlertTriangle, Download, Calendar, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Compliance Reports | DMS",
  description: "Blockchain signing compliance and audit reports",
};

export default function ComplianceReportsPage() {
  const complianceMetrics = [
    { label: "Documents Signed", value: "1,247", total: "1,500", percentage: 83 },
    { label: "Blockchain Verified", value: "1,198", total: "1,247", percentage: 96 },
    { label: "Compliance Rate", value: "96.1%", status: "excellent" },
    { label: "Failed Verifications", value: "12", status: "warning" }
  ];

  const pendingSignatures = [
    { document: "Contract ABC-2024", department: "Legal", daysOverdue: 3, priority: "high" },
    { document: "Policy Update v2.1", department: "HR", daysOverdue: 1, priority: "medium" },
    { document: "Financial Report Q4", department: "Finance", daysOverdue: 0, priority: "normal" }
  ];

  const recentSignatures = [
    {
      document: "Annual Audit Report",
      signer: "John Smith",
      date: "2024-01-22",
      txHash: "0xabcd...1234",
      status: "verified"
    },
    {
      document: "Employee Contract",
      signer: "Sarah Johnson",
      date: "2024-01-21",
      txHash: "0xefgh...5678",
      status: "verified"
    },
    {
      document: "Vendor Agreement",
      signer: "Mike Davis",
      date: "2024-01-20",
      txHash: "0xijkl...9012",
      status: "pending"
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Reports</h1>
          <p className="text-muted-foreground">Blockchain signing compliance and audit metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Compliance Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {complianceMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
                {metric.percentage && (
                  <div className="space-y-1">
                    <Progress value={metric.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {metric.value} of {metric.total}
                    </p>
                  </div>
                )}
                {metric.status && (
                  <Badge 
                    variant={
                      metric.status === 'excellent' ? 'default' :
                      metric.status === 'warning' ? 'destructive' : 'secondary'
                    }
                    className={
                      metric.status === 'excellent' ? 'bg-green-100 text-green-800' :
                      metric.status === 'warning' ? 'bg-red-100 text-red-800' : ''
                    }
                  >
                    {metric.status === 'excellent' ? 'Excellent' : 'Needs Attention'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingSignatures.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{pendingSignatures.length} documents</strong> are pending blockchain signatures. 
            Review overdue items to maintain compliance.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Pending Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingSignatures.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.document}</p>
                    <p className="text-sm text-muted-foreground">{item.department}</p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        item.priority === 'high' ? 'destructive' :
                        item.priority === 'medium' ? 'secondary' : 'outline'
                      }
                    >
                      {item.daysOverdue > 0 ? `${item.daysOverdue}d overdue` : 'Due today'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Recent Blockchain Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSignatures.map((signature, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{signature.document}</p>
                    <p className="text-sm text-muted-foreground">
                      Signed by {signature.signer} • {signature.date}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {signature.txHash}
                    </p>
                  </div>
                  <div className="text-right">
                    {signature.status === 'verified' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <XCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 border-l-4 border-green-500 bg-green-50 rounded">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Q4 2024 Compliance Review Completed</p>
                <p className="text-sm text-muted-foreground">96.1% compliance rate achieved</p>
              </div>
              <span className="text-sm text-muted-foreground ml-auto">Jan 15, 2024</span>
            </div>
            
            <div className="flex items-center gap-4 p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Blockchain Integration Audit</p>
                <p className="text-sm text-muted-foreground">All signatures verified successfully</p>
              </div>
              <span className="text-sm text-muted-foreground ml-auto">Jan 10, 2024</span>
            </div>
            
            <div className="flex items-center gap-4 p-3 border-l-4 border-yellow-500 bg-yellow-50 rounded">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium">Policy Update Required</p>
                <p className="text-sm text-muted-foreground">3 documents require immediate attention</p>
              </div>
              <span className="text-sm text-muted-foreground ml-auto">Jan 5, 2024</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}