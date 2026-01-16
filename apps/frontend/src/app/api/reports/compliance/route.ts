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

    // Construct backend API URL - ensure we have /api in the path
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    if (!backendUrl.includes('/api')) {
      backendUrl = `${backendUrl}/api`;
    }
    const apiUrl = `${backendUrl}/reports/compliance`;

    console.log('Fetching compliance report from:', apiUrl);

    // Fetch compliance data from the backend API
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
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      console.error('Backend error:', errorData);
      throw new Error(errorData.message || 'Failed to fetch compliance report');
    }

    const result = await response.json();
    // console.log('Backend result success:', result.success);

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch compliance report');
    }

    return Response.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error fetching compliance report:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to retrieve compliance report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}