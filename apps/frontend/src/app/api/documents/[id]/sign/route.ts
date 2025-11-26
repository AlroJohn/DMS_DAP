import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/documents/:id/sign
 * Proxies the request to the backend to sign a document with blockchain
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const { id } = params;

    // Get cookies from the request to forward to backend
    const cookies = request.headers.get('cookie');

    // Get the request body (signature if provided)
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${backendUrl}/api/documents/${id}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Failed to sign document' }
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to sign document' }
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: data.success || true,
      data: data.data
    });
  } catch (error: any) {
    console.error('Error signing document:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' }
      },
      { status: 500 }
    );
  }
}
