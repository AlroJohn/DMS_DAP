import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents/:id
 * Proxies document detail requests to the backend service, preserving auth cookies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { id } = params;

    const cookies = request.headers.get("cookie");

    const response = await fetch(`${backendUrl}/api/documents/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: "Failed to fetch document" },
      }));

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || { message: "Failed to fetch document" },
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
    console.error("Error proxying document detail:", error);
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
 * DELETE /api/documents/:id
 * Proxies document deletion requests to the backend service
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { id } = params;

    const cookies = request.headers.get("cookie");

    const response = await fetch(`${backendUrl}/api/documents/${id}`, {
      method: "DELETE",
      headers: {
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || { message: data.message || "Failed to delete document" },
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
    console.error("Error proxying document delete:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
