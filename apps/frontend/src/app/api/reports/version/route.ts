import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Define the interface for the version history report
interface VersionHistoryReport {
  statistics: {
    totalVersions: number;
    versionsThisMonth: number;
    avgVersionsPerDoc: number;
  };
  recentChanges: Array<{
    fileId: string;
    fileName: string;
    documentTitle: string;
    documentCode: string;
    version: string;
    uploadedAt: string;
    uploadedBy: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Get the access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract the documentId from the URL if present
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const compare = searchParams.get('compare'); // Check if we're comparing versions

    // Construct the backend API URL
    let backendUrl = process.env.BACKEND_API_URL;
    if (!backendUrl) {
      // Try different possible environment variables
      backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
    }

    let apiUrl = `${backendUrl}/api/reports/versions`;

    if (documentId && compare) {
      // If comparing, we need to get version history for the document
      apiUrl = `${backendUrl}/api/reports/versions/${documentId}`;
    } else if (documentId) {
      // If just getting a specific document's version history
      apiUrl = `${backendUrl}/api/reports/versions/${documentId}`;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || `Backend API error: ${response.status}`
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message || 'Failed to fetch version history report'
        },
        { status: 500 }
      );
    }

    // Return the data from the backend
    return NextResponse.json(
      {
        success: true,
        data: result.data
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching version history report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint for comparing document versions
export async function POST(request: NextRequest) {
  try {
    // Get the access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    const { fileId1, fileId2 } = body;

    if (!fileId1 || !fileId2) {
      return NextResponse.json(
        {
          success: false,
          error: 'fileId1 and fileId2 are required'
        },
        { status: 400 }
      );
    }

    // Construct the backend API URL
    let backendUrl = process.env.BACKEND_API_URL;
    if (!backendUrl) {
      // Try different possible environment variables
      backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
    }

    const response = await fetch(`${backendUrl}/api/reports/versions/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${accessToken}`,
      },
      body: JSON.stringify({ fileId1, fileId2 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || `Backend API error: ${response.status}`
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message || 'Failed to compare document versions'
        },
        { status: 500 }
      );
    }

    // Return the comparison data from the backend
    return NextResponse.json(
      {
        success: true,
        data: result.data
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error comparing document versions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}