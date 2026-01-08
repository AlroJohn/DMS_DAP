import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/reports/access-history
 * Proxies access history requests to the backend service, preserving auth cookies
 */
export async function GET(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    
    // Remove trailing /api if it exists to avoid double /api/api/
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    const { searchParams } = new URL(request.url);
    
    // Get all query parameters
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    const cookies = request.headers.get("cookie");

    const queryString = params.toString();
    const url = queryString 
      ? `${backendUrl}/api/access-history?${queryString}`
      : `${backendUrl}/api/access-history`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: "Failed to fetch access history" },
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: "Failed to fetch access history" },
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? data,
      pagination: data.pagination,
    });
  } catch (error: any) {
    console.error("Error proxying access history:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
