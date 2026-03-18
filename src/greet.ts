#!/usr/bin/env node
// Eden 终端问候 — 每次开终端时显示一行

import { loadState, loadMemories } from './persistence/store.js';
import { loadUserProfile } from './perception/deep-read.js';
import { generateProactiveInsights, insightsToTerminal } from './perception/proactive.js';
import { MemoryStore } from './mind/memory.js';

async function greet(): Promise<void> {
  const state = loadState();
  if (!state) return; // Eden 没初始化

  const profile = loadUserProfile();
  if (!profile) return;

  const memories = new MemoryStore();
  memories.load(loadMemories());

  const insights = await generateProactiveInsights(profile, memories, []);

  if (insights.length > 0) {
    const lines = insightsToTerminal(insights);
    // 只显示最重要的一条
    console.log(`  \x1b[36meden\x1b[0m  \x1b[2m${lines[0]}\x1b[0m`);
  }
}

greet().catch(() => {});
