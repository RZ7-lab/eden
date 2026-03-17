// External context — users or tools can drop files here for Eden to read
// Reads all .md and .txt files from ~/.eden/external/

import fs from 'node:fs';
import path from 'node:path';
import { EDEN_DIR } from '../persistence/config.js';

export const EXTERNAL_DIR = path.join(EDEN_DIR, 'external');

export interface ExternalSource {
  name: string;       // filename without extension
  content: string;    // file contents
  updatedAt: number;  // file mtime
}

export interface ExternalContext {
  sources: ExternalSource[];
}

export function ensureExternalDir(): void {
  if (!fs.existsSync(EXTERNAL_DIR)) {
    fs.mkdirSync(EXTERNAL_DIR, { recursive: true });
  }
}

export function loadExternalContext(): ExternalContext {
  if (!fs.existsSync(EXTERNAL_DIR)) {
    return { sources: [] };
  }

  const files = fs.readdirSync(EXTERNAL_DIR).filter(f =>
    f.endsWith('.md') || f.endsWith('.txt')
  );

  const sources: ExternalSource[] = [];

  for (const file of files) {
    const filePath = path.join(EXTERNAL_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(file);
      sources.push({
        name: path.basename(file, ext),
        content: content.trim(),
        updatedAt: stat.mtimeMs,
      });
    } catch {
      // skip unreadable files
    }
  }

  // sort by most recently updated
  sources.sort((a, b) => b.updatedAt - a.updatedAt);

  return { sources };
}

export function externalContextSummary(): string {
  const ctx = loadExternalContext();
  if (ctx.sources.length === 0) return '';

  const parts: string[] = [];
  for (const source of ctx.sources) {
    const age = Math.floor((Date.now() - source.updatedAt) / 86400000);
    const ageStr = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age}d ago`;
    // Truncate very long content
    const content = source.content.length > 2000
      ? source.content.slice(0, 2000) + '\n...(truncated)'
      : source.content;
    parts.push(`[${source.name}] (updated ${ageStr})\n${content}`);
  }

  return parts.join('\n\n');
}
