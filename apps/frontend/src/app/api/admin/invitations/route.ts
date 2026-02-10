import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendResponse = await fetch(`${backendUrl}/api/admin/invitations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('cookie') ? { 'Cookie': request.headers.get('cookie')! } : {}),
      },
      credentials: 'include',
    });

    const result = await backendResponse.json();

    if (!backendResponse.ok) {
      return Response.json(
        { 
          error: { 
            message: result.error || 'Failed to fetch invitations',
            details: result.error 
          } 
        },
        { status: backendResponse.status }
      );
    }

    return Response.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    
    return Response.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const body = await request.json().catch(() => ({}));

    const backendResponse = await fetch(`${backendUrl}/api/admin/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('cookie') ? { 'Cookie': request.headers.get('cookie')! } : {}),
        ...(request.headers.get('authorization')
          ? { Authorization: request.headers.get('authorization')! }
          : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const responseText = await backendResponse.text();
    const result = responseText ? JSON.parse(responseText) : {};

    if (!backendResponse.ok) {
      return Response.json(
        {
          error: {
            message:
              result.error?.message ||
              result.error ||
              result.message ||
              'Failed to create invitation',
            details: result.error || result,
          },
        },
        { status: backendResponse.status },
      );
    }

    return Response.json(result || { success: true });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return Response.json(
      { error: { message: 'Internal server error' } },
      { status: 500 },
    );
  }
}
