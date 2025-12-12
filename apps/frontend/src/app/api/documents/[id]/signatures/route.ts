import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/documents/:id/signatures
 * Proxies to backend document details and returns only signedDocuments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { id } = params;

    const backendResponse = await fetch(`${backendUrl}/api/documents/${id}`, {
      method: "GET",
      headers: {
        ...(request.headers.get("cookie")
          ? { Cookie: request.headers.get("cookie")! }
          : {}),
      },
      credentials: "include",
    });

    const payload = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok || payload.success === false) {
      return NextResponse.json(
        {
          success: false,
          error:
            payload.error ?? {
              message: payload.message ?? "Failed to fetch document details",
            },
        },
        { status: backendResponse.status }
      );
    }

    const signedDocuments =
      payload.data?.signedDocuments ?? payload.signedDocuments ?? [];

    return NextResponse.json(signedDocuments);
  } catch (error: any) {
    console.error("Error fetching signatures:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
