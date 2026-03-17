// 深度阅读 — Eden 真正理解你的项目和文件

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PROFILE_PATH } from '../persistence/config.js';

// Eden 对用户的理解，随时间积累
export interface UserProfile {
  // 技术栈
  languages: Record<string, number>;      // 语言 → 文件数
  frameworks: string[];                    // 发现的框架
  // 项目画像
  projects: ProjectProfile[];
  // 行为模式
  patterns: {
    activeHours: number[];                 // 活跃时段分布
    commitFrequency: string;               // 提交频率描述
    codeStyle: string;                     // 代码风格观察
  };
  // 上次更新
  lastScanned: number;
}

export interface ProjectProfile {
  path: string;
  name: string;
  description: string;          // 从 README/package.json 读取
  language: string;             // 主要语言
  lastActivity: number;         // 最后修改时间
  size: 'tiny' | 'small' | 'medium' | 'large';
  mood: string;                 // Eden 对这个项目的感觉
}

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript',
  '.py': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.c': 'C', '.h': 'C',
  '.cpp': 'C++', '.hpp': 'C++',
  '.rb': 'Ruby',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.css': 'CSS', '.scss': 'SCSS',
  '.html': 'HTML',
  '.md': 'Markdown',
  '.json': 'JSON',
  '.yaml': 'YAML', '.yml': 'YAML',
  '.toml': 'TOML',
  '.sql': 'SQL',
  '.sh': 'Shell', '.zsh': 'Shell',
};

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.cache', '.vscode', '.idea', 'vendor', 'target', 'coverage',
  'Library', 'Applications', '.Trash',
]);

// 扫描用户的项目目录，构建理解
export function scanUserProjects(baseDir?: string): UserProfile {
  const home = baseDir || os.homedir();
  const languages: Record<string, number> = {};
  const frameworks: string[] = [];
  const projects: ProjectProfile[] = [];

  // 扫描 home 下的一级目录找项目
  const markers = ['package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml', '.git'];

  function findProjects(dir: string, depth: number): void {
    if (depth > 2) return;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    // 检查当前目录是否是项目
    const hasMarker = markers.some(m => {
      try { return fs.existsSync(path.join(dir, m)); } catch { return false; }
    });

    if (hasMarker && dir !== home) {
      const profile = analyzeProject(dir);
      if (profile) {
        projects.push(profile);
        // 统计语言
        countLanguages(dir, languages, 0);
      }
      return; // 不继续往下找嵌套项目
    }

    // 继续往下找
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      findProjects(path.join(dir, entry.name), depth + 1);
    }
  }

  findProjects(home, 0);

  // 检测框架
  for (const proj of projects) {
    const detected = detectFrameworks(proj.path);
    for (const fw of detected) {
      if (!frameworks.includes(fw)) frameworks.push(fw);
    }
  }

  // 按活跃度排序
  projects.sort((a, b) => b.lastActivity - a.lastActivity);

  const profile: UserProfile = {
    languages,
    frameworks,
    projects: projects.slice(0, 15), // 最多记 15 个项目
    patterns: {
      activeHours: [],
      commitFrequency: '',
      codeStyle: '',
    },
    lastScanned: Date.now(),
  };

  // 持久化
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2));

  return profile;
}

function analyzeProject(dir: string): ProjectProfile | null {
  const name = path.basename(dir);
  let description = '';
  let language = 'unknown';
  let lastActivity = 0;

  // 读 package.json
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
    if (pkg.description) description = pkg.description;
    language = 'TypeScript';
    // 检查是否真的有 ts
    if (!fs.existsSync(path.join(dir, 'tsconfig.json'))) language = 'JavaScript';
  } catch {}

  // 读 Cargo.toml
  if (!description) {
    try {
      const cargo = fs.readFileSync(path.join(dir, 'Cargo.toml'), 'utf-8');
      const descMatch = cargo.match(/description\s*=\s*"([^"]+)"/);
      if (descMatch) description = descMatch[1];
      language = 'Rust';
    } catch {}
  }

  // 读 README 的第一段
  if (!description) {
    for (const readme of ['README.md', 'readme.md', 'README']) {
      try {
        const content = fs.readFileSync(path.join(dir, readme), 'utf-8');
        // 跳过标题行，取第一个非空段落
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && trimmed.length > 10) {
            description = trimmed.slice(0, 150);
            break;
          }
        }
        break;
      } catch {}
    }
  }

  // 最后修改时间
  try {
    const stat = fs.statSync(dir);
    lastActivity = stat.mtimeMs;
  } catch {}

  // 项目大小
  const fileCount = countFiles(dir, 0);
  const size = fileCount < 10 ? 'tiny' : fileCount < 50 ? 'small' : fileCount < 200 ? 'medium' : 'large';

  return {
    path: dir,
    name,
    description: description || '',
    language,
    lastActivity,
    size,
    mood: '', // 由 LLM 后续填充
  };
}

function countFiles(dir: string, depth: number): number {
  if (depth > 3) return 0;
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      if (entry.isFile()) count++;
      else if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name), depth + 1);
    }
  } catch {}
  return count;
}

function countLanguages(dir: string, languages: Record<string, number>, depth: number): void {
  if (depth > 3) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const lang = EXT_TO_LANG[ext];
        if (lang) languages[lang] = (languages[lang] || 0) + 1;
      } else if (entry.isDirectory()) {
        countLanguages(path.join(dir, entry.name), languages, depth + 1);
      }
    }
  } catch {}
}

function detectFrameworks(dir: string): string[] {
  const frameworks: string[] = [];
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.react) frameworks.push('React');
    if (deps.vue) frameworks.push('Vue');
    if (deps.svelte) frameworks.push('Svelte');
    if (deps.next) frameworks.push('Next.js');
    if (deps.express) frameworks.push('Express');
    if (deps.vite) frameworks.push('Vite');
    if (deps['three']) frameworks.push('Three.js');
    if (deps.electron) frameworks.push('Electron');
    if (deps.tailwindcss) frameworks.push('Tailwind');
    if (deps.prisma || deps['@prisma/client']) frameworks.push('Prisma');
  } catch {}
  return frameworks;
}

// 读取一个文件的精华（给 LLM 看的摘要）
export function readFileEssence(filePath: string): string | null {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 200 * 1024) return null; // 跳过 >200KB
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('\0')) return null; // 二进制

    const lines = content.split('\n');
    const totalLines = lines.length;

    // 对于短文件，全部返回
    if (totalLines <= 50) return content;

    // 对于长文件，取头 + 尾 + 关键行
    const head = lines.slice(0, 20).join('\n');
    const tail = lines.slice(-10).join('\n');

    // 找关键行：导出、类定义、函数定义
    const keyLines = lines.filter(l =>
      /^export\s/.test(l.trim()) ||
      /^(class|interface|type|function|const\s+\w+\s*=)/.test(l.trim()) ||
      /^##?\s/.test(l.trim())  // markdown 标题
    ).slice(0, 15);

    return [
      `[文件: ${path.basename(filePath)}, ${totalLines} 行]`,
      head,
      keyLines.length > 0 ? `\n...\n关键定义:\n${keyLines.join('\n')}` : '',
      `\n...\n[末尾]\n${tail}`,
    ].filter(Boolean).join('\n');
  } catch {
    return null;
  }
}

// 加载已有的 profile
export function loadUserProfile(): UserProfile | null {
  try {
    const raw = fs.readFileSync(PROFILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// 生成 profile 的文本摘要（给 LLM 用）
export function profileToContext(profile: UserProfile): string {
  const lines: string[] = [];

  // 语言分布
  const topLangs = Object.entries(profile.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => `${lang}(${count})`)
    .join(', ');
  if (topLangs) lines.push(`常用语言: ${topLangs}`);

  // 框架
  if (profile.frameworks.length > 0) {
    lines.push(`技术栈: ${profile.frameworks.join(', ')}`);
  }

  // 项目
  const activeProjects = profile.projects
    .filter(p => Date.now() - p.lastActivity < 7 * 24 * 60 * 60 * 1000) // 7天内活跃
    .slice(0, 5);

  if (activeProjects.length > 0) {
    lines.push('');
    lines.push('最近活跃的项目:');
    for (const p of activeProjects) {
      const desc = p.description ? ` — ${p.description}` : '';
      lines.push(`  ${p.name} (${p.language}, ${p.size})${desc}`);
    }
  }

  const dormantProjects = profile.projects
    .filter(p => Date.now() - p.lastActivity >= 7 * 24 * 60 * 60 * 1000)
    .slice(0, 3);

  if (dormantProjects.length > 0) {
    lines.push('');
    lines.push('沉睡的项目:');
    for (const p of dormantProjects) {
      const days = Math.floor((Date.now() - p.lastActivity) / 1000 / 60 / 60 / 24);
      lines.push(`  ${p.name} — ${days}天没动了`);
    }
  }

  return lines.join('\n');
}
