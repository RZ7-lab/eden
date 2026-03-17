// Notion integration — fetch recent pages and write to ~/.eden/external/notion.md

import fs from 'node:fs';
import { ensureExternalDir, EXTERNAL_DIR } from './external.js';
import path from 'node:path';

interface NotionPage {
  id: string;
  title: string;
  lastEdited: string;
  url: string;
}

interface NotionSearchResponse {
  results: Array<{
    id: string;
    url: string;
    last_edited_time: string;
    properties?: Record<string, unknown>;
    // page with title in various property shapes
    [key: string]: unknown;
  }>;
  has_more: boolean;
}

function extractTitle(page: NotionSearchResponse['results'][0]): string {
  const props = page.properties;
  if (!props) return 'Untitled';

  // Try common title property names
  for (const key of ['Name', 'Title', 'title', 'name', '名称', '标题']) {
    const prop = props[key] as { title?: Array<{ plain_text?: string }> } | undefined;
    if (prop?.title && Array.isArray(prop.title) && prop.title.length > 0) {
      return prop.title.map(t => t.plain_text || '').join('');
    }
  }

  // Fallback: try first property that has a title array
  for (const val of Object.values(props)) {
    const p = val as { type?: string; title?: Array<{ plain_text?: string }> };
    if (p?.type === 'title' && Array.isArray(p.title)) {
      return p.title.map(t => t.plain_text || '').join('');
    }
  }

  return 'Untitled';
}

export async function syncNotion(notionToken: string): Promise<{ pages: number; outputPath: string }> {
  // Search for recently edited pages
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 50,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API error ${response.status}: ${text}`);
  }

  const data = await response.json() as NotionSearchResponse;

  // Filter to pages edited in last 7 days
  const recentPages: NotionPage[] = data.results
    .filter(p => p.last_edited_time >= sevenDaysAgo)
    .map(p => ({
      id: p.id,
      title: extractTitle(p),
      lastEdited: p.last_edited_time,
      url: p.url,
    }));

  // Build markdown summary
  const lines: string[] = [
    '# Notion — Recent Pages',
    '',
    `Synced: ${new Date().toISOString().slice(0, 16)}`,
    `Pages edited in last 7 days: ${recentPages.length}`,
    '',
  ];

  if (recentPages.length === 0) {
    lines.push('No recently edited pages found.');
  } else {
    for (const page of recentPages) {
      const edited = page.lastEdited.slice(0, 10);
      lines.push(`- **${page.title}** (edited ${edited})`);
    }
  }

  // Optionally fetch block content for top 5 pages
  const topPages = recentPages.slice(0, 5);
  for (const page of topPages) {
    try {
      const blocks = await fetchPageBlocks(notionToken, page.id);
      if (blocks.length > 0) {
        lines.push('');
        lines.push(`## ${page.title}`);
        lines.push('');
        for (const block of blocks.slice(0, 30)) { // limit blocks
          lines.push(block);
        }
      }
    } catch {
      // skip pages we can't read
    }
  }

  // Write to external dir
  ensureExternalDir();
  const outputPath = path.join(EXTERNAL_DIR, 'notion.md');
  fs.writeFileSync(outputPath, lines.join('\n'));

  return { pages: recentPages.length, outputPath };
}

interface BlockResponse {
  results: Array<{
    type: string;
    [key: string]: unknown;
  }>;
}

interface RichText {
  plain_text?: string;
}

async function fetchPageBlocks(token: string, pageId: string): Promise<string[]> {
  const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (!response.ok) return [];

  const data = await response.json() as BlockResponse;
  const lines: string[] = [];

  for (const block of data.results) {
    const content = block[block.type] as { rich_text?: RichText[] } | undefined;
    if (!content?.rich_text) continue;

    const text = content.rich_text.map(t => t.plain_text || '').join('');
    if (!text) continue;

    switch (block.type) {
      case 'heading_1':
        lines.push(`### ${text}`);
        break;
      case 'heading_2':
        lines.push(`#### ${text}`);
        break;
      case 'heading_3':
        lines.push(`##### ${text}`);
        break;
      case 'bulleted_list_item':
        lines.push(`- ${text}`);
        break;
      case 'numbered_list_item':
        lines.push(`1. ${text}`);
        break;
      case 'to_do': {
        const todo = block[block.type] as { checked?: boolean };
        lines.push(`- [${todo.checked ? 'x' : ' '}] ${text}`);
        break;
      }
      case 'paragraph':
        lines.push(text);
        break;
      default:
        lines.push(text);
    }
  }

  return lines;
}
