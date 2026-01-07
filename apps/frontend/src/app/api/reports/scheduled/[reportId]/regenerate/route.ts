import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    // Get the authentication token from cookies
    const cookiesStore = await cookies();
    const tokenCookie = cookiesStore.get('accessToken');
    const token = tokenCookie ? tokenCookie.value : null;

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = params;

    if (!reportId) {
      return Response.json({ error: 'Report ID is required' }, { status: 400 });
    }

    // Call the backend API to regenerate the report
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const apiUrl = backendUrl.endsWith('/api')
      ? `${backendUrl}/reports/scheduled/${reportId}/regenerate`
      : `${backendUrl}/api/reports/scheduled/${reportId}/regenerate`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to regenerate scheduled report');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to regenerate scheduled report');
    }

    return Response.json({
      success: true,
      message: result.message || 'Report regenerated successfully'
    });
  } catch (error) {
    console.error('Error regenerating scheduled report:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to regenerate scheduled report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

