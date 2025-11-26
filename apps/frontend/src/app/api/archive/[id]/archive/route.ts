import { NextRequest, NextResponse } from 'next/server';

// Handle POST requests to archive/:id/archive
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const endpoint = `${backendUrl}/api/archive/${id}/archive`;
    
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
        error: { message: 'Failed to archive document' },
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to archive document' },
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
    console.error('Error in POST /api/archive/:id/archive:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' },
      },
      { status: 500 }
    );
  }
}