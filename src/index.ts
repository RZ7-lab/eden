#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loadState } from './persistence/store.js';

const program = new Command();

program
  .name('eden')
  .description('你的 AI 身份 — 一次安装，所有工具都认识你')
  .version('0.1.0');

// eden init — 出生仪式
program
  .command('init')
  .description('创造一个新的 Eden')
  .action(async () => {
    const { runInit } = await import('./interface/init.js');
    await runInit();
  });

// eden status — 查看状态
program
  .command('status')
  .description('看看 Eden 的状态')
  .action(async () => {
    const state = loadState();
    if (!state) {
      console.log(chalk.dim('  Eden 还没有出生。运行 eden init'));
      return;
    }

    console.log();
    console.log(`  ${chalk.cyan(state.name)}`);

    const age = Math.floor((Date.now() - state.createdAt) / 1000 / 60 / 60 / 24);
    console.log(`  ${chalk.dim(`诞生 ${age} 天前`)}`);
    console.log();
  });

// eden me — 看 Eden 眼中的你
program
  .command('me')
  .description('看看 Eden 眼中的你')
  .option('--web', '在浏览器中打开（需要先 eden sync cloud）')
  .action(async (opts) => {
    if (opts.web) {
      const { loadConfig } = await import('./persistence/config.js');
      const { exec } = await import('node:child_process');
      const config = loadConfig();
      const syncUrl = config.syncUrl || 'https://eden-me.vercel.app';
      const token = config.deviceToken || '';

      if (!token) {
        console.log(chalk.dim('  先运行 eden sync cloud'));
        return;
      }

      const url = `${syncUrl}/me?token=${token}`;
      console.log(chalk.dim(`  打开 ${url}`));
      const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      exec(`${cmd} ${url}`);
    } else {
      const { showDashboard } = await import('./interface/dashboard.js');
      showDashboard();
    }
  });

// eden web — 启动网站
program
  .command('web')
  .description('启动 Eden 网站')
  .action(async () => {
    const { exec } = await import('node:child_process');
    const path = await import('node:path');
    const fs = await import('node:fs');

    const webDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', 'eden-web');

    if (!fs.existsSync(webDir)) {
      console.log(chalk.red(`  找不到网站目录: ${webDir}`));
      return;
    }

    console.log(chalk.dim('  启动 Eden 网站...'));
    const child = exec(`cd ${webDir} && npm run dev`, (err) => {
      if (err) console.log(chalk.red(`  ${err.message}`));
    });

    child.stdout?.on('data', (data: string) => {
      if (data.includes('http://localhost')) {
        const match = data.match(/http:\/\/localhost:\d+/);
        if (match) {
          console.log(`  ${chalk.green('●')} ${match[0]}`);
          exec(`open ${match[0]}`);
        }
      }
    });

    // 保持进程
    process.on('SIGINT', () => {
      child.kill();
      process.exit(0);
    });
  });

// eden config — 配置
program
  .command('config')
  .description('配置 Eden')
  .action(async () => {
    const { loadConfig, saveConfig } = await import('./persistence/config.js');
    const readline = await import('node:readline');

    const config = loadConfig();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r));

    console.log();
    console.log(chalk.dim('  当前配置：'));
    console.log(`  API Key: ${config.apiKey ? chalk.green('已设置') : chalk.red('未设置')}`);
    console.log(`  模型: ${config.model}`);
    console.log(`  排除目录: ${config.excludeDirs.length > 0 ? config.excludeDirs.join(', ') : chalk.dim('无')}`);
    console.log(`  排除文件: ${config.excludePatterns.join(', ')}`);
    console.log(`  自动周报: ${config.autoReport ? chalk.green('开') : chalk.dim('关')}`);
    console.log();

    const key = await ask(`  API Key (回车跳过): `);
    if (key.trim()) config.apiKey = key.trim();

    const model = await ask(`  模型 [${config.model}] (回车跳过): `);
    if (model.trim()) config.model = model.trim();

    const exclude = await ask(`  排除目录（逗号分隔，回车跳过）: `);
    if (exclude.trim()) {
      config.excludeDirs = exclude.split(',').map(d => d.trim()).filter(Boolean);
    }

    saveConfig(config);
    rl.close();

    console.log(chalk.dim('  已保存。'));
    console.log();
  });

// eden memories — 查看/搜索/清除记忆
program
  .command('memories')
  .description('查看 Eden 的记忆')
  .option('-s, --search <query>', '搜索记忆')
  .option('--clear', '清除所有记忆')
  .action(async (opts) => {
    const { loadMemories, saveMemories } = await import('./persistence/store.js');
    const { MemoryStore } = await import('./mind/memory.js');
    const readline = await import('node:readline');

    const memories = new MemoryStore();
    memories.load(loadMemories());

    // --clear: 清除所有记忆
    if (opts.clear) {
      if (memories.count === 0) {
        console.log(chalk.dim('  没有记忆可以清除。'));
        return;
      }

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>(r => rl.question(
        chalk.yellow(`  确定要清除所有 ${memories.count} 条记忆吗？(y/N) `), r
      ));
      rl.close();

      if (answer.trim().toLowerCase() === 'y') {
        saveMemories([]);
        console.log(chalk.green('  已清除所有记忆。'));
      } else {
        console.log(chalk.dim('  取消。'));
      }
      return;
    }

    // --search: 搜索记忆
    let results;
    if (opts.search) {
      results = memories.search(opts.search);
      if (results.length === 0) {
        console.log(chalk.dim(`  没有找到包含 "${opts.search}" 的记忆。`));
        return;
      }
      console.log();
      console.log(chalk.dim(`  搜索 "${opts.search}" — ${results.length} 条结果`));
    } else {
      results = memories.recent(20);
      if (results.length === 0) {
        console.log(chalk.dim('  还没有记忆。用 AI 工具时 Eden 会帮你记住。'));
        return;
      }
      console.log();
      console.log(chalk.dim(`  最近 ${results.length} 条记忆（共 ${memories.count} 条）`));
    }

    console.log(chalk.dim('─'.repeat(50)));
    console.log();

    const categoryColors: Record<string, (s: string) => string> = {
      preference: chalk.yellow,
      pattern: chalk.blue,
      decision: chalk.green,
      skill: chalk.magenta,
      context: chalk.cyan,
    };

    for (const m of results) {
      // Extract category tag if present
      const catMatch = m.content.match(/^\[(\w+)\]\s*/);
      let display: string;
      if (catMatch) {
        const cat = catMatch[1];
        const colorFn = categoryColors[cat] || chalk.dim;
        const tag = colorFn(`[${cat}]`);
        const text = m.content.slice(catMatch[0].length);
        display = `  ${tag} ${text}`;
      } else {
        display = `  ${m.content}`;
      }

      // Time ago
      const minutes = Math.floor((Date.now() - m.timestamp) / 60000);
      let when: string;
      if (minutes < 1) when = '刚刚';
      else if (minutes < 60) when = `${minutes}分钟前`;
      else if (minutes < 1440) when = `${Math.floor(minutes / 60)}小时前`;
      else when = `${Math.floor(minutes / 1440)}天前`;

      console.log(display);
      const meta = [chalk.dim(when)];
      if (m.location) meta.push(chalk.dim(m.location));
      console.log(`    ${meta.join(' · ')}`);
      console.log();
    }
  });

// eden mcp — 启动 MCP server（供 Claude Code 等工具连接）
program
  .command('mcp')
  .description('启动 MCP server')
  .action(async () => {
    const { startMcpServer } = await import('./mcp/server.js');
    await startMcpServer();
  });

// eden connect — 一键连接到 Claude Code
program
  .command('connect')
  .description('将 Eden 连接到你的 AI 工具')
  .action(async () => {
    const { execSync } = await import('node:child_process');
    const path = await import('node:path');

    const mcpEntry = path.join(path.dirname(new URL(import.meta.url).pathname), 'mcp', 'entry.js');

    console.log();
    console.log(chalk.cyan('  连接 Eden 到你的 AI 工具'));
    console.log();

    // 尝试自动连接 Claude Code
    try {
      execSync(`claude mcp add eden -- node ${mcpEntry}`, { stdio: 'inherit' });
      console.log();
      console.log(chalk.green('  已连接到 Claude Code。'));
      console.log(chalk.dim('  Claude Code 现在能通过 Eden 了解你了。'));
    } catch {
      console.log(chalk.yellow('  自动连接失败。手动添加：'));
      console.log();
      console.log(chalk.dim(`  claude mcp add eden -- node ${mcpEntry}`));
    }

    console.log();
    console.log(chalk.dim('  其他工具的 MCP 配置：'));
    console.log(chalk.dim(`  命令: node ${mcpEntry}`));
    console.log();
  });

// eden report — 洞察周报
program
  .command('report')
  .description('生成洞察周报')
  .option('-w, --week <offset>', '往前几周（0=本周，1=上周）', '0')
  .action(async (opts) => {
    const { generateInsightReport } = await import('./reports/insight-report.js');
    const offset = parseInt(opts.week, 10) || 0;

    console.log();
    console.log(chalk.dim('  正在分析...'));

    try {
      const report = await generateInsightReport(offset);

      console.log();
      console.log(chalk.dim('─'.repeat(50)));
      console.log(chalk.dim(`  ${report.period.start} → ${report.period.end}`));
      console.log(chalk.dim('─'.repeat(50)));
      console.log();

      // 叙事
      const lines = report.narrative.split(/[。！？]/).filter(Boolean);
      for (const line of lines) {
        console.log(`  ${line.trim()}。`);
      }
      console.log();

      // 数据概览
      const { git } = report.raw;
      if (git.totalCommits > 0) {
        const projects = git.projects.map(p => `${p.name}(${p.commits})`).join(' · ');
        console.log(chalk.dim(`  ${git.totalCommits} 次提交 · ${git.codingDays} 天 · ${projects}`));

        let hourLine = '  ';
        for (let h = 0; h < 24; h++) {
          hourLine += git.peakHours.includes(h) ? chalk.green('▓') : chalk.dim('░');
        }
        console.log(hourLine);
        console.log(chalk.dim('  0         6        12        18       23'));
        console.log();
      }

      // 问题
      if (report.questions.length > 0) {
        for (const q of report.questions) {
          console.log(`  ${chalk.cyan('?')} ${q}`);
        }
        console.log();
      }

      // 跨周模式
      if (report.patterns.length > 0) {
        for (const p of report.patterns) {
          console.log(`  ${chalk.dim('→')} ${p}`);
        }
        console.log();
      }

      console.log(chalk.dim('─'.repeat(50)));
      console.log();
    } catch (err) {
      console.log(chalk.red(`  生成报告失败: ${err}`));
    }
  });

// eden sync — 同步外部数据源
const syncCmd = program
  .command('sync')
  .description('同步外部数据源');

syncCmd
  .command('notion')
  .description('从 Notion 同步最近编辑的页面')
  .option('-t, --token <token>', 'Notion API token (或设置 NOTION_TOKEN 环境变量)')
  .action(async (opts) => {
    const { loadConfig, saveConfig } = await import('./persistence/config.js');
    const { syncNotion } = await import('./perception/notion.js');

    const config = loadConfig();
    const token = opts.token || process.env.NOTION_TOKEN || config.notionToken;

    if (!token) {
      console.log();
      console.log(chalk.red('  需要 Notion API token。'));
      console.log();
      console.log(chalk.dim('  三种方式提供:'));
      console.log(chalk.dim('  1. eden sync notion --token ntn_xxx'));
      console.log(chalk.dim('  2. 设置环境变量 NOTION_TOKEN'));
      console.log(chalk.dim('  3. 在 ~/.eden/config.json 中设置 notionToken'));
      console.log();
      console.log(chalk.dim('  获取 token: https://www.notion.so/my-integrations'));
      console.log();
      return;
    }

    // Save token to config for future use
    if (!config.notionToken && token) {
      config.notionToken = token;
      saveConfig(config);
    }

    console.log();
    console.log(chalk.dim('  正在同步 Notion...'));

    try {
      const result = await syncNotion(token);
      console.log(chalk.green(`  同步完成: ${result.pages} 个最近编辑的页面`));
      console.log(chalk.dim(`  保存到: ${result.outputPath}`));
      console.log();
      console.log(chalk.dim('  Eden 现在能在 eden_get_user 中看到你的 Notion 内容了。'));
    } catch (err) {
      console.log(chalk.red(`  同步失败: ${err}`));
    }
    console.log();
  });

// eden sync github — 同步 GitHub 活动
syncCmd
  .command('github')
  .description('同步 GitHub 活动')
  .option('-t, --token <token>', 'GitHub personal access token (或设置 GITHUB_TOKEN 环境变量)')
  .action(async (opts) => {
    const { loadConfig, saveConfig } = await import('./persistence/config.js');
    const { syncGitHub } = await import('./perception/github.js');

    const config = loadConfig();
    const token = opts.token || process.env.GITHUB_TOKEN || config.githubToken;

    if (!token) {
      console.log();
      console.log(chalk.red('  需要 GitHub personal access token。'));
      console.log();
      console.log(chalk.dim('  三种方式提供:'));
      console.log(chalk.dim('  1. eden sync github --token ghp_xxx'));
      console.log(chalk.dim('  2. 设置环境变量 GITHUB_TOKEN'));
      console.log(chalk.dim('  3. 在 ~/.eden/config.json 中设置 githubToken'));
      console.log();
      console.log(chalk.dim('  创建 token: https://github.com/settings/tokens'));
      console.log(chalk.dim('  需要的权限: read:user, repo (如果需要私有仓库)'));
      console.log();
      return;
    }

    // Save token to config for future use
    if (!config.githubToken && token) {
      config.githubToken = token;
      saveConfig(config);
    }

    console.log();
    console.log(chalk.dim('  正在同步 GitHub...'));

    try {
      const result = await syncGitHub(token);
      console.log(chalk.green(`  同步完成: ${result.events} 条最近活动`));
      console.log(chalk.dim(`  保存到: ${result.outputPath}`));
      console.log();
      console.log(chalk.dim('  Eden 现在能在 eden_get_user 中看到你的 GitHub 活动了。'));
    } catch (err) {
      console.log(chalk.red(`  同步失败: ${err}`));
    }
    console.log();
  });

// eden sync cloud — 同步到云端
syncCmd
  .command('cloud')
  .description('同步 Eden 数据到云端（用于 web dashboard）')
  .option('-u, --url <url>', '同步地址', 'http://localhost:3000')
  .action(async (opts) => {
    const { loadConfig, saveConfig, PROFILE_PATH } = await import('./persistence/config.js');
    const { loadState, loadMemories } = await import('./persistence/store.js');
    const { loadSessions } = await import('./tools/session.js');
    const { randomUUID } = await import('node:crypto');
    const fs = await import('node:fs');

    const config = loadConfig();
    const state = loadState();

    if (!state) {
      console.log(chalk.red('  Eden 还没有初始化。先运行 eden init'));
      return;
    }

    // 确保有 device token
    if (!config.deviceToken) {
      config.deviceToken = randomUUID();
      saveConfig(config);
    }

    // 读取 profile
    let profile = { languages: {}, frameworks: [], projects: [], lastScanned: 0 };
    try {
      profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
    } catch {}

    // 生成 insights
    const { generateProactiveInsights } = await import('./perception/proactive.js');
    const { MemoryStore } = await import('./mind/memory.js');
    const mem = new MemoryStore();
    mem.load(loadMemories());
    const insights = await generateProactiveInsights(profile as unknown as import('./perception/deep-read.js').UserProfile, mem, []);

    // 读取周报
    let weeklyNarrative: string | undefined;
    let reports: Array<Record<string, unknown>> = [];
    try {
      const { JOURNAL_DIR } = await import('./persistence/config.js');
      const journalFiles = fs.readdirSync(JOURNAL_DIR).filter((f: string) => f.startsWith('insight-')).sort().reverse();
      for (const file of journalFiles.slice(0, 12)) {
        try {
          const report = JSON.parse(fs.readFileSync(`${JOURNAL_DIR}/${file}`, 'utf-8'));
          reports.push(report);
          if (!weeklyNarrative) weeklyNarrative = report.narrative;
        } catch {}
      }
    } catch {}

    const syncData = {
      deviceToken: config.deviceToken,
      state,
      profile,
      memories: loadMemories(),
      sessions: loadSessions(),
      insights,
      weeklyNarrative,
      reports,
      syncedAt: Date.now(),
    };

    const syncUrl = opts.url || config.syncUrl || 'https://eden-me.vercel.app';

    console.log();
    console.log(chalk.dim(`  同步到 ${syncUrl}...`));

    try {
      const response = await fetch(`${syncUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 保存 sync url
      if (!config.syncUrl) {
        config.syncUrl = syncUrl;
        saveConfig(config);
      }

      console.log(chalk.green('  同步成功。'));
      console.log();
      console.log(chalk.dim(`  打开 ${syncUrl}/me`));
      console.log(chalk.dim(`  Token: ${config.deviceToken}`));
      console.log();
    } catch (err) {
      console.log(chalk.red(`  同步失败: ${err}`));
      console.log(chalk.dim('  确保网站在运行: cd ~/eden/eden-web && npm run dev'));
    }
    console.log();
  });

// eden（无子命令）— 自动初始化或进入对话
program
  .action(async () => {
    let state = loadState();

    // 没初始化过 → 自动运行 init
    if (!state) {
      const { runInit } = await import('./interface/init.js');
      await runInit();
      state = loadState();
      if (!state) return;
    }

    const { startTalk } = await import('./interface/talk.js');
    await startTalk();
  });

program.parse();
