"use client";

import { useState } from "react";
import { GitBranch, ArrowLeft, ArrowRight, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParams } from "next/navigation";

export default function DocumentComparePage() {
  const params = useParams();
  const [leftVersion, setLeftVersion] = useState("1.2");
  const [rightVersion, setRightVersion] = useState("1.3");
  const [viewMode, setViewMode] = useState("side-by-side");

  const versions = [
    { value: "1.3", label: "Version 1.3 (Current)", date: "2024-01-22" },
    { value: "1.2", label: "Version 1.2", date: "2024-01-20" },
    { value: "1.1", label: "Version 1.1", date: "2024-01-18" },
    { value: "1.0", label: "Version 1.0", date: "2024-01-15" }
  ];

  const mockChanges = [
    {
      type: "added",
      line: 15,
      content: "The year 2024 marked unprecedented growth with revenue increasing by 15% year-over-year."
    },
    {
      type: "removed",
      line: 18,
      content: "Preliminary financial results show modest growth."
    },
    {
      type: "modified",
      line: 25,
      oldContent: "Our market share increased slightly in Q4.",
      newContent: "Our market share expanded significantly in Q4, reaching 23% in key segments."
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare Versions</h1>
          <p className="text-muted-foreground">View differences between document versions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Diff
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Full Screen
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version Comparison Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Left Version</label>
              <Select value={leftVersion} onValueChange={setLeftVersion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(version => (
                    <SelectItem key={version.value} value={version.value}>
                      {version.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Right Version</label>
              <Select value={rightVersion} onValueChange={setRightVersion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(version => (
                    <SelectItem key={version.value} value={version.value}>
                      {version.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">View Mode</label>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="side-by-side">Side by Side</SelectItem>
                  <SelectItem value="unified">Unified View</SelectItem>
                  <SelectItem value="changes-only">Changes Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">5</p>
              <p className="text-sm text-green-700">Additions</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">2</p>
              <p className="text-sm text-red-700">Deletions</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">3</p>
              <p className="text-sm text-blue-700">Modifications</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {mockChanges.map((change, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant={
                      change.type === 'added' ? 'default' :
                      change.type === 'removed' ? 'destructive' : 'secondary'
                    }
                    className={
                      change.type === 'added' ? 'bg-green-100 text-green-800' :
                      change.type === 'removed' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }
                  >
                    {change.type === 'added' ? 'Added' :
                     change.type === 'removed' ? 'Removed' : 'Modified'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Line {change.line}</span>
                </div>
                
                {change.type === 'modified' ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-sm text-red-800">- {change.oldContent}</p>
                    </div>
                    <div className="p-2 bg-green-50 border-l-4 border-green-500 rounded">
                      <p className="text-sm text-green-800">+ {change.newContent}</p>
                    </div>
                  </div>
                ) : (
                  <div className={`p-2 border-l-4 rounded ${
                    change.type === 'added' 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}>
                    <p className={`text-sm ${
                      change.type === 'added' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {change.type === 'added' ? '+ ' : '- '}{change.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Version {leftVersion}</span>
              <Badge variant="outline">
                {versions.find(v => v.value === leftVersion)?.date}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-gray-50 rounded-lg p-4 overflow-auto">
              <div className="prose prose-sm max-w-none">
                <h1>Annual Financial Report 2024</h1>
                <p>This comprehensive financial analysis provides detailed insights into our organization's performance during the fiscal year 2024.</p>
                
                <h2>Executive Summary</h2>
                <p className="bg-red-100 line-through">Preliminary financial results show modest growth.</p>
                <p>The year 2024 marked a period of strategic development for our organization.</p>
                
                <h2>Financial Performance</h2>
                <p className="bg-red-100 line-through">Our market share increased slightly in Q4.</p>
                <p>Our financial performance met expectations across multiple metrics...</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Version {rightVersion}</span>
              <Badge variant="default">
                {versions.find(v => v.value === rightVersion)?.date}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-gray-50 rounded-lg p-4 overflow-auto">
              <div className="prose prose-sm max-w-none">
                <h1>Annual Financial Report 2024</h1>
                <p>This comprehensive financial analysis provides detailed insights into our organization's performance during the fiscal year 2024.</p>
                
                <h2>Executive Summary</h2>
                <p className="bg-green-100">The year 2024 marked unprecedented growth with revenue increasing by 15% year-over-year.</p>
                <p>The year 2024 marked a period of strategic development for our organization.</p>
                
                <h2>Financial Performance</h2>
                <p className="bg-green-100">Our market share expanded significantly in Q4, reaching 23% in key segments.</p>
                <p>Our financial performance met expectations across multiple metrics...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}