import { NextRequest, NextResponse } from 'next/server';
import { saveUserData } from '@/lib/storage';
import type { SyncData } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const data: SyncData = await req.json();
    if (!data.deviceToken) {
      return NextResponse.json({ error: 'Missing deviceToken' }, { status: 400 });
    }
    await saveUserData(data.deviceToken, data);
    return NextResponse.json({ ok: true, syncedAt: Date.now() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
