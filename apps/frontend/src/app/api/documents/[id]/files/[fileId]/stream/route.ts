import { NextRequest, NextResponse } from "next/server";

function extractFilename(disposition: string | null): string {
  if (!disposition) {
    return "document";
  }

  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  if (match) {
    const value = match[1] || match[2];
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return "document";
}

/**
 * GET /api/documents/:id/files/:fileId/stream
 * Streams a document file from the backend, forcing inline preview unless ?download=1
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const cookies = request.headers.get("cookie");
    const wantDownload = request.nextUrl.searchParams.get("download") === "1";

    const backendStreamUrl = `${backendUrl}/api/documents/${params.id}/files/${params.fileId}/stream`;

    const response = await fetch(
      backendStreamUrl,
      {
        method: "GET",
        headers: {
          ...(cookies && { Cookie: cookies }),
        },
        credentials: "include",
      }
    );

    if (!response.ok || !response.body) {
      const errorPayload = await response.json().catch(() => ({
        error: { message: "Failed to stream file" },
      }));

      console.error(
        "Document stream proxy failed",
        backendStreamUrl,
        response.status,
        errorPayload
      );

      return NextResponse.json(
        {
          success: false,
          error: errorPayload.error || { message: "Failed to stream file" },
        },
        { status: response.status || 500 }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const originalDisposition = response.headers.get("content-disposition");
    const filename = extractFilename(originalDisposition);
  const finalDisposition = `${wantDownload ? "attachment" : "inline"}; filename="${filename}"`;

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", finalDisposition);
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("X-Frame-Options", "SAMEORIGIN");

    const frameAncestors = new Set<string>(["'self'"]);
    const candidateOrigins = [
      process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, ""),
      process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, ""),
    ];

    for (const origin of candidateOrigins) {
      if (origin) {
        frameAncestors.add(origin);
      }
    }

    headers.set(
      "Content-Security-Policy",
      `default-src 'self'; frame-ancestors ${Array.from(frameAncestors).join(" ")}`
    );

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error: any) {
    console.error("Error streaming document file:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
