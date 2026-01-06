import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    const res = await fetch(
      getApiUrl(`/api/documents/${id}/files/${fileId}`),
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || "Failed to replace document file" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error replacing document file:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
