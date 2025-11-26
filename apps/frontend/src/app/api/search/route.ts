// apps/frontend/src/app/api/search/route.ts
import { NextRequest } from 'next/server';

// POST route to handle different search-related operations
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Determine the type of request based on the path
    if (path.includes('/saved/') && path.includes('/execute')) {
      // This is an execute saved search request
      // Extract the search ID from the path /api/search/saved/{id}/execute
      const pathParts = path.split('/');
      const searchId = pathParts[pathParts.length - 2]; // The ID before '/execute'
      
      // Use default backend URL if environment variable is not set
      const backendApiUrl = process.env.BACKEND_API_URL || 'http://localhost:3001/api';
      
      // Execute a saved search
      const backendUrl = `${backendApiUrl}/search/saved/${searchId}/execute`;
      
      // Get the auth token from cookies or authorization header
      const authCookie = request.headers.get('cookie')?.match(/(^|;)accessToken=([^;]+)/)?.[2];
      const authorization = request.headers.get('authorization');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if available
      if (authCookie) {
        headers['Cookie'] = `accessToken=${authCookie}`;
      } else if (authorization) {
        headers['Authorization'] = authorization;
      }
      
      console.log('Executing saved search with ID:', searchId); // Debug log
      console.log('Making request to backend:', backendUrl); // Debug log
      console.log('Request headers:', headers); // Debug log
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
      });
      
      console.log('Backend response status for execute:', response.status); // Debug log
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Execute saved search backend error response:', errorData); // Log raw error response
        return Response.json(
          { 
            success: false, 
            message: errorData.message || 'Failed to execute saved search', 
            error: (errorData as { message?: string }).message || 'Unknown error' 
          },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      console.log('Execute saved search backend response data:', data); // Debug log
      return Response.json(data);
    } else if (path.endsWith('/save')) {
      // This is a save search request
      // Verify that the backend API URL is configured
      if (!process.env.BACKEND_API_URL) {
        console.error('BACKEND_API_URL environment variable is not set');
        return Response.json(
          { 
            success: false, 
            message: 'Server configuration error: BACKEND_API_URL not set' 
          },
          { status: 500 }
        );
      }
      
      // Save a new search
      const body = await request.json();
      
      // Get the auth token from cookies or authorization header
      const authCookie = request.headers.get('cookie')?.match(/(^|;)accessToken=([^;]+)/)?.[2];
      const authorization = request.headers.get('authorization');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if available
      // Since the backend expects the token in cookies, we need to forward the original cookie header
      if (request.headers.get('cookie')) {
        headers['Cookie'] = request.headers.get('cookie')!;
      } else if (authorization) {
        headers['Authorization'] = authorization;
      }
      
      console.log('Saving search with params:', body); // Debug log
      console.log('Making request to backend:', `${process.env.BACKEND_API_URL}/search/save`); // Debug log
      console.log('Request headers:', headers); // Debug log
      
      const response = await fetch(`${process.env.BACKEND_API_URL}/search/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      
      console.log('Save search response status:', response.status); // Debug log
      
      if (!response.ok) {
        const errorText = await response.text().catch(err => `Error reading response: ${err.message}`);
        console.error('Save search backend error response:', errorText); // Log raw error response
        
        let errorData = {};
        try {
          // Try to parse as JSON, fallback to text
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        return Response.json(
          { 
            success: false, 
            message: 'Failed to save search', 
            error: (errorData as { message?: string }).message || 'Unknown error' 
          },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      console.log('Save search response data:', data); // Debug log
      return Response.json(data);
    } else {
      // Handle other POST requests if needed
      return Response.json(
        { 
          success: false, 
          message: 'Invalid POST request path for search API' 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('POST Search API route error:', error);
    return Response.json(
      { 
        success: false, 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET route - handles both regular search and saved searches
export async function GET(request: NextRequest) {
  try {
    // Check if this is a request for saved searches
    const url = new URL(request.url);
    const path = url.pathname;
    
    if (path.includes('/saved') && !path.includes('/execute')) {
      // This is a request to get saved searches
      // Use default backend URL if environment variable is not set
      const backendApiUrl = process.env.BACKEND_API_URL || 'http://localhost:3001/api';
      
      // Build the backend API URL for saved searches
      const backendUrl = `${backendApiUrl}/search/saved`;
      
      // Get the auth token from cookies or authorization header
      const authCookie = request.headers.get('cookie')?.match(/(^|;)accessToken=([^;]+)/)?.[2];
      const authorization = request.headers.get('authorization');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if available
      if (authCookie) {
        headers['Cookie'] = `accessToken=${authCookie}`;
      } else if (authorization) {
        headers['Authorization'] = authorization;
      }
      
      console.log('Making request to backend for saved searches:', backendUrl); // Debug log
      console.log('Request headers:', headers); // Debug log
      
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers,
      });
      
      console.log('Backend response status for saved searches:', response.status); // Debug log
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return Response.json(
          { 
            success: false, 
            message: errorData.message || 'Failed to get saved searches', 
            error: (errorData as { message?: string }).message || 'Unknown error' 
          },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      console.log('Get saved searches response data:', data); // Debug log
      return Response.json(data);
    }
    
    // Otherwise, this is a regular search request
    // Get the current session/token if needed
    // const token = await getServerSession(); // Assuming you have auth setup
    
    const { searchParams } = new URL(request.url);
    
    // Extract all search parameters from the query
    const query = searchParams.get('query');
    const documentType = searchParams.get('documentType');
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const signatureStatus = searchParams.get('signatureStatus');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    
    // Use default backend URL if environment variable is not set
    const backendApiUrl = process.env.BACKEND_API_URL || 'http://localhost:3001/api';
    
    // Build the backend API URL with all query parameters
    const backendUrl = new URL(`${backendApiUrl}/search`);
    
    // Append all search parameters to the backend URL
    if (query) backendUrl.searchParams.append('query', query);
    if (documentType) backendUrl.searchParams.append('documentType', documentType);
    if (department) backendUrl.searchParams.append('department', department);
    if (status) backendUrl.searchParams.append('status', status);
    if (signatureStatus) backendUrl.searchParams.append('signatureStatus', signatureStatus);
    if (dateFrom) backendUrl.searchParams.append('dateFrom', dateFrom);
    if (dateTo) backendUrl.searchParams.append('dateTo', dateTo);
    if (sortBy) backendUrl.searchParams.append('sortBy', sortBy);
    if (page) backendUrl.searchParams.append('page', page);
    if (limit) backendUrl.searchParams.append('limit', limit);
    
    // Make a request to the backend API
    // Get the auth token from cookies or authorization header
    const authCookie = request.headers.get('cookie')?.match(/(^|;)accessToken=([^;]+)/)?.[2];
    const authorization = request.headers.get('authorization');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if available
    // Since the backend expects the token in cookies, we need to forward the original cookie header
    if (request.headers.get('cookie')) {
      headers['Cookie'] = request.headers.get('cookie')!;
    } else if (authorization) {
      headers['Authorization'] = authorization;
    }
    
    console.log('Making request to backend:', backendUrl.toString()); // Debug log
    console.log('Request headers:', headers); // Debug log
    
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers,
    });
    
    console.log('Backend response status:', response.status); // Debug log
    
    if (!response.ok) {
      const errorText = await response.text().catch(err => `Error reading response: ${err.message}`);
      console.error('Backend error response:', errorText); // Log raw error response
      
      let errorData = {};
      try {
        // Try to parse as JSON, fallback to text
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      return Response.json(
        { 
          success: false, 
          message: 'Failed to search documents', 
          error: (errorData as { message?: string }).message || 'Unknown error' 
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('GET Search API route error:', error);
    return Response.json(
      { 
        success: false, 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// PUT route for updating saved searches
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Extract the search ID from the path
    const pathParts = path.split('/');
    const searchId = pathParts[pathParts.length - 1];
    
    const body = await request.json();
    
    // Verify that the backend API URL is configured
    if (!process.env.BACKEND_API_URL) {
      console.error('BACKEND_API_URL environment variable is not set');
      return Response.json(
        { 
          success: false, 
          message: 'Server configuration error: BACKEND_API_URL not set' 
        },
        { status: 500 }
      );
    }
    
    // Get the auth token from cookies or authorization header
    const authCookie = request.headers.get('cookie')?.match(/(^|;)accessToken=([^;]+)/)?.[2];
    const authorization = request.headers.get('authorization');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if available
    // Since the backend expects the token in cookies, we need to forward the original cookie header
    if (request.headers.get('cookie')) {
      headers['Cookie'] = request.headers.get('cookie')!;
    } else if (authorization) {
      headers['Authorization'] = authorization;
    }
    
    const response = await fetch(`${process.env.BACKEND_API_URL}/search/saved/${searchId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { 
          success: false, 
          message: 'Failed to update saved search', 
          error: (errorData as { message?: string }).message || 'Unknown error' 
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('PUT Search API route error:', error);
    return Response.json(
      { 
        success: false, 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// DELETE route for saved searches
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Extract the search ID from the path
    const pathParts = path.split('/');
    const searchId = pathParts[pathParts.length - 1];
    
    // Verify that the backend API URL is configured
    if (!process.env.BACKEND_API_URL) {
      console.error('BACKEND_API_URL environment variable is not set');
      return Response.json(
        { 
          success: false, 
          message: 'Server configuration error: BACKEND_API_URL not set' 
        },
        { status: 500 }
      );
    }
    
    // Get the auth token from cookies or authorization header
    const authCookie = request.headers.get('cookie')?.match(/(^|;)accessToken=([^;]+)/)?.[2];
    const authorization = request.headers.get('authorization');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if available
    // Since the backend expects the token in cookies, we need to forward the original cookie header
    if (request.headers.get('cookie')) {
      headers['Cookie'] = request.headers.get('cookie')!;
    } else if (authorization) {
      headers['Authorization'] = authorization;
    }
    
    const response = await fetch(`${process.env.BACKEND_API_URL}/search/saved/${searchId}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { 
          success: false, 
          message: 'Failed to delete saved search', 
          error: (errorData as { message?: string }).message || 'Unknown error' 
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('DELETE Search API route error:', error);
    return Response.json(
      { 
        success: false, 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}