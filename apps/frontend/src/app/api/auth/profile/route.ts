import { NextRequest } from 'next/server';

/**
 * PUT /api/auth/profile
 * Update the current user's profile information
 */
export async function PUT(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const body = await request.json();

    // Get cookies from the request to forward to backend
    const cookies = request.headers.get('cookie');

    // First, get the current user to get their ID
    const meResponse = await fetch(`${backendUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });

    if (!meResponse.ok) {
      const errorData = await meResponse.json().catch(() => ({
        error: { message: 'Failed to get current user' }
      }));

      return Response.json(
        {
          success: false,
          error: errorData.error || { message: 'Failed to get current user' }
        },
        { status: meResponse.status }
      );
    }

    // Update the user profile using the dedicated profile endpoint
    // This endpoint allows users to update their own profile without admin permissions
    const updateResponse = await fetch(`${backendUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include',
      body: JSON.stringify({
        first_name: body.first_name,
        last_name: body.last_name,
        signature: body.signature !== undefined ? body.signature : undefined,
        // Note: email and phone might not be updatable through this endpoint
        // You may need to create a separate endpoint for account-level updates
      })
    });

    const result = await updateResponse.json();

    if (!updateResponse.ok) {
      return Response.json(
        {
          success: false,
          error: result.error || { message: 'Failed to update profile' }
        },
        { status: updateResponse.status }
      );
    }

    return Response.json({
      success: true,
      data: result.data,
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return Response.json(
      {
        success: false,
        error: { message: error.message || 'Internal server error' }
      },
      { status: 500 }
    );
  }
}

