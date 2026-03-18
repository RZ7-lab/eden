// Proactive Insights — Eden 主动说出你需要注意的事

import { type UserProfile } from './deep-read.js';
import { MemoryStore } from '../mind/memory.js';
import { loadSessions, type ToolSession } from '../tools/session.js';
import { perceiveGit } from './git.js';

export interface ProactiveInsight {
  type: 'warning' | 'nudge' | 'observation' | 'encouragement';
  message: string;
}

export async function generateProactiveInsights(
  profile: UserProfile,
  memories: MemoryStore,
  currentStatus: string[],
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];
  const sessions = loadSessions();
  const now = Date.now();
  const DAY = 86400000;

  // ===== 1. 注意力分散检测 =====
  const recentSessions = sessions.filter(s => now - s.startedAt < 3 * DAY);
  const recentProjects = new Set(recentSessions.map(s => {
    const parts = s.workDir.split('/');
    return parts[parts.length - 1];
  }));
  if (recentProjects.size > 4) {
    insights.push({
      type: 'warning',
      message: `你最近 3 天切换了 ${recentProjects.size} 个项目。注意力可能太分散了。`,
    });
  }

  // ===== 2. 沉睡项目提醒 =====
  const dormant = profile.projects.filter(p => {
    const days = (now - p.lastActivity) / DAY;
    return days >= 7 && days <= 30;
  });
  if (dormant.length >= 3) {
    const names = dormant.slice(0, 3).map(p => p.name).join('、');
    insights.push({
      type: 'nudge',
      message: `${names} 等 ${dormant.length} 个项目超过一周没动了。要放弃还是继续？`,
    });
  }

  // ===== 3. 未兑现的决定 =====
  const decisions = memories.recent(200)
    .filter(m => m.content.includes('[decision]'))
    .slice(-5);

  for (const d of decisions) {
    const age = (now - d.timestamp) / DAY;
    if (age > 3) {
      // 检查这个决定之后有没有相关活动
      const topic = d.content.replace('[decision] ', '').slice(0, 30);
      insights.push({
        type: 'nudge',
        message: `${Math.floor(age)} 天前你决定: "${topic}"。有跟进吗？`,
      });
      break; // 只提一个
    }
  }

  // ===== 4. 深夜编码警告 =====
  const hour = new Date().getHours();
  const lateNightSessions = sessions.filter(s => {
    const h = new Date(s.startedAt).getHours();
    return (h >= 0 && h < 5) && (now - s.startedAt < 7 * DAY);
  });
  if (lateNightSessions.length >= 3) {
    insights.push({
      type: 'warning',
      message: `这周有 ${lateNightSessions.length} 次凌晨编码。注意休息。`,
    });
  }
  if (hour >= 0 && hour < 5) {
    insights.push({
      type: 'warning',
      message: '现在是凌晨。',
    });
  }

  // ===== 5. 编码频率变化 =====
  const thisWeekSessions = sessions.filter(s => now - s.startedAt < 7 * DAY);
  const lastWeekSessions = sessions.filter(s => {
    const age = now - s.startedAt;
    return age >= 7 * DAY && age < 14 * DAY;
  });
  if (lastWeekSessions.length > 0 && thisWeekSessions.length < lastWeekSessions.length * 0.5) {
    insights.push({
      type: 'observation',
      message: `这周的活跃度只有上周的 ${Math.round(thisWeekSessions.length / lastWeekSessions.length * 100)}%。是在思考还是卡住了？`,
    });
  }

  // ===== 6. 单一项目过度集中 =====
  if (recentSessions.length >= 5) {
    const projectCounts: Record<string, number> = {};
    for (const s of recentSessions) {
      const name = s.workDir.split('/').pop() || 'unknown';
      projectCounts[name] = (projectCounts[name] || 0) + 1;
    }
    const sorted = Object.entries(projectCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const topPct = sorted[0][1] / recentSessions.length;
      if (topPct > 0.8 && sorted.length > 1) {
        insights.push({
          type: 'observation',
          message: `${Math.round(topPct * 100)}% 的时间都在 ${sorted[0][0]}。其他项目要不要看看？`,
        });
      }
    }
  }

  // ===== 7. 连续工作时间 =====
  if (sessions.length >= 2) {
    const latest = sessions[sessions.length - 1];
    const secondLatest = sessions[sessions.length - 2];
    if (latest.startedAt - (secondLatest.endedAt || secondLatest.startedAt) < 10 * 60 * 1000) {
      // 两个 session 间隔不到 10 分钟，可能连续工作很久
      const streak = now - secondLatest.startedAt;
      if (streak > 3 * 60 * 60 * 1000) {
        insights.push({
          type: 'nudge',
          message: `已经连续工作 ${Math.round(streak / 3600000)} 小时了。休息一下？`,
        });
      }
    }
  }

  // ===== 8. 正面鼓励 =====
  const thisWeekCommits = profile.projects.reduce((sum, p) => {
    return sum + (now - p.lastActivity < 7 * DAY ? 1 : 0);
  }, 0);
  if (thisWeekCommits >= 5 && insights.filter(i => i.type === 'warning').length === 0) {
    insights.push({
      type: 'encouragement',
      message: `这周有 ${thisWeekCommits} 个项目在活跃。节奏不错。`,
    });
  }

  return insights;
}

// 格式化为一段文字（给 agent 的 wakeUpNote 用）
export function insightsToNote(insights: ProactiveInsight[]): string {
  if (insights.length === 0) return '';

  return insights
    .slice(0, 3) // 最多 3 条
    .map(i => i.message)
    .join(' ');
}

// 格式化为终端显示
export function insightsToTerminal(insights: ProactiveInsight[]): string[] {
  const icons: Record<string, string> = {
    warning: '⚠',
    nudge: '→',
    observation: '·',
    encouragement: '✦',
  };

  return insights.slice(0, 3).map(i => `${icons[i.type] || '·'} ${i.message}`);
}
