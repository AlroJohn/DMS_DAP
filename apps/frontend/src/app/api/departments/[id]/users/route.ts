import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/departments/[id]/users
 * Proxies request to fetch users by department ID to the backend service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const cookies = request.headers.get("cookie");

    const response = await fetch(
      `${backendUrl}/api/admin/departments/${id}/users`,
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
          error: data.error || { message: data.message || "Failed to fetch users" },
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: data.success ?? true,
      users: data.users ?? data.data ?? [],
    });
  } catch (error: any) {
    console.error("Error proxying department users request:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
