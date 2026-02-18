import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/utils";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(getApiUrl(`/api/documents/${id}/files`), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch document files" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching document files:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    let backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    if (backendUrl.endsWith("/api")) {
      backendUrl = backendUrl.slice(0, -4);
    }

    const cookiesHeader = request.headers.get("cookie");
    const formData = await request.formData();

    const response = await fetch(`${backendUrl}/api/documents/${id}/files`, {
      method: "POST",
      headers: {
        ...(cookiesHeader && { Cookie: cookiesHeader }),
      },
      credentials: "include",
      body: formData,
    });

    const data = await response.json().catch(() => ({
      success: false,
      error: { message: "Failed to upload document file" },
    }));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || { message: "Failed to upload document file" },
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Error uploading document file:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error.message || "Internal server error" },
      },
      { status: 500 }
    );
  }
}
