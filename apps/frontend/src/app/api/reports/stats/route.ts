import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for date range
    const searchParams = request.nextUrl.searchParams;
    const dateRange = searchParams.get('dateRange') || '30days';

    // Construct the backend API URL
    let backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (backendUrl && backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4); // Remove '/api' suffix for backend calls
    } else if (!backendUrl) {
      backendUrl = 'http://localhost:3001';
    }
    const apiUrl = `${backendUrl}/api/reports/stats?dateRange=${dateRange}`;

    // Call the backend API to get document type and process statistics
    // Forward the cookies to authenticate the request
    const cookies = request.headers.get('cookie');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies }),
      },
    });

    const data = await response.json();

    return Response.json(data);
  } catch (error) {
    console.error('Error fetching document type and process stats:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to fetch document type and process statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
