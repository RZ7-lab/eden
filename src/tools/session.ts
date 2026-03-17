// 会话追踪 — Eden 记住每次工具使用

import fs from 'node:fs';
import path from 'node:path';
import { EDEN_DIR } from '../persistence/config.js';
import { perceiveGit } from '../perception/git.js';

const SESSIONS_PATH = path.join(EDEN_DIR, 'sessions.json');

export interface ToolSession {
  id: string;
  toolId: string;
  workDir: string;
  prompt?: string;
  startedAt: number;
  endedAt?: number;
  gitBefore?: string;        // commit hash before
  gitAfter?: string;         // commit hash after
  filesChanged?: string[];
  summary?: string;          // Eden 对这次会话的总结
}

export function loadSessions(): ToolSession[] {
  try {
    const raw = fs.readFileSync(SESSIONS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ToolSession[]): void {
  // 只保留最近 50 个会话
  const trimmed = sessions.slice(-50);
  fs.writeFileSync(SESSIONS_PATH, JSON.stringify(trimmed, null, 2));
}

export async function createSession(toolId: string, workDir: string, prompt?: string): Promise<ToolSession> {
  let gitBefore: string | undefined;
  try {
    const git = await perceiveGit(workDir);
    if (git.isRepo && git.recentCommits.length > 0) {
      gitBefore = git.recentCommits[0].hash;
    }
  } catch {}

  return {
    id: `session_${Date.now()}`,
    toolId,
    workDir,
    prompt,
    startedAt: Date.now(),
    gitBefore,
  };
}

export async function closeSession(session: ToolSession): Promise<ToolSession> {
  session.endedAt = Date.now();

  try {
    const git = await perceiveGit(session.workDir);
    if (git.isRepo && git.recentCommits.length > 0) {
      session.gitAfter = git.recentCommits[0].hash;
    }
    if (git.hasUncommitted) {
      session.filesChanged = git.uncommittedFiles;
    }
  } catch {}

  // 保存
  const sessions = loadSessions();
  sessions.push(session);
  saveSessions(sessions);

  return session;
}

// 给 Eden 用的会话摘要
export function recentSessionsContext(n: number = 5): string {
  const sessions = loadSessions().slice(-n);
  if (sessions.length === 0) return '（还没有工具使用记录）';

  return sessions.map(s => {
    const time = new Date(s.startedAt).toLocaleString('zh-CN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const duration = s.endedAt ? Math.round((s.endedAt - s.startedAt) / 1000 / 60) : '?';
    const dir = shortenPath(s.workDir);
    const changes = s.filesChanged ? `, 改了 ${s.filesChanged.length} 个文件` : '';
    return `[${time}] ${s.toolId} @ ${dir}, ${duration}分钟${changes}${s.prompt ? ` — "${s.prompt}"` : ''}`;
  }).join('\n');
}

function shortenPath(p: string): string {
  const home = process.env.HOME || '';
  if (p.startsWith(home)) return '~' + p.slice(home.length);
  return p;
}
