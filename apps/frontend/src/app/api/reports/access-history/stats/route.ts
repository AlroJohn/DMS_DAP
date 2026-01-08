import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/reports/access-history/stats
 * Proxies access history stats requests to the backend service, preserving auth cookies
 */
export async function GET(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    
    // Remove trailing /api if it exists to avoid double /api/api/
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }

    const cookies = request.headers.get("cookie");

    const response = await fetch(`${backendUrl}/api/access-history-stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: "Failed to fetch access history stats" },
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: "Failed to fetch access history stats" },
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? data,
    });
  } catch (error: any) {
    console.error("Error proxying access history stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
