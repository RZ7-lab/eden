import { put, list, del } from '@vercel/blob';
import type { SyncData } from './types';

export async function saveUserData(token: string, data: SyncData): Promise<void> {
  // 先删旧的
  try {
    const existing = await list({ prefix: `eden-${token}` });
    for (const blob of existing.blobs) {
      await del(blob.url);
    }
  } catch {}

  // 写新的
  await put(`eden-${token}`, JSON.stringify(data), {
    access: 'private',
    contentType: 'application/json',
  });
}

export async function loadUserData(token: string): Promise<SyncData | null> {
  try {
    const result = await list({ prefix: `eden-${token}` });
    if (result.blobs.length === 0) return null;

    const latest = result.blobs.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const response = await fetch(latest.url, {
      headers: blobToken ? { 'Authorization': `Bearer ${blobToken}` } : {},
    });
    if (!response.ok) return null;

    return await response.json() as SyncData;
  } catch {
    return null;
  }
}
