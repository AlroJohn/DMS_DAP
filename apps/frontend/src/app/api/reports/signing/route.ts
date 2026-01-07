import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get the authentication token from cookies
    const cookiesStore = await cookies();
    const tokenCookie = cookiesStore.get('accessToken');
    const token = tokenCookie ? tokenCookie.value : null;

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/reports/signing${queryString ? `?${queryString}` : ''}`;

    // Fetch signing history data from the backend API
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch signing history');
    }

    const result = await response.json();

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

