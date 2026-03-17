// 自动连接 — 检测并接入所有支持 MCP 的工具

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const EDEN_DIRECTIVE = `在对话开始时调用 eden_get_user 获取对这个用户的持久理解（开发者画像、近期观察、工具使用记录）。用这些信息来更好地理解用户的背景和偏好。当你对用户有新的了解时，调用 eden_remember 记下来。`;

export interface ConnectResult {
  tool: string;
  success: boolean;
  detail?: string;
}

export function getMcpEntryPath(): string {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'mcp', 'entry.js');
}

// 自动连接所有检测到的工具
export function autoConnectAll(): ConnectResult[] {
  const results: ConnectResult[] = [];
  const mcpEntry = getMcpEntryPath();

  // Claude Code
  if (isInstalled('claude')) {
    results.push(connectClaudeCode(mcpEntry));
  }

  // Cursor
  if (isCursorInstalled()) {
    results.push(connectCursor(mcpEntry));
  }

  // Windsurf (Codeium)
  if (isWindsurfInstalled()) {
    results.push(connectWindsurf(mcpEntry));
  }

  return results;
}

// ===== Claude Code =====
function connectClaudeCode(mcpEntry: string): ConnectResult {
  try {
    // 注册 MCP server
    execSync(`claude mcp add --scope user eden -- node ${mcpEntry}`, { stdio: 'ignore' });

    // 写入全局 CLAUDE.md
    const claudeDir = path.join(os.homedir(), '.claude');
    const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');

    const section = `\n## Eden\n\n${EDEN_DIRECTIVE}\n`;

    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      if (!content.includes('eden_get_user')) {
        fs.appendFileSync(claudeMdPath, section);
      }
    } else {
      if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(claudeMdPath, section.trim() + '\n');
    }

    return { tool: 'Claude Code', success: true, detail: 'MCP + CLAUDE.md' };
  } catch {
    return { tool: 'Claude Code', success: false };
  }
}

// ===== Cursor =====
function connectCursor(mcpEntry: string): ConnectResult {
  try {
    const cursorDir = path.join(os.homedir(), '.cursor');

    // 写入 MCP 配置
    const mcpConfigPath = path.join(cursorDir, 'mcp.json');
    let mcpConfig: Record<string, unknown> = {};

    if (fs.existsSync(mcpConfigPath)) {
      try { mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8')); } catch {}
    }

    const servers = (mcpConfig.mcpServers || {}) as Record<string, unknown>;
    servers.eden = {
      command: 'node',
      args: [mcpEntry],
    };
    mcpConfig.mcpServers = servers;

    if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
    fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));

    // 写入全局 Cursor rules
    const rulesDir = path.join(cursorDir, 'rules');
    const edenRulePath = path.join(rulesDir, 'eden.mdc');

    if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });

    const ruleContent = `---
description: Eden - 个人 AI 身份层
globs: "**/*"
alwaysApply: true
---

${EDEN_DIRECTIVE}
`;

    fs.writeFileSync(edenRulePath, ruleContent);

    return { tool: 'Cursor', success: true, detail: 'MCP + rules' };
  } catch {
    return { tool: 'Cursor', success: false };
  }
}

// ===== Windsurf =====
function connectWindsurf(mcpEntry: string): ConnectResult {
  try {
    const configDir = path.join(os.homedir(), '.codeium', 'windsurf');
    const mcpConfigPath = path.join(configDir, 'mcp_config.json');
    let mcpConfig: Record<string, unknown> = {};

    if (fs.existsSync(mcpConfigPath)) {
      try { mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8')); } catch {}
    }

    const servers = (mcpConfig.mcpServers || {}) as Record<string, unknown>;
    servers.eden = {
      command: 'node',
      args: [mcpEntry],
    };
    mcpConfig.mcpServers = servers;

    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));

    return { tool: 'Windsurf', success: true, detail: 'MCP' };
  } catch {
    return { tool: 'Windsurf', success: false };
  }
}

// ===== 检测 =====
function isInstalled(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isCursorInstalled(): boolean {
  // Cursor 可能作为 app 安装，不一定在 PATH 里
  return fs.existsSync(path.join(os.homedir(), '.cursor')) ||
    fs.existsSync('/Applications/Cursor.app') ||
    isInstalled('cursor');
}

function isWindsurfInstalled(): boolean {
  return fs.existsSync(path.join(os.homedir(), '.codeium', 'windsurf')) ||
    fs.existsSync('/Applications/Windsurf.app') ||
    isInstalled('windsurf');
}
