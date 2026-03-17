# Eden — 设计文档

## 一句话定义

Eden 是你的个人 AI 身份层。安装一次，所有 AI 工具都认识你。

## 核心理念

每次打开 AI 工具，你都要重新解释自己是谁、在做什么项目、偏好什么风格。Eden 解决这个问题——它持久地了解你，并把这个了解提供给所有工具。

Eden 不是助手，不是 daemon，不是聊天机器人。它是一个**睡眠/醒来的身份实体**：大部分时间沉睡（零开销），被 AI 工具唤醒时快速感知变化，返回你的身份，然后继续沉睡。

## 产品形态

```
npx eden-me
```

一行命令。自动扫描环境，自动连接工具，自动开始工作。

## 架构

```
┌─────────────────────────────────────┐
│           Eden 沉睡中                │
│     零 CPU · 零内存 · 零成本         │
└──────────────┬──────────────────────┘
               │ Agent 调用 eden_get_user
┌──────────────┴──────────────────────┐
│           Eden 醒来                  │
│  < 5分钟 → 返回缓存                  │
│  5分-1小时 → 快速 git 扫描           │
│  > 1小时 → 完整环境重扫              │
└──────────────┬──────────────────────┘
               │ 返回身份 + 变化
┌────────┬─────┴─────┬────────────────┐
│Claude  │  Cursor   │  Windsurf      │
│ Code   │           │                │
└────────┴───────────┴────────────────┘
               │ 会话结束
               → Eden 继续沉睡
```

## 技术栈

| 组件 | 技术 |
|------|------|
| CLI | TypeScript + Commander.js + Chalk |
| MCP Server | @modelcontextprotocol/sdk (stdio) |
| LLM | @anthropic-ai/sdk (Claude Sonnet 4) |
| Git | simple-git |
| 网站 | Next.js 16 + Tailwind CSS |
| 持久化 | JSON 文件 (~/.eden/) |
| 部署 | npm (eden-me) + Vercel |

## 数据模型

### EdenState（~/.eden/state.json）
```typescript
{
  name: string;           // "Eden"
  createdAt: number;      // 时间戳
  lastActiveAt: number;   // 上次醒来时间
}
```

### Memory（~/.eden/memories.json）
```typescript
{
  id: string;
  type: 'observation' | 'conversation' | 'milestone' | 'reflection';
  content: string;        // 带分类标签：[preference] / [pattern] / [decision] / [skill] / [context]
  timestamp: number;
  location?: string;
}
```
最多 500 条，FIFO 淘汰。

### UserProfile（~/.eden/user-profile.json）
```typescript
{
  languages: Record<string, number>;  // TypeScript: 578, JSON: 224, ...
  frameworks: string[];               // React, Next.js, Tailwind, ...
  projects: ProjectProfile[];         // 最多 15 个
  patterns: { activeHours, commitFrequency, codeStyle };
  lastScanned: number;
}
```

### ToolSession（~/.eden/sessions.json）
```typescript
{
  id: string;
  toolId: string;         // claude-code, cursor, windsurf
  workDir: string;
  startedAt: number;
  endedAt?: number;
  summary?: string;
  filesChanged?: string[];
  gitBefore?: string;
  gitAfter?: string;
}
```
最多 50 条。

### EdenConfig（~/.eden/config.json）
```typescript
{
  apiKey: string;                    // Claude API（可选）
  model: string;                     // 默认 claude-sonnet-4-20250514
  excludeDirs: string[];             // 隐私排除目录
  excludePatterns: string[];         // 默认排除 .env, *.key, credentials*
  notionToken?: string;
  githubToken?: string;
  deviceToken?: string;              // 云端同步标识
  syncUrl?: string;
}
```

## MCP 工具（面向 Agent）

Agent 通过 MCP 协议调用这些工具。Eden 作为 stdio server 被 AI 工具按需启动。

| 工具 | 用途 | 调用时机 |
|------|------|---------|
| `eden_get_user` | 获取用户完整身份：技术栈、项目、记忆、醒来报告、工具使用 | 每次对话开始 |
| `eden_remember` | 存储对用户的观察，分类：preference/pattern/decision/skill/context | 发现用户偏好、模式、决定时 |
| `eden_search_memory` | 按关键词+分类搜索记忆 | 回答前先查已知信息 |
| `eden_get_project` | 获取特定项目的上下文：画像、记忆、会话、未完成事项 | 用户提到某个项目时 |
| `eden_weekly_report` | 生成叙事式周报：模式、洞察、反思问题 | 用户要求或自动触发 |

### eden_get_user 返回结构

```json
{
  "wakeUp": {
    "note": "3 小时没见。eden-cli: 2 个新 commit。所有项目 clean。",
    "scanLevel": "quick",
    "changes": ["eden-cli: 2 个新 commit"]
  },
  "tech": {
    "primaryLanguages": [{"name": "TypeScript", "count": 578}],
    "frameworks": ["React", "Next.js", "Tailwind"],
    "projectCount": 11
  },
  "projects": {
    "active": [{"name": "eden-cli", "language": "TypeScript", "size": "small"}],
    "dormant": [{"name": "Jiva", "daysSinceActivity": 11}]
  },
  "continuity": {
    "lastTool": "claude-code",
    "lastProject": "~/eden/eden-cli",
    "lastSummary": "重构 MCP server",
    "when": "3h ago"
  },
  "recentMemories": [...],
  "toolUsage": {...},
  "externalContext": [...]
}
```

## CLI 命令（面向用户）

| 命令 | 功能 |
|------|------|
| `eden` | 进入对话（首次自动 init） |
| `eden init` | 扫描环境、连接工具、创建身份 |
| `eden me` | 终端 Dashboard——Eden 眼中的你 |
| `eden me --web` | 浏览器打开在线 Dashboard |
| `eden memories` | 浏览/搜索/清除记忆 |
| `eden report` | 本周洞察周报 |
| `eden report -w 1` | 上周周报 |
| `eden config` | 配置 API key、隐私设置 |
| `eden status` | 快速状态 |
| `eden sync github` | 同步 GitHub 活动 |
| `eden sync notion` | 同步 Notion 页面 |
| `eden sync cloud` | 同步到网页 Dashboard |

## 自动连接机制

`eden init` 时自动检测并配置：

| 工具 | 检测方式 | 配置内容 |
|------|---------|---------|
| Claude Code | `which claude` | `claude mcp add --scope user` + `~/.claude/CLAUDE.md` |
| Cursor | `~/.cursor/` 存在 | `~/.cursor/mcp.json` + `~/.cursor/rules/eden.mdc` |
| Windsurf | `~/.codeium/windsurf/` 存在 | `mcp_config.json` |

CLAUDE.md 和 Cursor rules 中注入指令，告诉 agent 在对话开始时调用 `eden_get_user`。

## 醒来感知逻辑

```typescript
function wakeUp(): WakeUpResult {
  const elapsed = now - lastActiveAt;

  if (elapsed < 5分钟) → 返回缓存，不扫描
  if (elapsed < 1小时) → 快速 git 扫描（top 5 项目的新 commit + 未提交状态）
  if (elapsed > 1小时) → 完整扫描：
    - 重新扫描项目（发现新项目/框架/活跃变化）
    - Git 扫描
    - 对比新旧 profile 差异
    - 读取外部数据（GitHub/Notion）
    - 记录变化到记忆

  返回：当前真实 git 状态（currentStatus）覆盖旧记忆
}
```

关键设计：**currentStatus 是真相，旧记忆可能过时。** LLM 被明确指令优先信任当前扫描结果。

## 数据源

| 来源 | 获取方式 | 产出 |
|------|---------|------|
| 本地文件系统 | 自动（init + 醒来时） | user-profile.json |
| Git | 自动（醒来时） | 变化检测 + 当前状态 |
| GitHub | `eden sync github` | ~/.eden/external/github.md |
| Notion | `eden sync notion` | ~/.eden/external/notion.md |
| 任意文件 | 手动放入 ~/.eden/external/ | 自动被 eden_get_user 读取 |

## 洞察周报

不是统计面板，是叙事式理解。

```
这周你在两件事之间反复切换——airi 和 edenclaw。
56 次提交集中在 3 天内，凌晨 3 点是高峰。
上次你有这种模式是两周前。后来你做了一个决定：
砍掉 3D 版 Eden，转向终端。也许你又到了需要做决定的时候。

? 你这种"3天集中编码"的模式是有意安排的，还是被其他事挤压了？
? 凌晨那些提交是灵感突现还是 deadline 压力？

→ 固化的集中式编码模式：连续两周都是3天+高强度提交
→ 夜间编码活跃度高，深夜更容易进入心流
```

基于：git 活动 + 工具会话 + 记忆 + 上周报告（跨周对比）。

## 网站

**地址：** https://eden-me.vercel.app

### 页面

| 页面 | 功能 |
|------|------|
| `/` | 产品首页：Hero + 终端动画 + 功能卡片 + 架构图 + 工具表 + 隐私 |
| `/install` | 安装引导 + FAQ |
| `/me` | 在线 Dashboard（通过 device token 访问同步数据） |
| `/chat` | 在线对话（带用户上下文） |

### API

| 端点 | 功能 |
|------|------|
| `POST /api/sync` | 接收 CLI 同步的数据 |
| `GET /api/user/[token]` | 按 device token 获取用户数据 |
| `POST /api/chat` | 对话（调 Claude API） |

## 隐私设计

- **本地优先：** 所有数据在 `~/.eden/`，不自动上传
- **零遥测：** 不收集任何使用数据
- **可配排除：** `eden config` 设置排除目录和文件模式
- **默认安全：** .env、*.key、credentials* 自动排除
- **可删除：** `rm -rf ~/.eden` 清除一切
- **云同步可选：** 只有 `eden sync cloud` 时才上传，且只到用户自己的 dashboard

## 竞品定位

| | Eden | Mem0 ($24M) | OneContext | Letta ($10M) |
|---|---|---|---|---|
| 面向 | 终端用户 | 开发者（B2B） | 开发者 | 开发者 |
| 数据源 | 本地文件系统 | 云 API | 云账号（GitHub/X） | 框架内 |
| 运行方式 | 按需醒来 | 常驻 API | 每日同步 | Agent 运行时 |
| 隐私 | 全本地 | 数据在他们的云 | 数据在他们的云 | 数据在他们的云 |
| 人格 | 有 | 无 | 无 | 部分 |
| 安装 | `npx eden-me` | SDK 集成 | OAuth 配置 | 框架绑定 |

## 文件结构

```
eden-cli/
├── src/
│   ├── index.ts                 CLI 入口（13 个命令）
│   ├── mcp/
│   │   ├── server.ts            MCP server（5 个工具）
│   │   └── entry.ts             MCP 启动入口
│   ├── perception/
│   │   ├── deep-read.ts         项目扫描 + 用户画像
│   │   ├── git.ts               Git 状态感知
│   │   ├── git-tracker.ts       Git 活动追踪（周级）
│   │   ├── wake-up.ts           醒来感知（变化检测）
│   │   ├── external.ts          外部数据源读取
│   │   ├── github.ts            GitHub API 同步
│   │   └── notion.ts            Notion API 同步
│   ├── mind/
│   │   └── memory.ts            记忆系统（500 条，FIFO）
│   ├── persistence/
│   │   ├── config.ts            配置管理
│   │   └── store.ts             状态 + 记忆持久化
│   ├── tools/
│   │   ├── auto-connect.ts      自动连接 AI 工具
│   │   ├── registry.ts          工具检测
│   │   └── session.ts           会话追踪
│   ├── reports/
│   │   └── insight-report.ts    LLM 叙事周报
│   ├── llm/
│   │   └── client.ts            Claude API 客户端
│   └── interface/
│       ├── init.ts              初始化流程
│       ├── talk.ts              终端对话
│       ├── dashboard.ts         终端 Dashboard
│       └── web-dashboard.ts     浏览器 Dashboard
├── package.json                 eden-me@0.1.3
├── tsconfig.json
└── README.md

eden-web/
├── app/
│   ├── page.tsx                 首页
│   ├── install/page.tsx         安装引导
│   ├── me/page.tsx              在线 Dashboard
│   ├── chat/page.tsx            在线对话
│   └── api/
│       ├── sync/route.ts        数据同步
│       ├── user/[token]/route.ts 获取用户数据
│       └── chat/route.ts        对话 API
├── components/                  UI 组件
├── lib/
│   ├── types.ts                 共享类型
│   └── storage.ts               文件存储
└── vercel.json
```

## 发布渠道

| 渠道 | 地址 |
|------|------|
| npm | https://www.npmjs.com/package/eden-me |
| 网站 | https://eden-me.vercel.app |
| GitHub | https://github.com/RZ7-lab/eden |
