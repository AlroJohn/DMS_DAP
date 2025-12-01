import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents/recycle-bin
 * Proxies recycle bin documents listing requests to the new backend service at /api/recycle-bin
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const cookies = request.headers.get("cookie");

    const response = await fetch(
      `${backendUrl}/api/recycle-bin${query ? `?${query}` : ""}`,
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
          error: data.error || { message: data.message || "Failed to fetch recycle bin documents" },
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
    console.error("Error proxying recycle bin documents list:", error);
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
 * DELETE /api/documents/recycle-bin
 * Proxies empty recycle bin requests to the backend service at /api/recycle-bin
 */
export async function DELETE(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const cookies = request.headers.get("cookie");

    const response = await fetch(
      `${backendUrl}/api/recycle-bin`,
      {
        method: "DELETE",
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
          error: data.error || { message: data.message || "Failed to empty recycle bin" },
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error proxying empty recycle bin request:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
