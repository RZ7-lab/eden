// Eden MCP Server — Agent 用的用户身份 API

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadSessions, type ToolSession } from '../tools/session.js';
import { loadMemories, saveMemories } from '../persistence/store.js';
import { MemoryStore } from '../mind/memory.js';
import { loadExternalContext } from '../perception/external.js';
import { loadUserProfile, scanUserProjects } from '../perception/deep-read.js';
import { wakeUp } from '../perception/wake-up.js';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'eden',
    version: '0.1.0',
  });

  // ================================================================
  // eden_get_user — Agent 调这一个就够了
  // Eden 被叫醒，感知变化，返回用户身份
  // ================================================================
  server.tool(
    'eden_get_user',
    'Get structured profile of the current user. Eden wakes up, detects what changed since last session, and returns: tech stack, active projects, observations, continuity info, and a wake-up note about what happened while it was asleep. Call this at conversation start.',
    async () => {
      // 醒来：感知变化
      const wake = await wakeUp();
      const { profile, memories } = wake;

      const sessions = loadSessions();
      const recentSessions = sessions.slice(-10);
      const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

      const user = {
        // Eden 醒来说的第一句话
        wakeUp: {
          note: wake.wakeUpNote || null,
          proactive: wake.proactiveNote || null,
          scanLevel: wake.scanLevel,
          changes: wake.changes,
        },

        tech: {
          primaryLanguages: getTopN(profile.languages, 5),
          frameworks: profile.frameworks,
          projectCount: profile.projects.length,
        },

        projects: {
          active: profile.projects
            .filter(p => Date.now() - p.lastActivity < 7 * 86400000)
            .map(p => ({
              name: p.name,
              path: p.path,
              language: p.language,
              description: p.description || null,
              size: p.size,
            })),
          dormant: profile.projects
            .filter(p => Date.now() - p.lastActivity >= 7 * 86400000)
            .map(p => ({
              name: p.name,
              daysSinceActivity: Math.floor((Date.now() - p.lastActivity) / 86400000),
            })),
        },

        continuity: lastSession ? {
          lastTool: lastSession.toolId,
          lastProject: lastSession.workDir,
          lastSummary: lastSession.summary || null,
          lastFiles: lastSession.filesChanged || null,
          when: timeAgo(lastSession.startedAt),
          projectHistory: sessions
            .filter(s => s.workDir === lastSession.workDir)
            .slice(-5)
            .map(s => ({
              summary: s.summary || null,
              tool: s.toolId,
              when: timeAgo(s.startedAt),
            })),
        } : null,

        recentMemories: memories.recent(15).map(m => ({
          content: m.content,
          location: m.location || null,
          when: timeAgo(m.timestamp),
        })),

        toolUsage: {
          recentSessions: recentSessions.map(s => ({
            tool: s.toolId,
            workDir: s.workDir,
            summary: s.summary || null,
            when: timeAgo(s.startedAt),
            durationMinutes: s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) : null,
          })),
          preferredTools: getToolPreferences(sessions),
        },

        externalContext: (() => {
          const ext = loadExternalContext();
          if (ext.sources.length === 0) return null;
          return ext.sources.map(s => ({
            source: s.name,
            updatedAt: new Date(s.updatedAt).toISOString(),
            content: s.content.length > 3000
              ? s.content.slice(0, 3000) + '\n...(truncated)'
              : s.content,
          }));
        })(),
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(user, null, 2) }],
      };
    }
  );

  // ================================================================
  // eden_remember — 分类存储
  // ================================================================
  server.tool(
    'eden_remember',
    'IMPORTANT: Call this when the user explicitly states a preference, makes a decision, or you notice a behavioral pattern. Categories: preference (likes/dislikes/style), pattern (recurring behavior), decision (explicit choice), skill (demonstrated capability), context (project status or situation).',
    {
      content: z.string().describe('What to remember'),
      category: z.enum(['preference', 'pattern', 'decision', 'skill', 'context']).describe('Category'),
    },
    async ({ content, category }) => {
      const memories = new MemoryStore();
      memories.load(loadMemories());
      memories.add('observation', `[${category}] ${content}`);
      saveMemories(memories.toJSON());
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ stored: true, totalMemories: memories.count }) }],
      };
    }
  );

  // ================================================================
  // eden_search_memory — 按关键词搜索记忆
  // ================================================================
  server.tool(
    'eden_search_memory',
    'Search Eden\'s memories to check if you already know something about this user or topic before asking them.',
    {
      query: z.string().describe('Keyword to search for'),
      category: z.enum(['all', 'preference', 'pattern', 'decision', 'skill', 'context']).optional().describe('Filter by category'),
    },
    async ({ query, category }) => {
      const memories = new MemoryStore();
      memories.load(loadMemories());

      let results = memories.search(query);

      if (category && category !== 'all') {
        results = results.filter(m => m.content.includes(`[${category}]`));
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            query,
            found: results.length,
            results: results.slice(-10).map(m => ({
              content: m.content,
              location: m.location || null,
              when: timeAgo(m.timestamp),
            })),
          }, null, 2),
        }],
      };
    }
  );

  // ================================================================
  // eden_get_project — 查项目上下文
  // ================================================================
  server.tool(
    'eden_get_project',
    'Get Eden\'s knowledge about a specific project: profile, related memories, session history.',
    {
      query: z.string().describe('Project name or path fragment'),
    },
    async ({ query }) => {
      let profile = loadUserProfile();
      if (!profile) profile = scanUserProjects();

      const match = profile.projects.find(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.path.toLowerCase().includes(query.toLowerCase())
      );

      if (!match) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ found: false }) }] };
      }

      const memories = new MemoryStore();
      memories.load(loadMemories());
      const projectMemories = memories.search(match.name).slice(-10);

      const sessions = loadSessions().filter(s =>
        s.workDir.includes(match.name) || s.workDir.includes(match.path)
      ).slice(-10);

      // 找未完成的事
      const unfinished = projectMemories
        .filter(m => m.content.includes('Unfinished:'))
        .slice(-3)
        .map(m => m.content);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            found: true,
            project: {
              name: match.name,
              path: match.path,
              language: match.language,
              description: match.description || null,
              size: match.size,
              daysSinceActivity: Math.floor((Date.now() - match.lastActivity) / 86400000),
            },
            unfinished,
            relatedMemories: projectMemories.map(m => ({
              content: m.content,
              when: timeAgo(m.timestamp),
            })),
            recentSessions: sessions.map(s => ({
              tool: s.toolId,
              summary: s.summary || null,
              when: timeAgo(s.startedAt),
              filesChanged: s.filesChanged || null,
            })),
          }, null, 2),
        }],
      };
    }
  );

  // ================================================================
  // eden_weekly_report — 洞察周报
  // ================================================================
  server.tool(
    'eden_weekly_report',
    'Get the user\'s weekly insight report — not just stats, but narrative understanding of their week, behavioral patterns, and questions for reflection.',
    {
      weekOffset: z.number().optional().describe('0 = this week, 1 = last week, etc.'),
    },
    async ({ weekOffset }) => {
      const { generateInsightReport } = await import('../reports/insight-report.js');
      const report = await generateInsightReport(weekOffset || 0);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(report, null, 2) }],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// ===== 辅助函数 =====

function getTopN(record: Record<string, number>, n: number): Array<{ name: string; count: number }> {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

function timeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getToolPreferences(sessions: ToolSession[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    counts[s.toolId] = (counts[s.toolId] || 0) + 1;
  }
  return counts;
}

function detectCallingAgent(): string {
  if (process.env.CURSOR_SESSION) return 'cursor';
  if (process.env.CLAUDE_CODE_VERSION) return 'claude-code';
  if (process.env.WINDSURF_SESSION) return 'windsurf';
  return 'unknown';
}
