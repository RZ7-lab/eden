// Dashboard — 让用户看到 Eden 眼中的自己

import chalk from 'chalk';
import os from 'node:os';
import { loadUserProfile, scanUserProjects, profileToContext } from '../perception/deep-read.js';
import { loadExternalContext } from '../perception/external.js';
import { loadState, loadMemories } from '../persistence/store.js';
import { loadSessions } from '../tools/session.js';
import { MemoryStore } from '../mind/memory.js';
import { EDEN_DIR } from '../persistence/config.js';
import fs from 'node:fs';
import path from 'node:path';

export function showDashboard(): void {
  let profile = loadUserProfile();
  if (!profile) profile = scanUserProjects();

  const memories = new MemoryStore();
  memories.load(loadMemories());

  const sessions = loadSessions();
  const state = loadState();
  const external = loadExternalContext();

  const home = os.homedir();
  const shorten = (p: string) => p.startsWith(home) ? '~' + p.slice(home.length) : p;

  console.log();
  console.log(chalk.dim('─'.repeat(50)));
  console.log(chalk.bold('  Eden 眼中的你'));
  console.log(chalk.dim('─'.repeat(50)));

  // === 技术身份 ===
  console.log();
  const topLangs = Object.entries(profile.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => `${chalk.cyan(lang)}(${count})`)
    .join(' · ');
  console.log(`  ${topLangs}`);

  if (profile.frameworks.length > 0) {
    console.log(`  ${chalk.dim(profile.frameworks.join(' · '))}`);
  }

  // === 项目 ===
  console.log();
  console.log(chalk.bold('  项目'));

  const active = profile.projects
    .filter(p => Date.now() - p.lastActivity < 7 * 24 * 60 * 60 * 1000);
  const dormant = profile.projects
    .filter(p => Date.now() - p.lastActivity >= 7 * 24 * 60 * 60 * 1000);

  for (const p of active.slice(0, 5)) {
    const desc = p.description ? chalk.dim(` — ${p.description.slice(0, 40)}`) : '';
    console.log(`  ${chalk.green('●')} ${chalk.cyan(p.name)}${desc}`);
  }
  for (const p of dormant.slice(0, 3)) {
    const days = Math.floor((Date.now() - p.lastActivity) / 86400000);
    console.log(`  ${chalk.dim('○')} ${chalk.dim(`${p.name} (${days}天)`)}`);
  }

  // === 记忆 ===
  console.log();
  console.log(chalk.bold('  Eden 记住了'));

  const prefs = memories.recent(100).filter(m => m.content.includes('[preference]'));
  const patterns = memories.recent(100).filter(m => m.content.includes('[pattern]'));
  const decisions = memories.recent(100).filter(m => m.content.includes('[decision]'));
  const observations = memories.recent(100).filter(m => !m.content.startsWith('['));

  if (prefs.length > 0) {
    console.log(`  ${chalk.yellow('偏好')} ${prefs.length} 条`);
    for (const m of prefs.slice(-3)) {
      console.log(`    ${chalk.dim(m.content.replace('[preference] ', ''))}`);
    }
  }
  if (patterns.length > 0) {
    console.log(`  ${chalk.yellow('模式')} ${patterns.length} 条`);
    for (const m of patterns.slice(-3)) {
      console.log(`    ${chalk.dim(m.content.replace('[pattern] ', ''))}`);
    }
  }
  if (decisions.length > 0) {
    console.log(`  ${chalk.yellow('决定')} ${decisions.length} 条`);
    for (const m of decisions.slice(-2)) {
      console.log(`    ${chalk.dim(m.content.replace('[decision] ', ''))}`);
    }
  }
  if (observations.length > 0) {
    console.log(`  ${chalk.yellow('观察')} ${observations.length} 条`);
    for (const m of observations.slice(-3)) {
      const short = m.content.length > 60 ? m.content.slice(0, 60) + '...' : m.content;
      console.log(`    ${chalk.dim(short)}`);
    }
  }

  if (memories.count === 0) {
    console.log(chalk.dim('  还没有记忆。用 AI 工具时它们会帮 Eden 记住。'));
  }

  // === 工具使用 ===
  if (sessions.length > 0) {
    console.log();
    console.log(chalk.bold('  工具使用'));

    // 统计
    const toolCounts: Record<string, number> = {};
    for (const s of sessions) {
      toolCounts[s.toolId] = (toolCounts[s.toolId] || 0) + 1;
    }
    const toolLine = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tool, count]) => `${tool}(${count})`)
      .join(' · ');
    console.log(`  ${chalk.dim(toolLine)}`);

    // 最近的会话
    const recent = sessions.slice(-3);
    for (const s of recent) {
      const when = timeAgo(s.startedAt);
      const summary = s.summary ? ` — ${s.summary.slice(0, 50)}` : '';
      console.log(`  ${chalk.dim(`${when} ${s.toolId}${summary}`)}`);
    }
  }

  // === 外部数据 ===
  if (external.sources.length > 0) {
    console.log();
    console.log(chalk.bold('  外部数据'));
    for (const s of external.sources) {
      const when = timeAgo(s.updatedAt);
      const lines = s.content.split('\n').length;
      console.log(`  ${chalk.dim(`${s.name} — ${lines} 行 — ${when}`)}`);
    }
  }

  // === 连接状态 ===
  console.log();
  console.log(chalk.bold('  连接'));

  // 检查哪些工具连了 Eden MCP
  const claudeConnected = checkClaudeCodeConnected();
  const cursorConnected = fs.existsSync(path.join(home, '.cursor', 'mcp.json'));

  console.log(`  ${claudeConnected ? chalk.green('●') : chalk.red('○')} Claude Code`);
  console.log(`  ${cursorConnected ? chalk.green('●') : chalk.red('○')} Cursor`);

  // === 统计 ===
  console.log();
  console.log(chalk.dim(`  ${memories.count} 条记忆 · ${sessions.length} 次工具使用 · ${profile.projects.length} 个项目`));
  if (state) {
    const age = Math.floor((Date.now() - state.createdAt) / 86400000);
    console.log(chalk.dim(`  Eden 陪了你 ${age} 天`));
  }

  console.log();
  console.log(chalk.dim('─'.repeat(50)));
  console.log(chalk.dim('  这就是 AI 工具调用 eden_get_user 时看到的你。'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log();
}

function checkClaudeCodeConnected(): boolean {
  try {
    const configPath = path.join(os.homedir(), '.claude.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // 检查 user 级别的 MCP
    if (config.mcpServers?.eden) return true;
    // 检查 projects 里的
    for (const proj of Object.values(config.projects || {})) {
      if ((proj as Record<string, unknown>).mcpServers && (((proj as Record<string, unknown>).mcpServers) as Record<string, unknown>).eden) return true;
    }
    return false;
  } catch {
    return false;
  }
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
