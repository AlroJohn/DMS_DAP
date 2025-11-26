import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Forward the request to the backend API
    // Using the new endpoint for document sharing that requires fewer permissions
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendResponse = await fetch(`${backendUrl}/api/users/search`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Copy cookies from the incoming request to maintain session
        ...(request.headers.get('cookie') ? { 'Cookie': request.headers.get('cookie')! } : {}),
      },
      credentials: 'include',  // Include cookies in the request
    });

    const result = await backendResponse.json();

    if (!backendResponse.ok) {
      return Response.json(
        { 
          error: { 
            message: result.error || 'Failed to fetch users',
            details: result.error 
          } 
        },
        { status: backendResponse.status }
      );
    }

    // Transform the data to match the frontend interface if needed
    // Backend returns UserWithRelations which has nested account and department objects
    const transformedUsers = result.data.map((user: any) => ({
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.account.email, // user.account.email from backend
      department_id: user.department.department_id, // user.department.department_id from backend
      department_name: user.department.name, // user.department.name from backend
    }));

    return Response.json({
      success: true,
      data: transformedUsers,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    
    return Response.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}