import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get the authentication token from cookies
    const cookiesStore = await cookies();
    const tokenCookie = cookiesStore.get('accessToken');
    const token = tokenCookie ? tokenCookie.value : null;

    if (!token) {
      return Response.json({ 
        success: false,
        error: 'Unauthorized',
        message: 'No authentication token found'
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange');
    const filter = searchParams.get('filter');

    // Build query string
    const queryParams = new URLSearchParams();
    if (dateRange) queryParams.append('dateRange', dateRange);
    if (filter) queryParams.append('filter', filter);

    const queryString = queryParams.toString();
    
    // Construct backend API URL - ensure we have /api in the path
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    if (!backendUrl.includes('/api')) {
      backendUrl = `${backendUrl}/api`;
    }
    const apiUrl = `${backendUrl}/reports/signing${queryString ? `?${queryString}` : ''}`;
    
    console.log('Fetching signing history from:', apiUrl);

    // Fetch signing history data from the backend API
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error text:', errorText);
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // If parsing fails, create proper error structure
        errorData = { 
          message: errorText || `Backend returned status ${response.status}`,
          status: response.status 
        };
      }
      
      console.error('Backend error data:', errorData);
      
      const errorMessage = 
        errorData.message || 
        errorData.error?.message ||
        errorData.error ||
        `Failed to fetch signing history (Status: ${response.status})`;
        
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Backend result success:', result.success);

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch signing history');
    }

    return Response.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error fetching signing history:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to retrieve signing history',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

