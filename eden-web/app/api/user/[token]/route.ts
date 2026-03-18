import { NextRequest, NextResponse } from 'next/server';
import { loadUserData } from '@/lib/storage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadUserData(token);
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}
