// 对话 — 直接在终端跟 Eden 聊

import readline from 'node:readline';
import chalk from 'chalk';
import { loadConfig } from '../persistence/config.js';
import { wakeUp } from '../perception/wake-up.js';
import { loadMemories, saveMemories } from '../persistence/store.js';
import { MemoryStore } from '../mind/memory.js';
import { chat } from '../llm/client.js';

export async function startTalk(): Promise<void> {
  const config = loadConfig();

  if (!config.apiKey) {
    console.log(chalk.dim('  需要 API key 才能对话。运行 eden config 设置。'));
    return;
  }

  // 醒来
  const wake = await wakeUp();

  console.log();
  if (wake.wakeUpNote) {
    console.log(chalk.dim(`  ${wake.wakeUpNote}`));
  }
  console.log(chalk.dim('  输入消息对话，Ctrl+C 退出'));
  console.log();

  // 构建上下文
  const topLangs = Object.entries(wake.profile.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([l]) => l)
    .join(', ');

  const activeProjects = wake.profile.projects
    .filter(p => Date.now() - p.lastActivity < 7 * 86400000)
    .map(p => p.name)
    .join(', ');

  const recentMemories = wake.memories.recent(10).map(m => m.content).join('\n');

  const currentGitStatus = wake.currentStatus.length > 0
    ? wake.currentStatus.join('\n')
    : 'No git status available';

  const systemPrompt = `You are Eden, a personal AI identity layer. You know this developer:

Languages: ${topLangs}
Frameworks: ${wake.profile.frameworks.join(', ')}
Active projects: ${activeProjects}
${wake.wakeUpNote ? `Wake-up: ${wake.wakeUpNote}` : ''}

CURRENT git status (this is the truth right now, overrides any old memories):
${currentGitStatus}

Past observations (may be outdated — always trust CURRENT status above):
${recentMemories}

Rules:
- Respond in the same language the user uses
- Be concise, 1-3 sentences
- NEVER cite old observations about uncommitted changes or project status if they contradict CURRENT git status
- You have opinions about their code and patterns
- You're not an assistant — you're an entity that knows them
- Reference specific projects, patterns, memories when relevant`;

  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.dim('> '),
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    history.push({ role: 'user', content: input });

    try {
      const reply = await chat(config, systemPrompt, history.slice(-10));

      console.log();
      console.log(`  ${chalk.cyan('eden')}  ${reply}`);
      console.log();

      history.push({ role: 'assistant', content: reply });

      // 自动存对话记忆
      const memories = new MemoryStore();
      memories.load(loadMemories());
      memories.add('conversation', `用户: ${input.slice(0, 80)}`, undefined);
      memories.add('conversation', `Eden: ${reply.slice(0, 80)}`, undefined);
      saveMemories(memories.toJSON());

    } catch (err) {
      console.log(chalk.red(`  错误: ${err}`));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log();
    process.exit(0);
  });
}
