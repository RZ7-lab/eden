import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const EDEN_DIR = path.join(os.homedir(), '.eden');
export const CONFIG_PATH = path.join(EDEN_DIR, 'config.json');
export const STATE_PATH = path.join(EDEN_DIR, 'state.json');
export const MEMORIES_PATH = path.join(EDEN_DIR, 'memories.json');
export const JOURNAL_DIR = path.join(EDEN_DIR, 'journal');
export const PROFILE_PATH = path.join(EDEN_DIR, 'user-profile.json');

export interface EdenConfig {
  apiKey: string;
  model: string;
  watchDirs: string[];      // 额外监听的目录
  excludeDirs: string[];    // 排除的目录（隐私）
  excludePatterns: string[];// 排除的文件名模式
  autoReport: boolean;      // 自动生成周报
  reportDay: number;        // 周几生成（0=周日）
  notionToken?: string;     // Notion API integration token
  githubToken?: string;     // GitHub personal access token
  deviceToken?: string;     // 设备标识，用于云端同步
  syncUrl?: string;         // 云端同步地址
}

const DEFAULT_CONFIG: EdenConfig = {
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  watchDirs: [],
  excludeDirs: [],
  excludePatterns: ['.env', '.env.*', '*.pem', '*.key', 'credentials*', 'secrets*'],
  autoReport: true,
  reportDay: 0, // 周日
};

export function ensureEdenDir(): void {
  if (!fs.existsSync(EDEN_DIR)) {
    fs.mkdirSync(EDEN_DIR, { recursive: true });
  }
  if (!fs.existsSync(JOURNAL_DIR)) {
    fs.mkdirSync(JOURNAL_DIR, { recursive: true });
  }
}

export function loadConfig(): EdenConfig {
  if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: EdenConfig): void {
  ensureEdenDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
