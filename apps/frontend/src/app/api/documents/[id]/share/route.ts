import { NextRequest } from 'next/server';

// Define the expected request body structure
interface ShareDocumentBody {
  userIds: string[];
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const documentId = params.id;
    
    // Parse and validate the request body
    const body: ShareDocumentBody = await request.json();
    
    if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
      return Response.json(
        { error: { message: 'Invalid request data: userIds must be a non-empty array' } },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendResponse = await fetch(`${backendUrl}/api/shared/${documentId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Copy cookies from the incoming request to maintain session
        ...(request.headers.get('cookie') ? { 'Cookie': request.headers.get('cookie')! } : {}),
      },
      credentials: 'include',  // Include cookies in the request
      body: JSON.stringify({
        userIds: body.userIds
      }),
    });

    const result = await backendResponse.json();

    if (!backendResponse.ok) {
      return Response.json(
        { 
          error: { 
            message: result.error || 'Failed to share document',
            details: result.error 
          } 
        },
        { status: backendResponse.status }
      );
    }

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error sharing document:', error);
    
    return Response.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}