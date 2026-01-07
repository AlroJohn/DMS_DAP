import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const page = searchParams.get('page') || '1';
    const unreadOnly = searchParams.get('unreadOnly') || 'false';

    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Remove trailing /api if it exists to avoid double /api/api/
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    // Get cookies from the request to forward to backend
    const cookies = request.headers.get('cookie');

    // Construct the backend API URL with query parameters
    const backendApiUrl = `${backendUrl}/api/notifications?limit=${limit}&page=${page}&unreadOnly=${unreadOnly}`;

    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Failed to fetch notifications' }
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to fetch notifications' }
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: data.success || true,
      data: data.data || data.notifications || [],
      pagination: data.pagination
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
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
    
    // Remove trailing /api if it exists to avoid double /api/api/
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    // Get cookies from the request to forward to backend
    const cookies = request.headers.get('cookie');

    // Check if this is a "mark all as read" request
    const { searchParams } = new URL(request.url);
    const isMarkAllAsRead = searchParams.get('action') === 'read-all';

    let backendApiUrl: string;
    if (isMarkAllAsRead) {
      backendApiUrl = `${backendUrl}/api/notifications/read-all`;
    } else {
      // For individual notification updates, we need to extract the ID from the request body
      const body = await request.json();
      const notificationId = body.id;
      backendApiUrl = `${backendUrl}/api/notifications/${notificationId}/read`;
    }

    const response = await fetch(backendApiUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Failed to update notification' }
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to update notification' }
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
    console.error('Error updating notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' }
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Remove trailing /api if it exists to avoid double /api/api/
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    // Get cookies from the request to forward to backend
    const cookies = request.headers.get('cookie');

    // Extract notification ID from the URL
    const { pathname } = new URL(request.url);
    const notificationId = pathname.split('/').pop(); // Get the last part of the path

    if (!notificationId) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Notification ID is required' }
        },
        { status: 400 }
      );
    }

    const backendApiUrl = `${backendUrl}/api/notifications/${notificationId}`;

    const response = await fetch(backendApiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Failed to delete notification' }
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to delete notification' }
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
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' }
      },
      { status: 500 }
    );
  }
}