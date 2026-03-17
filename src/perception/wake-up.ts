// 醒来感知 — Eden 被叫醒时做的第一件事

import { loadState, saveState, loadMemories, saveMemories } from '../persistence/store.js';
import { loadUserProfile, scanUserProjects, type UserProfile } from './deep-read.js';
import { perceiveGit } from './git.js';
import { MemoryStore } from '../mind/memory.js';
import { loadSessions } from '../tools/session.js';
import { loadExternalContext, externalContextSummary } from './external.js';
import os from 'node:os';

export interface WakeUpResult {
  elapsed: number;           // 睡了多久（ms）
  scanLevel: 'cache' | 'quick' | 'full';
  changes: string[];         // 发现的变化
  wakeUpNote: string;        // 给 agent 的一句话
  profile: UserProfile;
  memories: MemoryStore;
  externalSummary: string | null;  // summary of GitHub/Notion/external data
}

export async function wakeUp(): Promise<WakeUpResult> {
  const state = loadState();
  const now = Date.now();
  const lastActive = state?.lastActiveAt || 0;
  const elapsed = now - lastActive;

  const memories = new MemoryStore();
  memories.load(loadMemories());

  // 更新活跃时间
  if (state) {
    saveState({ ...state, lastActiveAt: now });
  }

  // < 5 分钟：返回缓存
  if (elapsed < 5 * 60 * 1000) {
    const profile = loadUserProfile() || await scanUserProjects();
    return {
      elapsed,
      scanLevel: 'cache',
      changes: [],
      wakeUpNote: '',
      profile,
      memories,
      externalSummary: null,
    };
  }

  // 5 分钟 - 1 小时：轻量扫描（只看 git）
  if (elapsed < 60 * 60 * 1000) {
    const profile = loadUserProfile() || await scanUserProjects();
    const changes = await quickGitScan(profile);

    if (changes.length > 0) {
      memories.add('observation', `醒来（${formatDuration(elapsed)}后）: ${changes.join(', ')}`);
      saveMemories(memories.toJSON());
    }

    return {
      elapsed,
      scanLevel: 'quick',
      changes,
      wakeUpNote: changes.length > 0
        ? `${formatDuration(elapsed)}没见。${changes.join('。')}。`
        : `${formatDuration(elapsed)}没见。没什么变化。`,
      profile,
      memories,
      externalSummary: null,
    };
  }

  // > 1 小时：完整扫描
  const oldProfile = loadUserProfile();
  const newProfile = scanUserProjects();
  const changes: string[] = [];

  // 对比项目变化
  if (oldProfile) {
    const profileChanges = diffProfiles(oldProfile, newProfile);
    changes.push(...profileChanges);
  }

  // git 变化
  const gitChanges = await quickGitScan(newProfile);
  changes.push(...gitChanges);

  // 读取外部上下文（GitHub/Notion 等）
  const extSummary = externalContextSummary() || null;
  if (extSummary) {
    changes.push('有外部数据更新（GitHub/Notion）');
  }

  // 记住变化
  if (changes.length > 0) {
    memories.add('observation', `深度醒来（${formatDuration(elapsed)}后）: ${changes.join(', ')}`);
  } else {
    memories.add('observation', `醒来，${formatDuration(elapsed)}没见。一切如旧。`);
  }
  saveMemories(memories.toJSON());

  return {
    elapsed,
    scanLevel: 'full',
    changes,
    wakeUpNote: changes.length > 0
      ? `${formatDuration(elapsed)}没见。发现: ${changes.join('。')}。`
      : `${formatDuration(elapsed)}没见。世界很安静。`,
    profile: newProfile,
    memories,
    externalSummary: extSummary,
  };
}

// 快速 git 扫描：看最近的 commit
async function quickGitScan(profile: UserProfile): Promise<string[]> {
  const changes: string[] = [];
  const state = loadState();
  const lastActive = state?.lastActiveAt || 0;

  for (const project of profile.projects.slice(0, 5)) {
    try {
      const git = await perceiveGit(project.path);
      if (!git.isRepo) continue;

      // 找到 lastActive 之后的新 commit
      const newCommits = git.recentCommits.filter(c => {
        const commitDate = new Date(c.date).getTime();
        return commitDate > lastActive;
      });

      if (newCommits.length > 0) {
        changes.push(`${project.name}: ${newCommits.length} 个新 commit`);
      }

      if (git.hasUncommitted) {
        changes.push(`${project.name}: 有未提交的改动`);
      }
    } catch { /* skip */ }
  }

  return changes;
}

// 对比两个 profile 的差异
function diffProfiles(old: UserProfile, now: UserProfile): string[] {
  const changes: string[] = [];

  // 新项目
  const oldNames = new Set(old.projects.map(p => p.name));
  const newProjects = now.projects.filter(p => !oldNames.has(p.name));
  if (newProjects.length > 0) {
    changes.push(`发现新项目: ${newProjects.map(p => p.name).join(', ')}`);
  }

  // 新框架
  const oldFrameworks = new Set(old.frameworks);
  const newFrameworks = now.frameworks.filter(f => !oldFrameworks.has(f));
  if (newFrameworks.length > 0) {
    changes.push(`新技术: ${newFrameworks.join(', ')}`);
  }

  // 活跃项目变化
  const oldActive = old.projects
    .filter(p => Date.now() - p.lastActivity < 7 * 86400000)
    .map(p => p.name);
  const nowActive = now.projects
    .filter(p => Date.now() - p.lastActivity < 7 * 86400000)
    .map(p => p.name);

  const wokenUp = nowActive.filter(n => !oldActive.includes(n));
  if (wokenUp.length > 0) {
    changes.push(`重新活跃: ${wokenUp.join(', ')}`);
  }

  const sleptDown = oldActive.filter(n => !nowActive.includes(n));
  if (sleptDown.length > 0) {
    changes.push(`沉睡了: ${sleptDown.join(', ')}`);
  }

  return changes;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时`;
  const days = Math.floor(hours / 24);
  return `${days} 天`;
}
