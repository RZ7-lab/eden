export interface EdenState {
  name: string;
  createdAt: number;
  lastActiveAt: number;
}

export interface Memory {
  id: string;
  type: 'observation' | 'conversation' | 'milestone' | 'reflection';
  content: string;
  timestamp: number;
  location?: string;
}

export interface ToolSession {
  id: string;
  toolId: string;
  workDir: string;
  startedAt: number;
  endedAt?: number;
  summary?: string;
  filesChanged?: string[];
}

export interface ProjectProfile {
  name: string;
  path: string;
  description: string;
  language: string;
  lastActivity: number;
  size: 'tiny' | 'small' | 'medium' | 'large';
}

export interface UserProfile {
  languages: Record<string, number>;
  frameworks: string[];
  projects: ProjectProfile[];
  lastScanned: number;
}

export interface Insight {
  type: 'warning' | 'nudge' | 'observation' | 'encouragement';
  message: string;
}

export interface RawWeekData {
  git: {
    totalCommits: number;
    projects: Array<{ name: string; commits: number }>;
    peakHours: number[];
    codingDays: number;
  };
  sessions: Array<{
    tool: string;
    summary: string | null;
    when: string;
  }>;
  memories: string[];
  external?: Record<string, unknown>;
}

export interface InsightReport {
  period: { start: string; end: string };
  raw: RawWeekData;
  narrative: string;
  questions: string[];
  patterns: string[];
}

export interface SyncData {
  deviceToken: string;
  state: EdenState;
  profile: UserProfile;
  memories: Memory[];
  sessions: ToolSession[];
  insights?: Insight[];
  weeklyNarrative?: string;
  reports?: InsightReport[];
  firstRun?: boolean;
  syncedAt: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
