import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest) {
  try {
    const cookies = req.headers.get("cookie");
    const { documentIds } = await req.json();

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const backendResponse = await fetch(`${backendUrl}/api/documents/bulk-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { Cookie: cookies }),
      },
      credentials: "include",
      body: JSON.stringify({ documentIds }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json({ error: data.error || { message: 'Failed to delete documents' } }, { status: backendResponse.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: { message: 'An unexpected error occurred' } }, { status: 500 });
  }
}
