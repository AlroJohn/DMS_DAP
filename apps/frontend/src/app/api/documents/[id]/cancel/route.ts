import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/documents/:id/cancel
 * Proxies document cancellation requests to the backend service
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { id } = params;
    const cookies = request.headers.get("cookie");

    const response = await fetch(`${backendUrl}/api/documents/${id}/cancel`, {
      method: "POST",
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
          error: data.error || { message: data.message || "Failed to cancel document" },
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
    console.error("Error proxying document cancellation:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
