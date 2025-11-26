import { NextRequest } from 'next/server';
import { z } from 'zod';

// Define the request body schema
const ShareDocumentSchema = z.object({
  documentId: z.string(),
  userIds: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { documentId, userIds } = ShareDocumentSchema.parse(body);

    // Forward the request to the backend API
    // Using cookies for authentication (assuming session cookies are set)
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
        userIds
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
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { message: 'Invalid request data', issues: error.issues } },
        { status: 400 }
      );
    }

    return Response.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}