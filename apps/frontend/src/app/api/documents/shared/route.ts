import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract search params
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';

    // Forward the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendResponse = await fetch(`${backendUrl}/api/shared?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Copy cookies from the incoming request to maintain session
        ...(request.headers.get('cookie') ? { 'Cookie': request.headers.get('cookie')! } : {}),
      },
      credentials: 'include',  // Include cookies in the request
    });

    // Safely parse the response body regardless of success or error
    let result;
    try {
      result = await backendResponse.json();
    } catch (parseError) {
      // If JSON parsing fails, create a default error response
      return Response.json(
        {
          error: {
            message: 'Failed to fetch shared documents - invalid response format',
            details: 'Response was not valid JSON'
          }
        },
        { status: backendResponse.status || 500 }
      );
    }

    if (!backendResponse.ok) {
      return Response.json(
        {
          error: {
            message: result.error?.message || result.message || 'Failed to fetch shared documents',
            details: result.error || result
          }
        },
        { status: backendResponse.status }
      );
    }

    return Response.json({
      success: true,
      data: result.data || [],
      meta: result.meta || null
    });
  } catch (error) {
    console.error('Error fetching shared documents:', error);

    return Response.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}