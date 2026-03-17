// 洞察周报 — 不是统计，是对人的理解

import { trackGitActivity, type GitActivity } from '../perception/git-tracker.js';
import { loadUserProfile, scanUserProjects } from '../perception/deep-read.js';
import { loadMemories, saveMemories } from '../persistence/store.js';
import { loadSessions } from '../tools/session.js';
import { loadConfig, JOURNAL_DIR } from '../persistence/config.js';
import { MemoryStore } from '../mind/memory.js';
import { chat } from '../llm/client.js';
import fs from 'node:fs';
import path from 'node:path';

export interface InsightReport {
  period: { start: string; end: string };
  raw: RawWeekData;
  narrative: string;        // LLM 生成的叙事
  questions: string[];      // Eden 想问用户的问题
  patterns: string[];       // 跨周模式
}

export interface RawWeekData {
  git: {
    totalCommits: number;
    projects: Array<{ name: string; commits: number }>;
    peakHours: number[];
    codingDays: number;
  };
  sessions: Array<{
    tool: string;
    summary: string | null;
    when: string;
  }>;
  memories: string[];
  // 扩展数据源（Notion/Calendar 等，后续接入）
  external?: Record<string, unknown>;
}

// 收集原始数据
export async function collectWeekData(offsetWeeks: number = 0): Promise<{ period: { start: string; end: string }; data: RawWeekData }> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - offsetWeeks * 7);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const period = {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };

  // Git
  let profile = loadUserProfile();
  if (!profile) profile = scanUserProjects();
  const git = await trackGitActivity(profile.projects.map(p => p.path), offsetWeeks);

  const projectCommits: Record<string, number> = {};
  for (const c of git.recentCommits) {
    projectCommits[c.project] = (projectCommits[c.project] || 0) + 1;
  }

  const peakHours = git.commitsByHour
    .map((count, hour) => ({ count, hour }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(x => x.hour);

  const codingDays = new Set(git.recentCommits.map(c => c.date.split('T')[0])).size;

  // Sessions
  const sessions = loadSessions()
    .filter(s => {
      const d = new Date(s.startedAt);
      return d >= startDate && d <= endDate;
    })
    .map(s => ({
      tool: s.toolId,
      summary: s.summary || null,
      when: new Date(s.startedAt).toLocaleDateString('zh-CN'),
    }));

  // Memories from that week
  const allMemories = new MemoryStore();
  allMemories.load(loadMemories());
  const weekMemories = allMemories.recent(100)
    .filter(m => {
      const d = new Date(m.timestamp);
      return d >= startDate && d <= endDate;
    })
    .map(m => m.content);

  return {
    period,
    data: {
      git: {
        totalCommits: git.totalCommits7d,
        projects: Object.entries(projectCommits)
          .sort((a, b) => b[1] - a[1])
          .map(([name, commits]) => ({ name, commits })),
        peakHours,
        codingDays,
      },
      sessions,
      memories: weekMemories.slice(-20),
    },
  };
}

// 加载上一周的报告（用于跨周对比）
function loadPreviousReport(): InsightReport | null {
  try {
    const files = fs.readdirSync(JOURNAL_DIR)
      .filter(f => f.startsWith('insight-'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const content = fs.readFileSync(path.join(JOURNAL_DIR, files[0]), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// 生成洞察报告
export async function generateInsightReport(offsetWeeks: number = 0): Promise<InsightReport> {
  const config = loadConfig();
  const { period, data } = await collectWeekData(offsetWeeks);

  // 加载上周报告用于对比
  const prevReport = loadPreviousReport();

  // 如果没有 API key，返回纯数据版本
  if (!config.apiKey) {
    return {
      period,
      raw: data,
      narrative: formatFallbackNarrative(data),
      questions: [],
      patterns: [],
    };
  }

  // 用 LLM 生成洞察
  const prompt = buildInsightPrompt(period, data, prevReport);

  try {
    const response = await chat(config, prompt, [
      { role: 'user', content: '写这周的洞察报告。' },
    ]);

    // 解析 LLM 输出
    const parsed = parseInsightResponse(response);

    const report: InsightReport = {
      period,
      raw: data,
      narrative: parsed.narrative,
      questions: parsed.questions,
      patterns: parsed.patterns,
    };

    // 保存
    const reportPath = path.join(JOURNAL_DIR, `insight-${period.end}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 存入记忆
    const memories = new MemoryStore();
    memories.load(loadMemories());
    memories.add('reflection', `周报: ${parsed.narrative.slice(0, 200)}`, JOURNAL_DIR);
    saveMemories(memories.toJSON());

    return report;
  } catch {
    return {
      period,
      raw: data,
      narrative: formatFallbackNarrative(data),
      questions: [],
      patterns: [],
    };
  }
}

function buildInsightPrompt(
  period: { start: string; end: string },
  data: RawWeekData,
  prevReport: InsightReport | null,
): string {
  let prompt = `你是 Eden，一个持续观察开发者的 AI 身份层。你要写一份周报——不是统计报表，而是对这个人这一周的理解。

## 这周的数据（${period.start} → ${period.end}）

Git 活动:
- ${data.git.totalCommits} 次提交
- 项目: ${data.git.projects.map(p => `${p.name}(${p.commits})`).join(', ') || '无'}
- 编码天数: ${data.git.codingDays}/7
- 高峰时段: ${data.git.peakHours.map(h => `${h}:00`).join(', ') || '无'}

工具使用:
${data.sessions.length > 0 ? data.sessions.map(s => `- ${s.tool}: ${s.summary || '无摘要'} (${s.when})`).join('\n') : '- 无记录'}

Eden 的观察:
${data.memories.length > 0 ? data.memories.slice(-10).join('\n') : '- 无'}`;

  if (prevReport) {
    prompt += `\n\n## 上周的报告
${prevReport.narrative}

上周的问题: ${prevReport.questions.join('; ') || '无'}
上周的模式: ${prevReport.patterns.join('; ') || '无'}`;
  }

  prompt += `

## 输出要求
用中文写。返回 JSON：
{
  "narrative": "3-5 句话的叙事。像一个了解你的朋友在说你这周怎么样了。不要罗列数据——要有观点、有温度、有洞察。如果能联系上周的模式就更好。",
  "questions": ["你想问这个人的 1-2 个问题，帮他思考"],
  "patterns": ["你观察到的跨周行为模式，1-2 条"]
}

重要：返回合法的 JSON。字符串值内不要有字面换行符，如需换行请用 \\n。不要用 markdown code fence 包裹。
不要客气，不要鼓励。说真话。`;

  return prompt;
}

function parseInsightResponse(text: string): { narrative: string; questions: string[]; patterns: string[] } {
  const defaultResult = { narrative: '', questions: [] as string[], patterns: [] as string[] };

  // Step 1: Strip markdown code fences if present
  let cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();

  // Step 2: Extract the JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // No JSON found at all — use entire text as narrative
    return { ...defaultResult, narrative: cleaned.slice(0, 500) };
  }

  let jsonStr = jsonMatch[0];

  // Step 3: Fix literal newlines inside JSON string values.
  // Replace all literal newlines (that are inside string values) with escaped \\n.
  // Strategy: walk through the string, track whether we're inside a JSON string,
  // and replace raw newlines inside strings with \\n.
  jsonStr = fixNewlinesInJsonStrings(jsonStr);

  // Step 4: Try JSON.parse (with multiple attempts)
  for (const attempt of [jsonStr, jsonMatch[0].replace(/\n\s*/g, ' ')]) {
    try {
      const parsed = JSON.parse(attempt);
      return extractFields(parsed);
    } catch {
      // try next attempt
    }
  }

  // Step 5: Try to repair truncated JSON then parse
  try {
    const repaired = repairTruncatedJson(jsonStr);
    const parsed = JSON.parse(repaired);
    return extractFields(parsed);
  } catch {
    // ignore
  }

  // Step 6: Regex extraction fallback (works even on truncated/malformed JSON)
  // Use [\s\S] to match across newlines in the narrative value
  const narrativeMatch = cleaned.match(/"narrative"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
  const questionsMatch = cleaned.match(/"questions"\s*:\s*\[([\s\S]*?)\]/);
  const patternsMatch = cleaned.match(/"patterns"\s*:\s*\[([\s\S]*?)\]/);

  const narrative = narrativeMatch ? narrativeMatch[1].replace(/\\n/g, ' ').trim() : '';
  const questions = questionsMatch
    ? questionsMatch[1].match(/"((?:[^"\\]|\\[\s\S])*)"/g)?.map(s => s.slice(1, -1).trim()) || []
    : [];
  const patterns = patternsMatch
    ? patternsMatch[1].match(/"((?:[^"\\]|\\[\s\S])*)"/g)?.map(s => s.slice(1, -1).trim()) || []
    : [];

  if (narrative) {
    return { narrative, questions, patterns };
  }

  // Step 7: Complete failure — use raw text
  return { ...defaultResult, narrative: cleaned.replace(/\{[\s\S]*\}/g, '').trim() || text.slice(0, 500) };
}

function extractFields(parsed: Record<string, unknown>): { narrative: string; questions: string[]; patterns: string[] } {
  return {
    narrative: String(parsed.narrative || '').trim(),
    questions: Array.isArray(parsed.questions) ? parsed.questions.map((q: unknown) => String(q).trim()) : [],
    patterns: Array.isArray(parsed.patterns) ? parsed.patterns.map((p: unknown) => String(p).trim()) : [],
  };
}

/** Attempt to close unclosed strings/arrays/objects in truncated JSON */
function repairTruncatedJson(json: string): string {
  let s = json.trimEnd();
  // Track open structures
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  // If we ended inside a string, close it
  if (inString) s += '"';
  // Remove trailing comma
  s = s.replace(/,\s*$/, '');
  // Close all open structures
  while (stack.length > 0) {
    s += stack.pop();
  }
  return s;
}

/** Replace literal newlines inside JSON string values with \\n */
function fixNewlinesInJsonStrings(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString && (ch === '\n' || ch === '\r')) {
      // Replace literal newline inside string with escaped version
      if (ch === '\r' && json[i + 1] === '\n') {
        i++; // skip the \n in \r\n
      }
      result += '\\n';
      continue;
    }

    result += ch;
  }

  return result;
}

function formatFallbackNarrative(data: RawWeekData): string {
  if (data.git.totalCommits === 0) {
    return '这周没有 git 提交。可能在思考，可能在休息，也可能在做不留痕迹的事。';
  }

  const projects = data.git.projects.map(p => p.name).join('和');
  const lateNight = data.git.peakHours.some(h => h >= 23 || h <= 4);

  let text = `这周 ${data.git.totalCommits} 次提交，主要在 ${projects}。`;
  text += `编码了 ${data.git.codingDays} 天。`;

  if (lateNight) {
    text += '又在熬夜写代码。';
  }

  if (data.git.projects.length > 2) {
    text += '注意力比较分散。';
  }

  return text;
}
