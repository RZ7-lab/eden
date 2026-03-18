import { NextRequest, NextResponse } from 'next/server';
import { loadUserData, saveUserData } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const data = await loadUserData(token);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const search = req.nextUrl.searchParams.get('search')?.toLowerCase();
  const type = req.nextUrl.searchParams.get('type');

  let memories = data.memories;

  if (type) {
    const tagMap: Record<string, string> = {
      preference: '[preference]',
      pattern: '[pattern]',
      decision: '[decision]',
    };
    const tag = tagMap[type];
    if (tag) {
      memories = memories.filter(m => m.content.includes(tag));
    } else {
      memories = memories.filter(m => m.type === type);
    }
  }

  if (search) {
    memories = memories.filter(m => m.content.toLowerCase().includes(search));
  }

  return NextResponse.json({ memories: memories.slice(-50).reverse() });
}

export async function DELETE(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const id = req.nextUrl.searchParams.get('id');
  if (!token || !id) return NextResponse.json({ error: 'Missing token or id' }, { status: 400 });

  const data = await loadUserData(token);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const before = data.memories.length;
  data.memories = data.memories.filter(m => m.id !== id);

  if (data.memories.length === before) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
  }

  await saveUserData(token, data);
  return NextResponse.json({ ok: true, remaining: data.memories.length });
}
