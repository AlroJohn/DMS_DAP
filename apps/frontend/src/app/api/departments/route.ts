import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/departments
 * Proxies department listing requests to the backend service
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const cookies = request.headers.get("cookie");

    const response = await fetch(
      `${backendUrl}/api/admin/departments${query ? `?${query}` : ""}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(cookies && { Cookie: cookies }),
        },
        credentials: "include",
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || { message: data.message || "Failed to fetch departments" },
        },
        { status: response.status }
      );
    }

    // Return departments array directly for backward compatibility
    const departments = data.data ?? data.departments ?? data ?? [];
    return NextResponse.json(Array.isArray(departments) ? departments : []);
  } catch (error: unknown) {
    console.error("Error proxying departments list:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: { message },
      },
      { status: 500 }
    );
  }
}
