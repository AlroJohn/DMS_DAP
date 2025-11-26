import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents/owned
 * Proxies owned documents listing requests to the backend service, preserving auth cookies
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const cookies = request.headers.get("cookie");

    const response = await fetch(
      `${backendUrl}/api/documents/owned${query ? `?${query}` : ""}`,
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
          error: data.error || { message: data.message || "Failed to fetch owned documents" },
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
    console.error("Error proxying owned documents list:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
