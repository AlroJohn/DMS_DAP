import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get('accessToken')?.value;

  if (!accessToken) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json({ success: false, error: data.error || 'Failed to fetch dashboard stats' }, { status: backendResponse.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
