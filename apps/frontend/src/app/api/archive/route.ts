import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/archive
 * Proxies archived document listing requests to the backend service, preserving auth cookies
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const { searchParams } = new URL(request.url);
    
    const cookies = request.headers.get('cookie');

    const response = await fetch(
      `${backendUrl}/api/archive`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookies && { Cookie: cookies }),
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Failed to fetch archived documents' },
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to fetch archived documents' },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? data,
      count: data.count
    });
  } catch (error: any) {
    console.error('Error proxying archived documents list:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' },
      },
      { status: 500 }
    );
  }
}