// Web Dashboard — eden me 打开浏览器看你的 AI 身份

import http from 'node:http';
import os from 'node:os';
import { exec } from 'node:child_process';
import { loadUserProfile, scanUserProjects } from '../perception/deep-read.js';
import { loadExternalContext } from '../perception/external.js';
import { loadState, loadMemories } from '../persistence/store.js';
import { loadSessions } from '../tools/session.js';
import { MemoryStore } from '../mind/memory.js';
import fs from 'node:fs';
import path from 'node:path';

export function startDashboardServer(): void {
  const data = collectDashboardData();
  const html = renderHTML(data);

  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(0, '127.0.0.1', () => {
    const addr = server.address();
    if (addr && typeof addr !== 'string') {
      const url = `http://127.0.0.1:${addr.port}`;
      console.log(`  打开 ${url}`);

      // 打开浏览器
      const cmd = process.platform === 'darwin' ? 'open' :
        process.platform === 'win32' ? 'start' : 'xdg-open';
      exec(`${cmd} ${url}`);

      // 30 秒后自动关闭
      setTimeout(() => { server.close(); process.exit(0); }, 30000);
    }
  });
}

interface DashboardData {
  languages: Array<{ name: string; count: number }>;
  frameworks: string[];
  activeProjects: Array<{ name: string; description: string; language: string; size: string }>;
  dormantProjects: Array<{ name: string; days: number }>;
  memories: {
    preferences: string[];
    patterns: string[];
    decisions: string[];
    observations: string[];
  };
  sessions: Array<{ tool: string; summary: string; when: string }>;
  toolCounts: Record<string, number>;
  external: Array<{ name: string; lines: number }>;
  connections: { claudeCode: boolean; cursor: boolean };
  stats: { memories: number; sessions: number; projects: number; age: number };
  edenName: string;
}

function collectDashboardData(): DashboardData {
  let profile = loadUserProfile();
  if (!profile) profile = scanUserProjects();

  const memories = new MemoryStore();
  memories.load(loadMemories());
  const sessions = loadSessions();
  const state = loadState();
  const external = loadExternalContext();
  const home = os.homedir();

  const allMem = memories.recent(100);

  const toolCounts: Record<string, number> = {};
  for (const s of sessions) {
    toolCounts[s.toolId] = (toolCounts[s.toolId] || 0) + 1;
  }

  const claudeConnected = (() => {
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf-8'));
      if (cfg.mcpServers?.eden) return true;
      for (const p of Object.values(cfg.projects || {})) {
        if ((p as Record<string, unknown>).mcpServers && (((p as Record<string, unknown>).mcpServers) as Record<string, unknown>).eden) return true;
      }
      return false;
    } catch { return false; }
  })();

  return {
    languages: Object.entries(profile.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count })),
    frameworks: profile.frameworks,
    activeProjects: profile.projects
      .filter(p => Date.now() - p.lastActivity < 7 * 86400000)
      .slice(0, 6)
      .map(p => ({ name: p.name, description: p.description || '', language: p.language, size: p.size })),
    dormantProjects: profile.projects
      .filter(p => Date.now() - p.lastActivity >= 7 * 86400000)
      .slice(0, 5)
      .map(p => ({ name: p.name, days: Math.floor((Date.now() - p.lastActivity) / 86400000) })),
    memories: {
      preferences: allMem.filter(m => m.content.includes('[preference]')).slice(-5).map(m => m.content.replace('[preference] ', '')),
      patterns: allMem.filter(m => m.content.includes('[pattern]')).slice(-5).map(m => m.content.replace('[pattern] ', '')),
      decisions: allMem.filter(m => m.content.includes('[decision]')).slice(-5).map(m => m.content.replace('[decision] ', '')),
      observations: allMem.filter(m => !m.content.startsWith('[')).slice(-5).map(m => m.content.length > 100 ? m.content.slice(0, 100) + '...' : m.content),
    },
    sessions: sessions.slice(-5).reverse().map(s => ({
      tool: s.toolId,
      summary: s.summary || '',
      when: timeAgo(s.startedAt),
    })),
    toolCounts,
    external: external.sources.map(s => ({ name: s.name, lines: s.content.split('\n').length })),
    connections: {
      claudeCode: claudeConnected,
      cursor: fs.existsSync(path.join(home, '.cursor', 'mcp.json')),
    },
    stats: {
      memories: memories.count,
      sessions: sessions.length,
      projects: profile.projects.length,
      age: state ? Math.floor((Date.now() - state.createdAt) / 86400000) : 0,
    },
    edenName: state?.name || 'Eden',
  };
}

function renderHTML(d: DashboardData): string {
  const langBars = d.languages.map(l => {
    const max = d.languages[0]?.count || 1;
    const pct = Math.round((l.count / max) * 100);
    return `<div class="bar-row"><span class="bar-label">${esc(l.name)}</span><div class="bar" style="width:${pct}%"></div><span class="bar-count">${l.count}</span></div>`;
  }).join('');

  const activeProjs = d.activeProjects.map(p =>
    `<div class="project active"><span class="dot green"></span><strong>${esc(p.name)}</strong>${p.description ? `<span class="desc"> — ${esc(p.description.slice(0, 50))}</span>` : ''}<span class="tag">${esc(p.language)}</span></div>`
  ).join('');

  const dormantProjs = d.dormantProjects.map(p =>
    `<div class="project dormant"><span class="dot gray"></span>${esc(p.name)}<span class="days">${p.days}天未动</span></div>`
  ).join('');

  const memSections = [
    d.memories.preferences.length > 0 ? `<div class="mem-cat"><h4>偏好</h4>${d.memories.preferences.map(m => `<p>${esc(m)}</p>`).join('')}</div>` : '',
    d.memories.patterns.length > 0 ? `<div class="mem-cat"><h4>模式</h4>${d.memories.patterns.map(m => `<p>${esc(m)}</p>`).join('')}</div>` : '',
    d.memories.decisions.length > 0 ? `<div class="mem-cat"><h4>决定</h4>${d.memories.decisions.map(m => `<p>${esc(m)}</p>`).join('')}</div>` : '',
    d.memories.observations.length > 0 ? `<div class="mem-cat"><h4>观察</h4>${d.memories.observations.map(m => `<p>${esc(m)}</p>`).join('')}</div>` : '',
  ].filter(Boolean).join('');

  const connections = [
    `<span class="conn ${d.connections.claudeCode ? 'on' : 'off'}">Claude Code</span>`,
    `<span class="conn ${d.connections.cursor ? 'on' : 'off'}">Cursor</span>`,
  ].join('');

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.edenName)} — Eden</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif;
    background: #0a0a0a; color: #e0e0e0;
    max-width: 640px; margin: 0 auto; padding: 40px 24px;
    line-height: 1.6;
  }
  h1 { font-size: 14px; font-weight: 400; color: #666; margin-bottom: 4px; }
  h2 { font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 32px 0 12px; }
  h3 { font-size: 24px; font-weight: 300; color: #fff; margin-bottom: 24px; }
  h4 { font-size: 12px; color: #666; margin-bottom: 6px; }
  .frameworks { color: #666; font-size: 13px; margin-bottom: 20px; }
  .bar-row { display: flex; align-items: center; margin: 4px 0; }
  .bar-label { width: 90px; font-size: 13px; color: #999; }
  .bar { height: 4px; background: #3b82f6; border-radius: 2px; min-width: 2px; transition: width 0.3s; }
  .bar-count { font-size: 12px; color: #555; margin-left: 8px; }
  .project { padding: 8px 0; font-size: 14px; }
  .project strong { color: #fff; }
  .project .desc { color: #666; font-size: 13px; }
  .project .tag { font-size: 11px; color: #3b82f6; background: #3b82f611; padding: 2px 6px; border-radius: 3px; margin-left: 8px; }
  .project .days { color: #555; font-size: 12px; margin-left: 8px; }
  .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 8px; }
  .dot.green { background: #22c55e; }
  .dot.gray { background: #333; }
  .dormant { color: #555; }
  .mem-cat { margin-bottom: 16px; }
  .mem-cat p { font-size: 13px; color: #999; padding: 2px 0; }
  .conn { font-size: 13px; padding: 4px 12px; border-radius: 12px; margin-right: 8px; }
  .conn.on { background: #22c55e22; color: #22c55e; }
  .conn.off { background: #33333366; color: #555; }
  .stats { display: flex; gap: 24px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #1a1a1a; }
  .stat { text-align: center; }
  .stat .num { font-size: 24px; font-weight: 300; color: #fff; }
  .stat .label { font-size: 11px; color: #555; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1a; color: #333; font-size: 12px; text-align: center; }
</style>
</head>
<body>

<h1>EDEN</h1>
<h3>AI 工具眼中的你</h3>

<h2>技术</h2>
${langBars}
<p class="frameworks">${d.frameworks.join(' · ')}</p>

<h2>项目</h2>
${activeProjs}
${dormantProjs}

${memSections ? `<h2>Eden 记住了</h2>${memSections}` : ''}

<h2>连接</h2>
<div style="margin:8px 0">${connections}</div>

${d.external.length > 0 ? `<h2>外部数据</h2>${d.external.map(e => `<p style="font-size:13px;color:#666">${esc(e.name)} — ${e.lines} 行</p>`).join('')}` : ''}

<div class="stats">
  <div class="stat"><div class="num">${d.stats.projects}</div><div class="label">项目</div></div>
  <div class="stat"><div class="num">${d.stats.memories}</div><div class="label">记忆</div></div>
  <div class="stat"><div class="num">${d.stats.sessions}</div><div class="label">会话</div></div>
  <div class="stat"><div class="num">${d.stats.age}</div><div class="label">天</div></div>
</div>

<div class="footer">
  这是 AI 工具通过 Eden 了解到的你。<br>
  数据存储在本地 ~/.eden/ · 你可以随时删除。
</div>

</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}
