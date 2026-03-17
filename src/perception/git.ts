// Git 感知 — Eden 读你的历史

import { simpleGit, type SimpleGit, type LogResult } from 'simple-git';
import path from 'node:path';
import fs from 'node:fs';

export interface GitPerception {
  isRepo: boolean;
  branch?: string;
  recentCommits: GitCommitInfo[];
  hasUncommitted: boolean;
  uncommittedFiles: string[];
}

export interface GitCommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  filesChanged?: number;
}

export async function perceiveGit(dir: string): Promise<GitPerception> {
  // 往上找 .git 目录
  let current = dir;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git'))) break;
    current = path.dirname(current);
  }

  if (!fs.existsSync(path.join(current, '.git'))) {
    return { isRepo: false, recentCommits: [], hasUncommitted: false, uncommittedFiles: [] };
  }

  const git: SimpleGit = simpleGit(current);

  try {
    const [status, log] = await Promise.all([
      git.status(),
      git.log({ maxCount: 5 }),
    ]);

    const recentCommits: GitCommitInfo[] = (log as LogResult).all.map(c => ({
      hash: c.hash.slice(0, 7),
      message: c.message,
      author: c.author_name,
      date: c.date,
    }));

    const uncommittedFiles = [
      ...status.modified,
      ...status.not_added,
      ...status.created,
      ...status.deleted,
    ];

    return {
      isRepo: true,
      branch: status.current || undefined,
      recentCommits,
      hasUncommitted: uncommittedFiles.length > 0,
      uncommittedFiles,
    };
  } catch {
    return { isRepo: false, recentCommits: [], hasUncommitted: false, uncommittedFiles: [] };
  }
}
