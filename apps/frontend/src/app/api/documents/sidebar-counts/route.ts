import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents/sidebar-counts
 * Proxies sidebar count requests to the backend service, preserving auth cookies
 */
export async function GET(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    if (backendUrl.endsWith("/api")) {
      backendUrl = backendUrl.slice(0, -4);
    }

    const cookies = request.headers.get("cookie");
    const response = await fetch(`${backendUrl}/api/documents/sidebar-counts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || {
            message: data.message || "Failed to fetch document counts",
          },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? data,
    });
  } catch (error: any) {
    console.error("Error proxying document counts:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
