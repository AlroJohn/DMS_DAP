import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    const cookies = request.headers.get('cookie');
    const backendApiUrl = `${backendUrl}/api/notification-preferences`;

    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include',
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Failed to fetch notification preferences' }
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to fetch notification preferences' }
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: data.success || true,
      data: data.data || {}
    });
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' }
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    const cookies = request.headers.get('cookie');
    const body = await request.json();

    // Determine which endpoint to call based on the request body
    let endpoint = '/api/notification-preferences';
    
    if (body.globalNotifications !== undefined || body.emailNotifications !== undefined) {
      endpoint = '/api/notification-preferences/settings';
    } else if (Array.isArray(body.preferences)) {
      endpoint = '/api/notification-preferences/bulk';
    } else if (body.category && body.name) {
      endpoint = '/api/notification-preferences/preference';
    }

    const backendApiUrl = `${backendUrl}${endpoint}`;

    const response = await fetch(backendApiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Failed to update notification preferences' }
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to update notification preferences' }
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: data.success || true,
      data: data.data || {}
    });
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' }
      },
      { status: 500 }
    );
  }
}
