import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Define TypeScript interfaces
export interface SearchDocument {
  id: string;
  title: string;
  description: string;
  type: string;
  department: string;
  status: string;
  classification: string;
  origin: string;
  modified: string;
  signed: boolean;
  verified: boolean;
}

export interface SearchParams {
  query?: string;
  documentType?: string;
  department?: string;
  status?: string;
  signatureStatus?: string;
  classification?: string;
  origin?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  documents: SearchDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  description: string;
  query: string;
  filters: Record<string, any>;
  createdDate: string;
  lastRun: string;
  results: number;
  isFavorite: boolean;
  isScheduled: boolean;
  scheduleFrequency: string | null;
}

export const useSearch = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [signatureStatus, setSignatureStatus] = useState('');
  const [classification, setClassification] = useState('');
  const [origin, setOrigin] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasExecutedSavedSearch, setHasExecutedSavedSearch] = useState(false);

  // Function to perform the search
  const performSearch = async (params?: Partial<SearchParams>) => {
    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        ...(params?.query ? { query: params.query } : { query: searchQuery }),
        ...(params?.documentType ? { documentType: params.documentType } : { documentType }),
        ...(params?.department ? { department: params.department } : { department }),
        ...(params?.status ? { status: params.status } : { status }),
        ...(params?.signatureStatus ? { signatureStatus: params.signatureStatus } : { signatureStatus }),
        ...(params?.classification ? { classification: params.classification } : { classification }),
        ...(params?.origin ? { origin: params.origin } : { origin }),
        ...(params?.dateFrom ? { dateFrom: params.dateFrom } : { dateFrom }),
        ...(params?.dateTo ? { dateTo: params.dateTo } : { dateTo }),
        ...(params?.sortBy ? { sortBy: params.sortBy } : { sortBy }),
        page: params?.page?.toString() || '1',
        limit: params?.limit?.toString() || '20',
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(`/api/search?${searchParams.toString()}`, {
        method: 'GET',
        headers,
        credentials: 'include', // This ensures cookies are sent with the request
        cache: 'no-store' // Prevents caching of the response
      });

      console.log('Search response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to search: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Search response data:', data); // For debugging
      
      if (data.success && data.data) {
        setSearchResults(data.data);
        setHasExecutedSavedSearch(false); // Reset the flag since this is a new search
      } else {
        throw new Error(data.message || 'Failed to search documents');
      }
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during search';
      setError(errorMessage);
      toast.error(`Search failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to save a search
  const saveSearch = async (name: string, description: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetch('/api/search/save', {
        method: 'POST',
        headers,
        credentials: 'include', // This ensures cookies are sent with the request
        cache: 'no-store', // Prevents caching of the response
        body: JSON.stringify({
          name,
          description,
          query: searchQuery,
          filters: {
            documentType,
            department,
            status,
            signatureStatus,
            dateFrom,
            dateTo,
            sortBy
          }
        }),
      });

      console.log('Save search response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorData = { message: response.statusText || 'Unknown error' };
        }
        // Ensure errorData and errorData.message exist before accessing
        const errorMessage = (errorData && typeof errorData === 'object' && errorData.message) 
          ? errorData.message 
          : `HTTP Error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Save search response data:', data); // For debugging
      
      if (data.success && data.data) {
        toast.success('Search saved successfully!');
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to save search');
      }
    } catch (err) {
      console.error('Save search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while saving the search';
      setError(errorMessage);
      toast.error(`Failed to save search: ${errorMessage}`);
      throw err;
    }
  };

  // Function to get saved searches
  const getSavedSearches = async (): Promise<SavedSearch[]> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetch('/api/search/saved', {
        method: 'GET',
        headers,
        credentials: 'include', // This ensures cookies are sent with the request
        cache: 'no-store' // Prevents caching of the response
      });

      // For debugging - log the response status
      console.log('Get saved searches response status:', response.status);

      if (!response.ok) {
        // Try to get error details even if response is not ok
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If we can't parse the error response, use status text
          console.error('Error parsing error response:', parseError);
          errorData = { message: response.statusText || 'Unknown error' };
        }
        throw new Error(errorData.message || 'Failed to get saved searches');
      }

      const data = await response.json();
      console.log('Get saved searches response data:', data); // For debugging
      
      if (data.success && data.data) {
        return data.data;
      } else {
        // If the data format is not as expected, throw an error
        console.error('Unexpected response format:', data);
        throw new Error(data.message || 'Received unexpected response format from server');
      }
    } catch (err) {
      console.error('Get saved searches error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while getting saved searches';
      setError(errorMessage);
      toast.error(`Failed to load saved searches: ${errorMessage}`);
      throw err;
    }
  };

  // Function to execute a saved search
  const executeSavedSearch = async (searchId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // First, get the saved search details to update the form state properly
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const savedSearchResponse = await fetch(`/api/search/saved/${searchId}`, {
        method: 'GET',
        headers: fetchHeaders,
        credentials: 'include', // This ensures cookies are sent with the request
        cache: 'no-store' // Prevents caching of the response
      });

      if (!savedSearchResponse.ok) {
        throw new Error('Failed to fetch saved search details');
      }

      const savedSearchData = await savedSearchResponse.json();
      if (!savedSearchData.success || !savedSearchData.data) {
        throw new Error(savedSearchData.message || 'Failed to fetch saved search details');
      }

      const savedSearch = savedSearchData.data;

      // Update the form state with the saved search parameters
      setSearchQuery(savedSearch.query || '');
      
      // Update filters if they exist in the saved search
      if (savedSearch.filters) {
        setDocumentType(savedSearch.filters.documentType || '');
        setDepartment(savedSearch.filters.department || '');
        setStatus(savedSearch.filters.status || '');
        setSignatureStatus(savedSearch.filters.signatureStatus || '');
        setClassification(savedSearch.filters.classification || '');
        setOrigin(savedSearch.filters.origin || '');
        setDateFrom(savedSearch.filters.dateFrom || '');
        setDateTo(savedSearch.filters.dateTo || '');
        setSortBy(savedSearch.filters.sortBy || 'relevance');
      }

      // Now execute the saved search to get results
      const executeHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const executeResponse = await fetch(`/api/search/saved/${searchId}/execute`, {
        method: 'POST',
        headers: executeHeaders,
        credentials: 'include', // This ensures cookies are sent with the request
        cache: 'no-store' // Prevents caching of the response
      });

      console.log('Execute saved search response status:', executeResponse.status);

      if (!executeResponse.ok) {
        let errorData;
        try {
          errorData = await executeResponse.json();
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          // If JSON parsing fails, create a basic error object
          errorData = { message: `HTTP Error: ${executeResponse.status} ${executeResponse.statusText}` };
        }
        // Ensure errorData and errorData.message exist before accessing
        const errorMessage = (errorData && typeof errorData === 'object' && errorData.message) 
          ? errorData.message 
          : `HTTP Error: ${executeResponse.status} ${executeResponse.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await executeResponse.json();
      console.log('Execute saved search response data:', data); // For debugging
      
      if (data.success && data.data) {
        setSearchResults(data.data);
        setHasExecutedSavedSearch(true); // Mark that a saved search has been executed
        toast.success('Saved search executed successfully!');
      } else {
        throw new Error(data.message || 'Failed to execute saved search');
      }
    } catch (err) {
      console.error('Execute saved search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while executing saved search';
      setError(errorMessage);
      toast.error(`Failed to execute saved search: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a saved search
  const deleteSavedSearch = async (searchId: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(`/api/search/saved/${searchId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include', // This ensures cookies are sent with the request
        cache: 'no-store' // Prevents caching of the response
      });

      console.log('Delete saved search response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          errorData = { message: response.statusText || 'Unknown error' };
        }
        // Ensure errorData and errorData.message exist before accessing
        const errorMessage = (errorData && typeof errorData === 'object' && errorData.message) 
          ? errorData.message 
          : `HTTP Error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      toast.success('Saved search deleted successfully!');
      return response.json();
    } catch (err) {
      console.error('Delete saved search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while deleting saved search';
      setError(errorMessage);
      toast.error(`Failed to delete saved search: ${errorMessage}`);
      throw err;
    }
  };

  // Reset search parameters
  const resetSearch = () => {
    setSearchQuery('');
    setDocumentType('');
    setDepartment('');
    setStatus('');
    setSignatureStatus('');
    setSortBy('relevance');
    setDateFrom('');
    setDateTo('');
    setSearchResults(null);
    setHasExecutedSavedSearch(false);
  };

  // Reset the saved search execution flag (useful for the search page after displaying results)
  const resetSavedSearchExecutionFlag = () => {
    setHasExecutedSavedSearch(false);
  };

  return {
    // State
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
    isLoading,
    searchResults,
    error,
    hasExecutedSavedSearch,

    // Functions
    performSearch,
    saveSearch,
    getSavedSearches,
    executeSavedSearch,
    deleteSavedSearch,
    resetSearch,
    resetSavedSearchExecutionFlag,
  };
};