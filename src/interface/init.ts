// 初始化 — 第一次见面，尽可能少问问题

import readline from 'node:readline';
import chalk from 'chalk';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { ensureEdenDir, loadConfig, saveConfig } from '../persistence/config.js';
import { loadState, saveState, saveMemories } from '../persistence/store.js';
import { scanUserProjects } from '../perception/deep-read.js';
import type { UserProfile } from '../perception/deep-read.js';
import { detectTools } from '../tools/registry.js';
import { autoConnectAll, getMcpEntryPath } from '../tools/auto-connect.js';

export async function runInit(): Promise<void> {
  const existing = loadState();
  if (existing) {
    console.log();
    console.log(chalk.yellow(`  ${existing.name} 已经存在。`));
    const answer = await ask('  重新开始？(y/N) ');
    if (answer.toLowerCase() !== 'y') return;
    console.log();
  }

  ensureEdenDir();

  // ===== 扫描 =====
  console.log();
  console.log(chalk.dim('  扫描你的环境...'));
  await sleep(500);

  const profile = scanUserProjects();

  const topLangs = Object.entries(profile.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  const activeProjects = profile.projects
    .filter(p => Date.now() - p.lastActivity < 7 * 24 * 60 * 60 * 1000)
    .slice(0, 3);

  const dormantProjects = profile.projects
    .filter(p => Date.now() - p.lastActivity >= 7 * 24 * 60 * 60 * 1000)
    .slice(0, 2);

  console.log();
  console.log(`  ${chalk.cyan(String(profile.projects.length))} 个项目，主要写 ${chalk.cyan(topLangs.join('、'))}。`);

  if (profile.frameworks.length > 0) {
    console.log(`  ${chalk.cyan(profile.frameworks.slice(0, 5).join(' · '))}`);
  }

  if (activeProjects.length > 0) {
    console.log(`  最近在忙 ${chalk.cyan(activeProjects.map(p => p.name).join('、'))}`);
  }

  if (dormantProjects.length > 0) {
    const names = dormantProjects.map(p => {
      const days = Math.floor((Date.now() - p.lastActivity) / 1000 / 60 / 60 / 24);
      return `${p.name}(${days}天)`;
    });
    console.log(chalk.dim(`  沉睡 ${names.join('、')}`));
  }

  // ===== 连接工具（自动，不问） =====
  console.log();
  // 自动连接所有检测到的工具
  const results = autoConnectAll();

  for (const r of results) {
    if (r.success) {
      console.log(`  ${chalk.green('✓')} ${r.tool} ${chalk.dim(`→ ${r.detail}`)}`);
    } else {
      console.log(`  ${chalk.red('✗')} ${r.tool}`);
    }
  }

  if (results.length === 0) {
    console.log(chalk.dim('  未检测到支持的 AI 工具。'));
  }

  // 显示未安装的工具
  const tools = detectTools();
  const connectedIds = results.map(r => r.tool.toLowerCase());
  const unconnected = tools.filter(t => !t.available && !connectedIds.includes(t.name.toLowerCase()));
  if (unconnected.length > 0) {
    console.log(chalk.dim(`  未安装 ${unconnected.map(t => t.name).join('、')}`));
  }

  // ===== 保存 =====
  saveState({
    name: 'Eden',
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  });

  saveMemories([{
    id: 'mem_birth',
    type: 'milestone',
    content: `初始化。${profile.projects.length} 个项目，${topLangs.join('/')}，${profile.frameworks.slice(0, 3).join('/')}。`,
    timestamp: Date.now(),
    location: os.homedir(),
    priority: 5,
  }]);

  // ===== Device token（自动生成） =====
  const config = loadConfig();
  if (!config.deviceToken) {
    const { randomUUID } = await import('node:crypto');
    config.deviceToken = randomUUID();
    saveConfig(config);
  }

  // ===== 自动同步到云端 =====
  const syncUrl = config.syncUrl || 'https://eden-me.vercel.app';
  try {
    const fs = await import('node:fs');
    const { PROFILE_PATH } = await import('../persistence/config.js');
    let profileData = { languages: {}, frameworks: [], projects: [], lastScanned: 0 };
    try { profileData = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8')); } catch {}

    await fetch(`${syncUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceToken: config.deviceToken,
        state: { name: 'Eden', createdAt: Date.now(), lastActiveAt: Date.now() },
        profile: profileData,
        memories: [{
          id: 'mem_birth',
          type: 'milestone',
          content: `初始化。${profile.projects.length} 个项目，${topLangs.join('/')}，${profile.frameworks.slice(0, 3).join('/')}。`,
          timestamp: Date.now(),
          location: os.homedir(),
          priority: 5,
        }],
        sessions: [],
        firstRun: true,
        syncedAt: Date.now(),
      }),
    });
    config.syncUrl = syncUrl;
    saveConfig(config);
  } catch { /* 静默失败，不影响 init */ }

  // ===== API key（可选） =====
  if (!config.apiKey) {
    console.log();
    console.log(chalk.dim('  Claude API key 让 Eden 能自己思考（可选）'));
    const key = await ask(chalk.dim('  API Key（回车跳过）：'));
    if (key.trim()) {
      config.apiKey = key.trim();
      saveConfig(config);
      console.log(chalk.dim('  已保存。'));
    }
  }

  // ===== First Glimpse =====
  console.log();
  console.log(chalk.dim('  ──────────────────────────────────────────────────'));
  console.log(`  ${chalk.cyan('Eden')} 已就绪。这是它对你的第一印象：`);
  console.log(chalk.dim('  ──────────────────────────────────────────────────'));
  console.log();
  console.log(`  ${generateFirstGlimpse(profile, topLangs, activeProjects, dormantProjects)}`);
  console.log();
  console.log(chalk.dim('  试试看：'));
  console.log(chalk.dim('  · 打开 Claude Code，问它"你了解我吗"'));
  console.log(chalk.dim('  · 运行 ') + chalk.cyan('eden me') + chalk.dim(' 看完整画像'));
  console.log(chalk.dim('  · 运行 ') + chalk.cyan('eden report') + chalk.dim(' 看本周洞察'));
  // 自动打开浏览器 Dashboard
  if (config.deviceToken) {
    const dashUrl = `${syncUrl}/me?token=${config.deviceToken}`;
    console.log(chalk.dim('  · 正在打开在线 Dashboard...'));
    try {
      const { exec: execCmd } = await import('node:child_process');
      const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      execCmd(`${openCmd} "${dashUrl}"`);
    } catch {}
  }

  // ===== MCP 验证 =====
  const connectedClaudeCode = results.some(r => r.tool === 'Claude Code' && r.success);
  if (connectedClaudeCode) {
    try {
      const mcpEntry = getMcpEntryPath();
      const testPayload = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}';
      const result = execSync(
        `echo '${testPayload}' | node ${mcpEntry} 2>/dev/null`,
        { timeout: 5000 },
      );
      if (result.toString().includes('"name":"eden"')) {
        console.log();
        console.log(`  ${chalk.green('✓')} MCP server 验证通过。`);
      }
    } catch {
      // silent — not critical
    }
  }

  console.log(chalk.dim('  ──────────────────────────────────────────────────'));
  console.log();
}

function generateFirstGlimpse(
  profile: UserProfile,
  topLangs: string[],
  activeProjects: { name: string; lastActivity: number }[],
  dormantProjects: { name: string; lastActivity: number }[],
): string {
  const lines: string[] = [];

  // Line 1: tech identity
  const langStr = topLangs.map(l => chalk.cyan(l)).join('、');
  const fwStr = profile.frameworks.length > 0
    ? `，用 ${profile.frameworks.slice(0, 3).map(f => chalk.cyan(f)).join(' + ')}`
    : '';
  lines.push(`你主要写 ${langStr}${fwStr}。`);

  // Line 2: project landscape + recent activity
  const total = profile.projects.length;
  if (activeProjects.length > 0) {
    const activeNames = activeProjects.slice(0, 2).map(p => chalk.cyan(p.name)).join(' 和 ');
    lines.push(`有 ${chalk.cyan(String(total))} 个项目，最近在忙 ${activeNames}。`);
  } else {
    lines.push(`有 ${chalk.cyan(String(total))} 个项目，最近都比较安静。`);
  }

  // Line 3: dormant projects (if any)
  if (dormantProjects.length > 0) {
    const dormantParts = dormantProjects.map(p => {
      const days = Math.floor((Date.now() - p.lastActivity) / 1000 / 60 / 60 / 24);
      return `${chalk.cyan(p.name)}`;
    });
    const maxDays = Math.max(...dormantProjects.map(p =>
      Math.floor((Date.now() - p.lastActivity) / 1000 / 60 / 60 / 24)));
    lines.push(chalk.dim(`${dormantParts.join(' 和 ')} 已经沉睡超过 ${maxDays} 天了。`));
  }

  return lines.join('\n  ');
}

function ask(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => { rl.close(); resolve(answer); });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
