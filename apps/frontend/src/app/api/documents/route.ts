import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents
 * Proxies document listing requests to the backend service, preserving auth cookies
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") ?? "1";
    const limit = searchParams.get("limit") ?? "10";
    const sortBy = searchParams.get("sortBy") ?? "created_at";
    const sortOrder = searchParams.get("sortOrder") ?? "desc";

    const cookies = request.headers.get("cookie");

    const response = await fetch(
      `${backendUrl}/api/documents?page=${page}&limit=${limit}&sortBy=${encodeURIComponent(
        sortBy
      )}&sortOrder=${encodeURIComponent(sortOrder)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(cookies && { Cookie: cookies }),
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: "Failed to fetch documents" },
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: "Failed to fetch documents" },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const pagination = data.pagination ?? data.meta?.pagination ?? null;

    return NextResponse.json({
      success: data.success ?? true,
      data: data.data ?? data,
      pagination,
      meta: pagination ? { pagination } : null,
    });
  } catch (error: any) {
    console.error("Error proxying documents list:", error);
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
 * POST /api/documents
 * Proxies document creation requests to the backend service, preserving auth cookies
 */
export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const cookies = request.headers.get("cookie");

    const payload = await request.json().catch(() => null);

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Request body is required to create a document" },
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${backendUrl}/api/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: "Failed to create document" },
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: "Failed to create document" },
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
    console.error("Error proxying document creation:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
