import { NextRequest } from "next/server";

/**
 * GET /api/documents/:id/files/:fileId/download
 * Downloads a document file from the backend
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const cookies = request.headers.get("cookie");

    const backendDownloadUrl = `${backendUrl}/api/documents/${params.id}/files/${params.fileId}/download`;

    const response = await fetch(
      backendDownloadUrl,
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
        error: { message: "Failed to download file" },
      }));

      console.error(
        "Document download proxy failed",
        backendDownloadUrl,
        response.status,
        errorPayload
      );

      return Response.json(
        {
          success: false,
          error: errorPayload.error || { message: "Failed to download file" },
        },
        { status: response.status || 500 }
      );
    }

    // Get the content type and disposition from the response
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition");
    const contentLength = response.headers.get("content-length");

    // Create new headers for response
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    }
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    headers.set("Cache-Control", "private, max-age=3600");

    // Return the file content directly to trigger download
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error: any) {
    console.error("Error downloading document file:", error);
    return Response.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}