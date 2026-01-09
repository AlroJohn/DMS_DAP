import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents/:id
 * Proxies document detail requests to the backend service, preserving auth cookies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Construct backend API URL - ensure we have /api in the path
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    if (!backendUrl.includes('/api')) {
      backendUrl = `${backendUrl}/api`;
    }
    
    const { id } = await params;
    
    console.log('Document API: Fetching document with ID:', id);

    const cookies = request.headers.get("cookie");
    
    const apiUrl = `${backendUrl}/documents/${id}`;
    console.log('Document API: Backend URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
      cache: "no-store"
    });

    console.log('Document API: Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText || `HTTP ${response.status}` } };
      }
      console.error('Document API: Backend error:', errorData);

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: "Failed to fetch document" },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Document API: Success:', data.success);

    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? data,
    });
  } catch (error: any) {
    console.error("Error proxying document detail:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/:id
 * Proxies document deletion requests to the backend service
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    
    // Remove trailing /api if it exists to avoid double /api/api/
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }
    
    const { id } = await params;

    const cookies = request.headers.get("cookie");

    const response = await fetch(`${backendUrl}/api/documents/${id}`, {
      method: "DELETE",
      headers: {
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || { message: data.message || "Failed to delete document" },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? null,
      message: data.message ?? data.data?.message ?? undefined,
    });
  } catch (error: any) {
    console.error("Error proxying document delete:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
