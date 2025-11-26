"use client";

import { useSearch } from "@/hooks/use-search";
import { Search, Filter, Save, Calendar, FileText, Building, CheckCircle, MoreHorizontal, Clock, Loader2, Share, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ShareDocumentModal } from "@/components/modals/share-document-modal";
import { ViewDocumentsModal } from "@/components/reuseable/view-details-documents/view-documents";

interface Department {
  department_id: string;
  name: string;
  code: string;
  active: boolean;
}

interface DocumentType {
  type_id: string;
  name: string;
  description: string;
  active: boolean;
}

export default function SearchPageClient() {
  const {
    searchQuery,
    setSearchQuery,
    documentType,
    setDocumentType,
    department,
    setDepartment,
    status,
    setStatus,
    signatureStatus,
    setSignatureStatus,
    classification,
    setClassification,
    origin,
    setOrigin,
    sortBy,
    setSortBy,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    performSearch,
    saveSearch,
    searchResults,
    isLoading,
    error,
    hasExecutedSavedSearch,
    resetSavedSearchExecutionFlag
  } = useSearch();
  
  const searchParams = useSearchParams();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  
  // Fetch departments and document types on component mount
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const [departmentsRes, documentTypesRes] = await Promise.all([
          fetch('/api/admin/departments'),
          fetch('/api/admin/document-types')
        ]);
        
        if (!departmentsRes.ok) {
          throw new Error('Failed to fetch departments');
        }
        
        if (!documentTypesRes.ok) {
          throw new Error('Failed to fetch document types');
        }
        
        const departmentsData = await departmentsRes.json();
        const documentTypesData = await documentTypesRes.json();
        
        setDepartments(departmentsData.data || []);
        setDocumentTypes(documentTypesData.data || []);
      } catch (err) {
        console.error('Error fetching options:', err);
        // In case of error, we could set default values or show an error message
        // For now, we'll just log the error and continue with empty arrays
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, []);

  // Helper function to map department code to department name for the search API
  const getDepartmentNameForSearch = (code: string) => {
    if (code === 'all') return '';
    const department = departments.find(dept => dept.code.toLowerCase() === code);
    return department ? department.name : code;
  };

  // Helper function to map document type value to document type name for the search API
  const getDocumentTypeNameForSearch = (typeValue: string) => {
    if (typeValue === 'all') return '';
    // The typeValue might be the transformed version (lowercase with underscores)
    // We need to find the original name based on the transformation logic
    const originalType = documentTypes.find(
      dt => dt.name.toLowerCase().replace(/\s+/g, '_') === typeValue
    );
    return originalType ? originalType.name : typeValue;
  };

  // Handle search with proper mapping for dynamic values
  const handleSearchWithMappedValues = async () => {
    // Map the UI values back to database values
    const mappedParams = {
      query: searchQuery,
      documentType: getDocumentTypeNameForSearch(documentType),
      department: getDepartmentNameForSearch(department),
      status,
      signatureStatus,
      classification,
      origin,
      dateFrom,
      dateTo,
      sortBy
    };
    
    await performSearch(mappedParams);
  };
  
  // Effect to update search parameters from URL and perform search on initial load
  useEffect(() => {
    if (loadingOptions) return; // Wait until options are loaded

    // Extract search parameters from URL
    const query = searchParams.get('query') || '';
    const documentTypeParam = searchParams.get('documentType') || '';
    const departmentParam = searchParams.get('department') || '';
    const statusParam = searchParams.get('status') || '';
    const signatureStatusParam = searchParams.get('signatureStatus') || '';
    const classificationParam = searchParams.get('classification') || '';
    const originParam = searchParams.get('origin') || '';
    const dateFromParam = searchParams.get('dateFrom') || '';
    const dateToParam = searchParams.get('dateTo') || '';
    const sortByParam = searchParams.get('sortBy') || 'relevance';
    
    // Update the search state based on URL parameters
    setSearchQuery(query);
    setDocumentType(documentTypeParam);
    setDepartment(departmentParam);
    setStatus(statusParam);
    setSignatureStatus(signatureStatusParam);
    setClassification(classificationParam);
    setOrigin(originParam);
    setDateFrom(dateFromParam);
    setDateTo(dateToParam);
    setSortBy(sortByParam);
    
    // Only perform a new search if we don't already have results AND we haven't just executed a saved search
    // This prevents re-searching when navigating from a saved search execution
    if ((!searchResults || searchResults.documents.length === 0) && !hasExecutedSavedSearch) {
      // Perform search if there's a query or other filter parameters, or if no parameters exist (perform default search)
      if (query || documentTypeParam || departmentParam || statusParam || signatureStatusParam || classificationParam || originParam || dateFromParam || dateToParam) {
        // Map the URL parameters to actual values for the search
        const mappedParams = {
          query,
          documentType: getDocumentTypeNameForSearch(documentTypeParam),
          department: getDepartmentNameForSearch(departmentParam),
          status: statusParam,
          signatureStatus: signatureStatusParam,
          classification: classificationParam,
          origin: originParam,
          dateFrom: dateFromParam,
          dateTo: dateToParam,
          sortBy: sortByParam
        };
        
        performSearch(mappedParams);
      } else {
        // If no parameters are provided, perform a default search (show all documents)
        const mappedParams = {
          query: '', // Empty query to get all documents
          documentType: getDocumentTypeNameForSearch(documentTypeParam),
          department: getDepartmentNameForSearch(departmentParam),
          status: statusParam,
          signatureStatus: signatureStatusParam,
          classification: classificationParam,
          origin: originParam,
          dateFrom: dateFromParam,
          dateTo: dateToParam,
          sortBy: sortByParam
        };
        
        performSearch(mappedParams);
      }
    }
  }, [searchParams, loadingOptions, departments, documentTypes, hasExecutedSavedSearch]); // Removed searchResults from dependencies to prevent re-running when results change

  // Effect to trigger search when sortBy changes
  useEffect(() => {
    // Only perform search if we have departments and documentTypes loaded
    // and we don't already have search results and haven't executed a saved search
    // (to avoid re-searching already executed saved search)
    if (!loadingOptions && (!searchResults || searchResults.documents.length === 0) && !hasExecutedSavedSearch) {
      handleSearchWithMappedValues();
    }
  }, [sortBy, loadingOptions]); // Removed searchResults to avoid unnecessary re-runs

  // Effect to reset the saved search execution flag when appropriate
  useEffect(() => {
    // If we have executed a saved search and now have results, reset the flag
    if (hasExecutedSavedSearch && searchResults && searchResults.documents.length > 0) {
      // Wait for the UI to update before resetting the flag to ensure results are displayed
      const timer = setTimeout(() => {
        resetSavedSearchExecutionFlag();
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [hasExecutedSavedSearch, searchResults, resetSavedSearchExecutionFlag]);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [documentToShare, setDocumentToShare] = useState<{ id: string; title: string } | null>(null);
  const [viewDetailsModalOpen, setViewDetailsModalOpen] = useState(false);
  const [documentToView, setDocumentToView] = useState<string | null>(null);

  const handleSearch = async () => {
    await handleSearchWithMappedValues();
  };

  const handleDownload = async (documentId: string) => {
    try {
      // First, get the document files to identify the primary file
      const filesResponse = await fetch(`/api/documents/${documentId}/files`);
      const filesResult = await filesResponse.json();
      
      if (!filesResponse.ok) {
        throw new Error(filesResult.error?.message || 'Failed to get document files');
      }

      // Find the primary file (is_primary = true) or take the first one if none is marked as primary
      const primaryFile = filesResult.data?.find((file: any) => file.is_primary) || filesResult.data?.[0];
      
      if (!primaryFile) {
        throw new Error('No files available for download');
      }

      // Construct the download URL and trigger the download
      const downloadUrl = `/api/documents/${documentId}/files/${primaryFile.file_id}/download`;
      window.location.href = downloadUrl; // Use window.location.href to trigger download instead of opening in new tab
    } catch (error) {
      console.error('Error downloading document:', error);
      // Optionally show an error message to the user
    }
  };

  const handleShareDocument = async (userIds: string[]) => {
    if (!documentToShare) return;
    
    try {
      const response = await fetch(`/api/documents/${documentToShare.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: documentToShare.id,
          userIds
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to share document');
      }

      // Optionally show success message
      console.log('Document shared successfully:', result);
    } catch (error) {
      console.error('Error sharing document:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  const handleApplyFilters = async () => {
    await handleSearchWithMappedValues();
  };

  const handleSaveSearch = async () => {
    if (!saveName.trim()) return;
    try {
      await saveSearch(saveName, saveDescription);
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveDescription("");
      // Optionally show a success message
    } catch (err) {
      console.error("Failed to save search:", err);
      // Optionally show an error message
    }
  };

  const router = useRouter();

  const clearFilters = () => {
    setDocumentType('all');
    setDepartment('all');
    setStatus('all');
    setClassification('all');
    setOrigin('all');
    setSignatureStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleDocumentCardClick = (documentId: string) => {
    router.push(`/documents/${documentId}`);
  };

  const documents = searchResults?.documents || [];
  const totalResults = searchResults?.total || 0;

  return (
    <div className="flex h-full flex-col gap-6 px-4 pb-4 bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-type">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.type_id} value={type.name.toLowerCase().replace(/\s+/g, '_')}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.department_id} value={dept.code.toLowerCase()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="dispatch">Dispatch</SelectItem>
                    <SelectItem value="intransit">In Transit</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="classification">Classification</Label>
                <Select value={classification} onValueChange={setClassification}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classifications" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classifications</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                    <SelectItem value="highly_technical">Highly Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="origin">Origin</Label>
                <Select value={origin} onValueChange={setOrigin}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Origins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Origins</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature-status">Signature Status</Label>
                <Select value={signatureStatus} onValueChange={setSignatureStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="unsigned">Unsigned</SelectItem>
                    <SelectItem value="blockchain-verified">Blockchain Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="space-y-2">
                  <Input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <Input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <Separator />
              
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button className="flex-1" onClick={handleApplyFilters} disabled={isLoading}>
                  <Filter className="h-4 w-4 mr-2" />
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Filters"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Results */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search documents by keyword, content, or metadata..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Search
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  Found <span className="font-medium">{totalResults}</span> documents
                </p>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Sort by Relevance</SelectItem>
                      <SelectItem value="date">Sort by Date</SelectItem>
                      <SelectItem value="name">Sort by Name</SelectItem>
                      <SelectItem value="type">Sort by Type</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(true)} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Search
                  </Button>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  <p>Error: {error}</p>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((result) => (
                    <Card 
                      key={result.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleDocumentCardClick(result.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <h4 className="font-semibold text-primary hover:underline">
                                {result.title}
                              </h4>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {result.description}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>Type: {result.type}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                <span>Dept: {result.department}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                <span>Status: {result.status}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>Class: {result.classification}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>Orig: {result.origin}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Modified: {result.modified}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div 
                            className="flex items-center gap-2 ml-4" 
                            onClick={(e) => e.stopPropagation()} // Prevent card click when interacting with dropdown
                          >
                            {result.verified && (
                              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                Verified
                              </Badge>
                            )}
                            {result.signed && (
                              <Badge variant="secondary">
                                Signed
                              </Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setDocumentToView(result.id);
                                    setViewDetailsModalOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDownload(result.id)}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setDocumentToShare({ id: result.id, title: result.title });
                                    setShareModalOpen(true);
                                  }}
                                >
                                  <Share className="h-4 w-4 mr-2" />
                                  Share
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {documents.length === 0 && !isLoading && !error && searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No documents found matching your search criteria.</p>
                </div>
              )}

              {documents.length === 0 && !isLoading && !error && !searchQuery && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Enter a search query to find documents.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Search Dialog */}
      {saveDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Save Current Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="save-name">Name</Label>
                  <Input
                    id="save-name"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Enter a name for this search"
                  />
                </div>
                <div>
                  <Label htmlFor="save-description">Description</Label>
                  <Input
                    id="save-description"
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Enter a description (optional)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSaveDialogOpen(false);
                      setSaveName("");
                      setSaveDescription("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSearch}>
                    Save Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Share Document Modal */}
      {documentToShare && (
        <ShareDocumentModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          documentId={documentToShare.id}
          documentTitle={documentToShare.title}
          onShare={handleShareDocument}
          onShared={() => {
            // Optional: Add any post-sharing logic here
            console.log('Document shared successfully');
          }}
        />
      )}
      {/* View Document Details Modal */}
      <ViewDocumentsModal
        open={viewDetailsModalOpen}
        onOpenChange={setViewDetailsModalOpen}
        documentId={documentToView}
      />
    </div>
  );
}