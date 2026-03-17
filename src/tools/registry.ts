// 工具注册表 — Eden 能调用的外部 coding agent

import { execSync } from 'node:child_process';

export interface Tool {
  id: string;
  name: string;
  command: string;
  description: string;
  available: boolean;
  strengths: string[];     // Eden 判断什么时候推荐这个工具
}

// 检测已安装的工具
export function detectTools(): Tool[] {
  const tools: Tool[] = [
    {
      id: 'claude-code',
      name: 'Claude Code',
      command: 'claude',
      description: 'Anthropic 的 CLI coding agent',
      available: isInstalled('claude'),
      strengths: ['复杂重构', '多文件修改', '代码审查', '架构设计', '调试'],
    },
    {
      id: 'codex',
      name: 'Codex CLI',
      command: 'codex',
      description: 'OpenAI 的 CLI coding agent',
      available: isInstalled('codex'),
      strengths: ['快速生成', '补全', '简单任务'],
    },
    {
      id: 'aider',
      name: 'Aider',
      command: 'aider',
      description: '开源 AI pair programming',
      available: isInstalled('aider'),
      strengths: ['pair programming', '持续对话', '多模型支持'],
    },
    {
      id: 'cursor',
      name: 'Cursor',
      command: 'cursor',
      description: 'AI-first 代码编辑器',
      available: isInstalled('cursor'),
      strengths: ['UI 开发', '快速迭代', '可视化编辑'],
    },
  ];

  return tools;
}

function isInstalled(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
