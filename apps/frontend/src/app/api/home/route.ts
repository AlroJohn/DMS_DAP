import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/home-cms`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();

    // Return with explicit no-cache headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("Error fetching CMS content:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch CMS content" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.cookies.get("accessToken")?.value;

    console.log("Frontend API Route - Token check:", {
      hasToken: !!token,
      tokenLength: token?.length,
      cookies: request.cookies.getAll().map(c => c.name)
    });

    if (!token) {
      console.log("No token found in cookies");
      return NextResponse.json(
        { success: false, message: "Unauthorized - No token found" },
        { status: 401 }
      );
    }

    console.log("Making request to backend:", `${API_URL}/api/home-cms`);
    
    const response = await fetch(`${API_URL}/api/home-cms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log("Backend response:", {
      status: response.status,
      ok: response.ok,
      data
    });

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error saving CMS content:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save CMS content" },
      { status: 500 }
    );
  }
}
