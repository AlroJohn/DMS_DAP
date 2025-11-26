import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents/in-transit/incoming
 * Proxies incoming in-transit documents listing requests to the new backend service at /api/intransit/incoming
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const cookies = request.headers.get("cookie");

    const response = await fetch(
      `${backendUrl}/api/intransit/incoming${query ? `?${query}` : ""}`,
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
          error: data.error || { message: data.message || "Failed to fetch incoming documents" },
        },
        { status: response.status }
      );
    }

    const pagination = data.pagination ?? data.meta?.pagination ?? null;

    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? data,
      pagination,
      meta: pagination ? { pagination } : null,
    });
  } catch (error: any) {
    console.error("Error proxying incoming in-transit documents list:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
