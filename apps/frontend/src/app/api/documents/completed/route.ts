import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents/completed
 * Proxies completed documents listing requests to the backend service
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const cookies = request.headers.get("cookie");

    const response = await fetch(
      `${backendUrl}/api/documents/completed${query ? `?${query}` : ""}`,
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
          error: data.error || { message: data.message || "Failed to fetch completed documents" },
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
    console.error("Error proxying completed documents list:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
