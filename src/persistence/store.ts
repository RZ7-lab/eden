import fs from 'node:fs';
import { STATE_PATH, MEMORIES_PATH, ensureEdenDir } from './config.js';
import type { Memory } from '../mind/memory.js';

export interface EdenState {
  name: string;
  createdAt: number;
  lastActiveAt: number;
}

export function loadState(): EdenState | null {
  if (!fs.existsSync(STATE_PATH)) return null;
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveState(state: EdenState): void {
  ensureEdenDir();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function loadMemories(): Memory[] {
  if (!fs.existsSync(MEMORIES_PATH)) return [];
  try {
    const raw = fs.readFileSync(MEMORIES_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMemories(memories: Memory[]): void {
  ensureEdenDir();
  fs.writeFileSync(MEMORIES_PATH, JSON.stringify(memories, null, 2));
}
