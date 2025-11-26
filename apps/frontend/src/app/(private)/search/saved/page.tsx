"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Search,
  Star,
  Play,
  Edit,
  Trash2,
  Clock,
  FileText,
  Filter,
  Plus,
  Loader2,
  X,
  MoreHorizontal,
  Share,
  Eye,
  Building,
  CheckCircle
} from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import { toast } from "sonner";

export default function SavedSearchesPage() {
  const router = useRouter();
  const { 
    getSavedSearches, 
    executeSavedSearch, 
    deleteSavedSearch, 
    isLoading, 
    error,
    searchQuery,
    documentType,
    department,
    status,
    signatureStatus,
    classification,
    origin,
    sortBy,
    dateFrom,
    dateTo,
    resetSearch,
    searchResults,
    hasExecutedSavedSearch
  } = useSearch();
  const [searchTerm, setSearchTerm] = useState("");
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [executingSearchId, setExecutingSearchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedSearches = async () => {
      try {
        const searches = await getSavedSearches();
        setSavedSearches(searches);
      } catch (err) {
        console.error("Failed to fetch saved searches:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedSearches();
  }, []);

  const filteredSearches = savedSearches.filter(
    (search) =>
      search.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      search.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: savedSearches.length,
    favorites: savedSearches.filter((s) => s.isFavorite).length,
    scheduled: savedSearches.filter((s) => s.isScheduled).length,
    totalResults: savedSearches.reduce((sum, s) => sum + s.results, 0),
  };

  const handleRunSearch = async (searchId: string) => {
    try {
      setExecutingSearchId(searchId);
      // Execute the saved search which will update the search results in the hook
      await executeSavedSearch(searchId);
      
      // Open the results modal instead of navigating away
      setResultsModalOpen(true);
    } catch (err) {
      console.error("Failed to execute saved search:", err);
      toast.error("Failed to execute saved search: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setExecutingSearchId(null);
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    if (confirm("Are you sure you want to delete this saved search?")) {
      try {
        await deleteSavedSearch(searchId);
        // Refresh the list
        const updatedSearches = await getSavedSearches();
        setSavedSearches(updatedSearches);
      } catch (err) {
        console.error("Failed to delete saved search:", err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Total Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Saved queries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.favorites}</div>
            <p className="text-xs text-muted-foreground">Starred searches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Auto-run searches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResults}</div>
            <p className="text-xs text-muted-foreground">Across all searches</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search saved queries..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>Error: {error}</p>
        </div>
      )}

      {loading || isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSearches.map((search) => (
            <Card
              key={search.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {search.isFavorite && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                      {search.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {search.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {search.isScheduled && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Scheduled
                      </Badge>
                    )}
                    <Badge variant="outline">{search.results} results</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Active Filters:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(search.filters).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value as string}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>Created: {new Date(search.createdDate).toLocaleDateString()}</span>
                      <span>Last run: {new Date(search.lastRun).toLocaleDateString()}</span>
                      {search.scheduleFrequency && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {search.scheduleFrequency}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRunSearch(search.id)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Run Search
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteSearch(search.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredSearches.length === 0 && !loading && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No saved searches found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Create your first saved search to get started"}
            </p>
            <Button onClick={() => router.push('/search')}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal for displaying search results */}
      <Dialog 
        open={resultsModalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // When the modal is closed, reset the search state
            resetSearch();
          }
          setResultsModalOpen(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Search Results</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {executingSearchId || isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Executing saved search...</span>
              </div>
            ) : searchResults && searchResults.documents && searchResults.documents.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found <span className="font-medium">{searchResults.total}</span> documents
                  </p>
                </div>
                
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                  {searchResults.documents.map((result) => (
                    <Card 
                      key={result.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/documents/${result.id}`)}
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
                                    // Assuming you have ViewDocumentsModal imported
                                    // For now, just open the document page
                                    router.push(`/documents/${result.id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    // Handle download
                                    const downloadUrl = `/api/documents/${result.id}/files/primary/download`;
                                    window.location.href = downloadUrl;
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    // Handle sharing
                                    // This would require additional state for sharing functionality
                                    console.log('Share document:', result.id);
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
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No results to display</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
