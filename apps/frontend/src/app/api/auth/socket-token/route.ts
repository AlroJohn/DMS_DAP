import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/socket-token
 * Proxies the request to the backend to get a Socket.IO authentication token
 */
export async function GET(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Remove trailing /api if it exists to avoid double /api/api/
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    // Get cookies from the request to forward to backend
    const cookies = request.headers.get('cookie');

    const response = await fetch(`${backendUrl}/api/auth/socket-token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Failed to get socket token' }
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to get socket token' }
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Handle both possible response formats:
    // 1. { success: true, data: { token: "..." } }
    // 2. { success: true, token: "..." }
    const token = data.data?.token || data.token;

    return NextResponse.json({
      success: data.success || true,
      token: token,
      data: data.data || { token }
    });
  } catch (error: any) {
    console.error('Error fetching socket token:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' }
      },
      { status: 500 }
    );
  }
}
