import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/documents/upload
 * Proxies multipart document upload requests to the backend while forwarding auth cookies.
 */
export async function POST(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    if (backendUrl.endsWith("/api")) {
      backendUrl = backendUrl.slice(0, -4);
    }

    const cookies = request.headers.get("cookie");
    const formData = await request.formData();

    const response = await fetch(`${backendUrl}/api/documents/upload`, {
      method: "POST",
      headers: {
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
      body: formData,
    });

    const data = await response.json().catch(() => ({
      success: false,
      error: { message: "Failed to create document" },
    }));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || { message: "Failed to create document" },
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Error proxying document upload:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
