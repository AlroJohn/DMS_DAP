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

    // Fetch scheduled reports from the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const apiUrl = backendUrl.endsWith('/api')
      ? `${backendUrl}/reports/scheduled`
      : `${backendUrl}/api/reports/scheduled`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch scheduled reports');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch scheduled reports');
    }

    return Response.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to retrieve scheduled reports',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

