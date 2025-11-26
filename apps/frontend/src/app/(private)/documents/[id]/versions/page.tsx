"use client";

import { useState } from "react";
import { History, Download, Eye, RotateCcw, GitBranch, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export default function DocumentVersionsPage() {
  const params = useParams();
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  const mockVersions = [
    {
      version: "1.3",
      date: "2024-01-22 14:30",
      author: "John Smith",
      size: "2.4 MB",
      changes: "Updated financial projections and added Q4 analysis",
      status: "current",
      signed: false
    },
    {
      version: "1.2",
      date: "2024-01-20 10:15",
      author: "Sarah Johnson",
      size: "2.3 MB",
      changes: "Revised executive summary and corrected data tables",
      status: "previous",
      signed: true
    },
    {
      version: "1.1",
      date: "2024-01-18 16:45",
      author: "Mike Davis",
      size: "2.2 MB",
      changes: "Added compliance section and updated formatting",
      status: "previous",
      signed: false
    },
    {
      version: "1.0",
      date: "2024-01-15 09:00",
      author: "John Smith",
      size: "2.1 MB",
      changes: "Initial document creation",
      status: "original",
      signed: false
    }
  ];

  const toggleVersionSelection = (version: string) => {
    setSelectedVersions(prev => 
      prev.includes(version) 
        ? prev.filter(v => v !== version)
        : prev.length < 2 ? [...prev, version] : [prev[1], version]
    );
  };

  const handleRestoreVersion = () => {
    if (selectedVersions.length !== 1) {
      toast.error("Select a single version to restore.");
      return;
    }
    toast.success(`Version ${selectedVersions[0]} queued for restoration.`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Version History</h1>
          <p className="text-muted-foreground">Track changes and manage document versions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default"
            disabled={selectedVersions.length !== 1}
            onClick={handleRestoreVersion}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restore Version
          </Button>
          <Button 
            variant="outline" 
            disabled={selectedVersions.length !== 2}
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Compare Versions
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export History
          </Button>
        </div>
      </div>

      {selectedVersions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {selectedVersions.length} Selected
                </Badge>
                <span className="text-sm">
                  {selectedVersions.length === 1 
                    ? `Version ${selectedVersions[0]} selected`
                    : `Comparing versions ${selectedVersions.join(' and ')}`
                  }
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedVersions([])}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {mockVersions.map((version, index) => (
          <Card 
            key={version.version}
            className={`cursor-pointer transition-colors ${
              selectedVersions.includes(version.version) 
                ? 'border-blue-500 bg-blue-50' 
                : 'hover:bg-accent/50'
            }`}
            onClick={() => toggleVersionSelection(version.version)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full ${
                      version.status === 'current' ? 'bg-green-500' :
                      version.status === 'original' ? 'bg-gray-400' : 'bg-blue-500'
                    }`} />
                    {index < mockVersions.length - 1 && (
                      <div className="w-0.5 h-16 bg-gray-200 mt-2" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">Version {version.version}</h3>
                      {version.status === 'current' && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Current
                        </Badge>
                      )}
                      {version.signed && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          Signed
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{version.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{version.date}</span>
                      </div>
                      <span>{version.size}</span>
                    </div>
                    
                    <p className="text-sm">{version.changes}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {version.status !== 'current' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedVersions([version.version]);
                        toast.success(`Version ${version.version} queued for restoration.`);
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{mockVersions.length}</p>
              <p className="text-sm text-muted-foreground">Total Versions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {mockVersions.filter(v => v.signed).length}
              </p>
              <p className="text-sm text-muted-foreground">Signed Versions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">3</p>
              <p className="text-sm text-muted-foreground">Contributors</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">7</p>
              <p className="text-sm text-muted-foreground">Days Active</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}