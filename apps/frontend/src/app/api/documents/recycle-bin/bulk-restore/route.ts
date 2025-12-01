import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/documents/recycle-bin/bulk-restore
 * Proxies bulk restore documents from recycle bin requests to the backend service at /api/recycle-bin/bulk-restore
 */
export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const { documentIds } = await request.json();
    const cookies = request.headers.get("cookie");

    console.log("📍 [Frontend API] Bulk restore request - Backend URL:", backendUrl, "Document IDs:", documentIds);

    const response = await fetch(
      `${backendUrl}/api/recycle-bin/bulk-restore`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookies && { Cookie: cookies }),
        },
        credentials: "include",
        body: JSON.stringify({ documentIds }),
      }
    );

    console.log("📍 [Frontend API] Backend response status:", response.status);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("📍 [Frontend API] Backend returned error:", data);
      return NextResponse.json(
        {
          success: false,
          error: data.error || { message: data.message || "Failed to restore documents from recycle bin" },
        },
        { status: response.status }
      );
    }

    console.log("📍 [Frontend API] Bulk restore successful:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error proxying bulk restore from recycle bin request:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}