// Git Activity Tracker — Eden 追踪你的编码节奏

import { simpleGit, type SimpleGit } from 'simple-git';
import path from 'node:path';
import fs from 'node:fs';

export interface GitActivity {
  totalCommits7d: number;
  commitsByDay: Record<string, number>;  // day of week -> count
  commitsByHour: number[];               // 24 slots
  topFiles: Array<{ file: string; changes: number }>;
  avgCommitMessageLength: number;
  recentCommits: Array<{ project: string; message: string; date: string; hash: string }>;
}

interface RawCommit {
  project: string;
  hash: string;
  message: string;
  date: Date;
  files: string[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function trackGitActivity(projectPaths: string[], offsetWeeks: number = 0): Promise<GitActivity> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - offsetWeeks * 7);
  const sevenDaysAgo = new Date(endDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const since = sevenDaysAgo.toISOString().split('T')[0];
  const until = endDate.toISOString().split('T')[0];

  const allCommits: RawCommit[] = [];

  for (const projectPath of projectPaths) {
    // Find the git root
    let gitRoot = projectPath;
    while (gitRoot !== path.dirname(gitRoot)) {
      if (fs.existsSync(path.join(gitRoot, '.git'))) break;
      gitRoot = path.dirname(gitRoot);
    }
    if (!fs.existsSync(path.join(gitRoot, '.git'))) continue;

    try {
      const git: SimpleGit = simpleGit(gitRoot);
      const projectName = path.basename(projectPath);

      // Get commits from last 7 days
      const log = await git.log(['--since', since, '--until', until]);

      for (const entry of log.all) {
        const commitDate = new Date(entry.date);
        if (commitDate < sevenDaysAgo) continue;

        // Get files changed in this commit
        let files: string[] = [];
        try {
          const diff = await git.diff([`${entry.hash}~1`, entry.hash, '--name-only']);
          files = diff.split('\n').filter(f => f.trim().length > 0);
        } catch {
          // First commit or other edge case
        }

        allCommits.push({
          project: projectName,
          hash: entry.hash.slice(0, 7),
          message: entry.message,
          date: commitDate,
          files,
        });
      }
    } catch {
      // Skip repos that fail
    }
  }

  // Deduplicate commits by hash (same repo might appear in multiple project paths)
  const seen = new Set<string>();
  const uniqueCommits = allCommits.filter(c => {
    const key = `${c.project}:${c.hash}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date descending
  uniqueCommits.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Commits by day of week
  const commitsByDay: Record<string, number> = {};
  for (const name of DAY_NAMES) commitsByDay[name] = 0;
  for (const c of uniqueCommits) {
    const day = DAY_NAMES[c.date.getDay()];
    commitsByDay[day]++;
  }

  // Commits by hour
  const commitsByHour: number[] = new Array(24).fill(0);
  for (const c of uniqueCommits) {
    commitsByHour[c.date.getHours()]++;
  }

  // Top files
  const fileCounts: Record<string, number> = {};
  for (const c of uniqueCommits) {
    for (const f of c.files) {
      fileCounts[f] = (fileCounts[f] || 0) + 1;
    }
  }
  const topFiles = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([file, changes]) => ({ file, changes }));

  // Average commit message length (in words)
  const totalWords = uniqueCommits.reduce((sum, c) => sum + c.message.split(/\s+/).length, 0);
  const avgCommitMessageLength = uniqueCommits.length > 0
    ? Math.round(totalWords / uniqueCommits.length)
    : 0;

  // Recent commits (top 30)
  const recentCommits = uniqueCommits.slice(0, 30).map(c => ({
    project: c.project,
    message: c.message,
    date: c.date.toISOString(),
    hash: c.hash,
  }));

  return {
    totalCommits7d: uniqueCommits.length,
    commitsByDay,
    commitsByHour,
    topFiles,
    avgCommitMessageLength,
    recentCommits,
  };
}
