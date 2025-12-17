import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/utils";
import { cookies } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const res = await fetch(getApiUrl(`/api/files/${fileId}/checkout`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to checkout file" },
          { status: res.status }
        );
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error("Error checking out file:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

