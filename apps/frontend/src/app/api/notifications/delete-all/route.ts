import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Remove trailing /api if it exists to avoid double /api/api/
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    // Get cookies from the request to forward to backend
    const cookies = request.headers.get('cookie');

    const backendApiUrl = `${backendUrl}/api/notifications/delete-all`;

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
        error: { message: 'Failed to delete all notifications' }
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to delete all notifications' }
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
    console.error('Error deleting all notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' }
      },
      { status: 500 }
    );
  }
}
