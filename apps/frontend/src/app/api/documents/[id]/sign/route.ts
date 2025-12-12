import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/documents/:id/sign
 * Proxies a manual sign request to the backend
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { id } = params;

    const body = await request.json();

    const backendResponse = await fetch(
      `${backendUrl}/api/documents/${id}/sign-manual`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(request.headers.get("cookie")
            ? { Cookie: request.headers.get("cookie")! }
            : {}),
        },
        credentials: "include",
        body: JSON.stringify(body),
      }
    );

    const result = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok || result.success === false) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.error ?? {
              message: result.message ?? "Failed to sign document",
            },
        },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error signing document:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
