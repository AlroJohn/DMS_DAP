import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
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

    // Fetch the scheduled report file from the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const apiUrl = backendUrl.endsWith('/api')
      ? `${backendUrl}/reports/scheduled/${reportId}/download`
      : `${backendUrl}/api/reports/scheduled/${reportId}/download`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to download scheduled report';
      const contentType = response.headers.get('Content-Type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If parsing fails, use default message
          errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        }
      } else {
        errorMessage = `Server returned ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    // Check if response is actually a file (not JSON error)
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      // This shouldn't happen if response.ok is true, but handle it just in case
      const errorData = await response.json();
      throw new Error(errorData.message || 'Unexpected error from server');
    }

    // Get the filename from Content-Disposition header or use a default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `report-${reportId}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
        // Decode URI if needed
        try {
          filename = decodeURIComponent(filename);
        } catch (e) {
          // If decoding fails, use as is
        }
      }
    }

    // Get the file blob
    const blob = await response.blob();

    // Return the file with appropriate headers
    return new Response(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading scheduled report:', error);
    return Response.json(
      {
        success: false,
        message: 'Failed to download scheduled report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

