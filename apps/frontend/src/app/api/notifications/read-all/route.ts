import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Remove trailing /api if it exists to avoid double /api/api/
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    // Get cookies from the request to forward to backend
    const cookies = request.headers.get('cookie');

    const backendApiUrl = `${backendUrl}/api/notifications/read-all`;

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
        error: { message: 'Failed to mark all notifications as read' }
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to mark all notifications as read' }
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
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' }
      },
      { status: 500 }
    );
  }
}