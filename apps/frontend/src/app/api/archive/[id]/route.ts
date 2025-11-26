import { NextRequest, NextResponse } from 'next/server';

// Handle POST requests to archive/:id/archive and archive/:id/restore
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Extract action from the URL pathname
    const url = new URL(request.url);
    const pathname = url.pathname;
    const action = pathname.includes('/archive') ? 'archive' : 'restore';
    
    const endpoint = `${backendUrl}/api/archive/${id}/${action}`;
    
    const cookies = request.headers.get('cookie');
    
    const response = await fetch(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookies && { Cookie: cookies }),
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: `Failed to ${action} document` },
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: `Failed to ${action} document` },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? data,
    });
  } catch (error: any) {
    console.error(`Error in POST /api/archive/:id/${action}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' },
      },
      { status: 500 }
    );
  }
}

// Handle GET requests to get a specific archived document
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const endpoint = `${backendUrl}/api/archive/${id}`;
    
    const cookies = request.headers.get('cookie');
    
    const response = await fetch(
      endpoint,
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
        error: { message: 'Failed to fetch archived document' },
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to fetch archived document' },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? data,
    });
  } catch (error: any) {
    console.error('Error in GET /api/archive/:id:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' },
      },
      { status: 500 }
    );
  }
}