"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Shield, 
  Users, 
  Building, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Workflow,
  Database,
  Globe,
  Lock,
  Zap
} from "lucide-react";
import Link from "next/link";

const Homepage = () => {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Document Management System</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Enterprise-grade document management with blockchain verification, 
          real-time collaboration, and advanced workflow automation.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            System Online
          </Badge>
          <Badge variant="outline">
            Version 1.0.0
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-4">
        <Link href="/documents/upload">
          <Button size="lg">
            <Upload className="mr-2 h-5 w-5" /> Upload Documents
          </Button>
        </Link>
        <Link href="/workflows/builder">
          <Button variant="outline" size="lg">
            <Workflow className="mr-2 h-5 w-5" /> Create Workflow
          </Button>
        </Link>
      </div>

      {/* System Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">89</p>
                <p className="text-sm text-muted-foreground">Blockchain Signed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Blockchain Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              DocOnChain integration for tamper-proof document signing and verification.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Verification Rate</span>
              <span className="text-sm font-medium">99.8%</span>
            </div>
            <Progress value={99.8} className="h-2" />
            <Link href="/(public)/verify/sample-hash">
              <Button variant="outline" size="sm" className="w-full">
                <Globe className="h-4 w-4 mr-2" />
                Public Verification Portal
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-secondary" />
              Workflow Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Visual workflow builder with approval chains and blockchain signature requirements.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Workflows</span>
              <span className="text-sm font-medium">23</span>
            </div>
            <Progress value={85} className="h-2" />
            <Link href="/workflows/builder">
              <Button variant="outline" size="sm" className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Build Workflow
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Analytics & Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Comprehensive reporting with compliance monitoring and audit trails.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Compliance Score</span>
              <span className="text-sm font-medium">94%</span>
            </div>
            <Progress value={94} className="h-2" />
            <Link href="/reports">
              <Button variant="outline" size="sm" className="w-full">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & System Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent System Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Document "Annual Report 2024" blockchain signed</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New workflow "Contract Approval" activated</p>
                  <p className="text-xs text-muted-foreground">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">System backup completed successfully</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">5 new users added to Legal Department</p>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Database</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">DocOnChain API</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">File Storage</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">85% Available</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Backup Status</span>
                </div>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Scheduled</Badge>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">System Uptime</span>
                <span className="font-medium">99.9% (30 days)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security & Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Blockchain Verified</h3>
              <p className="text-sm text-muted-foreground">
                All critical documents are cryptographically signed and verified on the blockchain
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Enterprise Security</h3>
              <p className="text-sm text-muted-foreground">
                Role-based access control, JWT authentication, and encrypted data transmission
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Audit Compliance</h3>
              <p className="text-sm text-muted-foreground">
                Complete audit trails, compliance reporting, and regulatory adherence
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Homepage;
