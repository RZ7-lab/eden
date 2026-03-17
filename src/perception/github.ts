// GitHub integration — fetch recent activity and write to ~/.eden/external/github.md

import fs from 'node:fs';
import path from 'node:path';
import { ensureExternalDir, EXTERNAL_DIR } from './external.js';

const API_BASE = 'https://api.github.com';

export interface GitHubContext {
  user: {
    login: string;
    bio: string | null;
    company: string | null;
    publicRepos: number;
    followers: number;
  };
  recentActivity: Array<{
    type: string;
    repo: string;
    summary: string;
    when: string;
  }>;
  recentPRs: Array<{
    title: string;
    repo: string;
    state: string;
    when: string;
  }>;
  recentIssues: Array<{
    title: string;
    repo: string;
    state: string;
    when: string;
  }>;
  starredRepos: Array<{
    name: string;
    description: string;
    language: string | null;
  }>;
}

interface GitHubEvent {
  type: string;
  repo: { name: string };
  created_at: string;
  payload: {
    action?: string;
    ref?: string;
    size?: number;
    commits?: Array<{ message: string }>;
    pull_request?: { title: string; merged?: boolean };
    issue?: { title: string };
    review?: { state: string };
  };
}

interface GitHubSearchResult {
  items: Array<{
    title: string;
    repository_url: string;
    state: string;
    pull_request?: { merged_at: string | null };
    updated_at: string;
  }>;
}

interface GitHubStarredRepo {
  full_name: string;
  description: string | null;
  language: string | null;
}

interface GitHubUser {
  login: string;
  bio: string | null;
  company: string | null;
  public_repos: number;
  followers: number;
}

async function ghFetch<T>(endpoint: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

function summarizeEvent(event: GitHubEvent): string {
  const { type, payload } = event;
  switch (type) {
    case 'PushEvent':
      return `Pushed ${payload.size ?? 0} commit(s)${payload.commits?.[0] ? `: ${payload.commits[0].message.split('\n')[0]}` : ''}`;
    case 'PullRequestEvent':
      return `${payload.action ?? 'updated'} PR: ${payload.pull_request?.title ?? ''}`;
    case 'PullRequestReviewEvent':
      return `Reviewed PR: ${payload.pull_request?.title ?? ''} (${payload.review?.state ?? 'commented'})`;
    case 'IssuesEvent':
      return `${payload.action ?? 'updated'} issue: ${payload.issue?.title ?? ''}`;
    case 'IssueCommentEvent':
      return `Commented on issue: ${payload.issue?.title ?? ''}`;
    case 'CreateEvent':
      return `Created ${payload.ref ?? 'repository'}`;
    case 'DeleteEvent':
      return `Deleted ${payload.ref ?? 'branch'}`;
    case 'WatchEvent':
      return 'Starred repo';
    case 'ForkEvent':
      return 'Forked repo';
    case 'ReleaseEvent':
      return `${payload.action ?? 'published'} release`;
    default:
      return type.replace('Event', '');
  }
}

function repoNameFromUrl(url: string): string {
  // https://api.github.com/repos/owner/name -> owner/name
  const match = url.match(/repos\/(.+)$/);
  return match ? match[1] : url;
}

export async function fetchGitHubContext(token: string): Promise<GitHubContext> {
  // Fetch user profile first (need username for other calls)
  const user = await ghFetch<GitHubUser>('/user', token);

  // Fetch the rest in parallel
  const [events, prs, issues, starred] = await Promise.all([
    ghFetch<GitHubEvent[]>(`/users/${user.login}/events?per_page=10`, token).catch(() => [] as GitHubEvent[]),
    ghFetch<GitHubSearchResult>(`/search/issues?q=author:${user.login}+type:pr&sort=updated&per_page=5`, token).catch(() => ({ items: [] } as GitHubSearchResult)),
    ghFetch<GitHubSearchResult>(`/search/issues?q=author:${user.login}+type:issue&sort=updated&per_page=5`, token).catch(() => ({ items: [] } as GitHubSearchResult)),
    ghFetch<GitHubStarredRepo[]>(`/users/${user.login}/starred?per_page=5&sort=updated`, token).catch(() => [] as GitHubStarredRepo[]),
  ]);

  return {
    user: {
      login: user.login,
      bio: user.bio,
      company: user.company,
      publicRepos: user.public_repos,
      followers: user.followers,
    },
    recentActivity: events.map(e => ({
      type: e.type,
      repo: e.repo.name,
      summary: summarizeEvent(e),
      when: e.created_at,
    })),
    recentPRs: prs.items.map(item => ({
      title: item.title,
      repo: repoNameFromUrl(item.repository_url),
      state: item.pull_request?.merged_at ? 'merged' : item.state,
      when: item.updated_at,
    })),
    recentIssues: issues.items.map(item => ({
      title: item.title,
      repo: repoNameFromUrl(item.repository_url),
      state: item.state,
      when: item.updated_at,
    })),
    starredRepos: starred.map(r => ({
      name: r.full_name,
      description: r.description ?? '',
      language: r.language,
    })),
  };
}

export async function syncGitHub(token: string): Promise<{ outputPath: string; events: number }> {
  const ctx = await fetchGitHubContext(token);

  // Build markdown summary
  const lines: string[] = [
    '# GitHub Activity',
    '',
    `Synced: ${new Date().toISOString().slice(0, 16)}`,
    '',
    '## Profile',
    '',
    `- **${ctx.user.login}**`,
  ];

  if (ctx.user.bio) lines.push(`- Bio: ${ctx.user.bio}`);
  if (ctx.user.company) lines.push(`- Company: ${ctx.user.company}`);
  lines.push(`- ${ctx.user.publicRepos} public repos · ${ctx.user.followers} followers`);

  // Recent activity
  if (ctx.recentActivity.length > 0) {
    lines.push('', '## Recent Activity', '');
    for (const a of ctx.recentActivity) {
      const date = a.when.slice(0, 10);
      lines.push(`- **${a.repo}** — ${a.summary} (${date})`);
    }
  }

  // PRs
  if (ctx.recentPRs.length > 0) {
    lines.push('', '## Recent Pull Requests', '');
    for (const pr of ctx.recentPRs) {
      const date = pr.when.slice(0, 10);
      lines.push(`- [${pr.state}] **${pr.title}** in ${pr.repo} (${date})`);
    }
  }

  // Issues
  if (ctx.recentIssues.length > 0) {
    lines.push('', '## Recent Issues', '');
    for (const issue of ctx.recentIssues) {
      const date = issue.when.slice(0, 10);
      lines.push(`- [${issue.state}] **${issue.title}** in ${issue.repo} (${date})`);
    }
  }

  // Starred
  if (ctx.starredRepos.length > 0) {
    lines.push('', '## Recently Starred', '');
    for (const repo of ctx.starredRepos) {
      const lang = repo.language ? ` (${repo.language})` : '';
      lines.push(`- **${repo.name}**${lang} — ${repo.description || 'No description'}`);
    }
  }

  // Write to external dir
  ensureExternalDir();
  const outputPath = path.join(EXTERNAL_DIR, 'github.md');
  fs.writeFileSync(outputPath, lines.join('\n'));

  return { outputPath, events: ctx.recentActivity.length };
}
