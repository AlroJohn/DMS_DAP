'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { showPermissionErrorToast, handleApiError } from "@/utils/permission-errors";

const PermissionErrorTest = () => {
  const [loading, setLoading] = useState(false);

  // Mock a 403 response for testing
  const mockForbiddenResponse = (): Response => {
    return {
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden" }),
      text: async () => JSON.stringify({ error: "Forbidden" }),
    } as Response;
  };

  const handleShowGenericPermissionError = () => {
    showPermissionErrorToast();
    toast.info("Generic permission error toast displayed");
  };

  const handleShowSpecificPermissionError = () => {
    showPermissionErrorToast('document_read', "Custom message for document read permission");
    toast.info("Specific permission error toast displayed");
  };

  const handleApiErrorTest = async () => {
    setLoading(true);
    try {
      const response = mockForbiddenResponse();
      await handleApiError(response, 'document_read');
      toast.info("API error handler executed");
    } catch (error) {
      console.error("Error in API error test:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Permission Error Toast Test</CardTitle>
        <CardDescription>
          Test component to verify permission error toasts are working properly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleShowGenericPermissionError}>
            Show Generic Permission Error
          </Button>
          
          <Button onClick={handleShowSpecificPermissionError}>
            Show Specific Permission Error
          </Button>
          
          <Button 
            onClick={handleApiErrorTest} 
            disabled={loading}
            variant="outline"
          >
            {loading ? "Testing..." : "Test API Error Handler"}
          </Button>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold mb-2">How to test:</h3>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            <li>Click "Show Generic Permission Error" to see a default permission error toast</li>
            <li>Click "Show Specific Permission Error" to see a specific permission error toast</li>
            <li>Click "Test API Error Handler" to simulate an API call with 403 status</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default PermissionErrorTest;