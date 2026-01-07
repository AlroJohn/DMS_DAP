import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get the authentication token from cookies
    const cookiesStore = await cookies();
    const tokenCookie = cookiesStore.get('accessToken');
    const token = tokenCookie ? tokenCookie.value : null;

    if (!token) {
      console.error('No access token found in cookies');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the schedule data from the request body
    const scheduleData = await request.json();

    // Call the backend API to schedule the compliance report
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Check if the backend URL already includes '/api' to avoid double prefix
    const apiUrl = backendUrl.endsWith('/api')
      ? `${backendUrl}/reports/compliance/schedule`
      : `${backendUrl}/api/reports/compliance/schedule`;

    console.log('Making request to backend:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scheduleData),
    });

    console.log('Backend response status:', response.status);

    const result = await response.json();
    console.log('Backend response data:', result);

    if (!response.ok) {
      console.error('Backend returned error:', result);
      return NextResponse.json(
        {
          success: false,
          message: result.message || 'Failed to schedule compliance report',
          error: result.error
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message || 'Compliance report scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling compliance report:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to schedule compliance report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}