// 初始化 — 第一次见面，尽可能少问问题

import readline from 'node:readline';
import chalk from 'chalk';
import os from 'node:os';
import { ensureEdenDir, loadConfig, saveConfig } from '../persistence/config.js';
import { loadState, saveState, saveMemories } from '../persistence/store.js';
import { scanUserProjects } from '../perception/deep-read.js';
import { detectTools } from '../tools/registry.js';
import { autoConnectAll } from '../tools/auto-connect.js';

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
  }]);

  // ===== Device token（自动生成） =====
  const config = loadConfig();
  if (!config.deviceToken) {
    const { randomUUID } = await import('node:crypto');
    config.deviceToken = randomUUID();
    saveConfig(config);
  }

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

  // ===== 完成 =====
  console.log();
  console.log(chalk.dim('─'.repeat(50)));
  console.log(`  ${chalk.cyan('Eden')} 已就绪。`);

  const connectedTools = results.filter(r => r.success).map(r => r.tool);
  if (connectedTools.length > 0) {
    console.log(chalk.dim(`  ${connectedTools.join('、')} 已连接。打开它们，Eden 已经在了。`));
  }

  console.log(chalk.dim('─'.repeat(50)));
  console.log();
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
