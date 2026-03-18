// 记忆系统 — Eden 的经历

export type MemoryType = 'observation' | 'conversation' | 'milestone' | 'reflection';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  timestamp: number;
  location?: string; // 文件路径或目录
  priority: number;  // 1-5, higher = more important
}

const MAX_MEMORIES = 500;
const DISTILL_THRESHOLD = 400;
const DISTILL_BATCH = 50;

/** Assign priority based on content tags and memory type */
function assignPriority(type: MemoryType, content: string): number {
  // Tag-based priority (check content for bracketed tags)
  if (content.includes('[preference]')) return 5;
  if (content.includes('[decision]')) return 4;
  if (content.includes('[pattern]')) return 4;
  if (content.includes('[skill]')) return 3;
  if (content.includes('[context]')) return 2;

  // Type-based priority
  if (type === 'milestone') return 5;
  if (type === 'conversation') return 2;

  // Default: plain observation
  return 1;
}

export class MemoryStore {
  private memories: Memory[] = [];

  load(data: Memory[]): void {
    // Handle old memories without priority field — default to 1
    this.memories = data.map(m => ({
      ...m,
      priority: m.priority ?? 1,
    }));
  }

  add(type: MemoryType, content: string, location?: string): Memory {
    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      content,
      timestamp: Date.now(),
      location,
      priority: assignPriority(type, content),
    };

    this.memories.push(memory);

    // Distill before hard eviction
    if (this.memories.length > DISTILL_THRESHOLD) {
      this.distill();
    }

    // Priority-based eviction: evict lowest priority first, oldest within same priority
    while (this.memories.length > MAX_MEMORIES) {
      this.evictOne();
    }

    return memory;
  }

  /** Evict one memory: lowest priority first, then oldest within that priority */
  private evictOne(): void {
    if (this.memories.length === 0) return;

    let minPriority = Infinity;
    let oldestIdx = 0;
    let oldestTimestamp = Infinity;

    for (let i = 0; i < this.memories.length; i++) {
      const m = this.memories[i];
      if (m.priority < minPriority ||
          (m.priority === minPriority && m.timestamp < oldestTimestamp)) {
        minPriority = m.priority;
        oldestTimestamp = m.timestamp;
        oldestIdx = i;
      }
    }

    this.memories.splice(oldestIdx, 1);
  }

  /** Compress old low-priority memories into distilled summaries */
  distill(): void {
    // Find all priority-1 observations, sorted oldest first
    const observations = this.memories
      .filter(m => m.priority === 1)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (observations.length < DISTILL_BATCH) return;

    const toDistill = observations.slice(0, DISTILL_BATCH);
    const toDistillIds = new Set(toDistill.map(m => m.id));

    // Group by location (or 'general' if none)
    const groups = new Map<string, Memory[]>();
    for (const m of toDistill) {
      const key = m.location ?? 'general';
      const arr = groups.get(key);
      if (arr) {
        arr.push(m);
      } else {
        groups.set(key, [m]);
      }
    }

    // Remove all distilled originals
    this.memories = this.memories.filter(m => !toDistillIds.has(m.id));

    // Create one summary per group
    for (const [loc, mems] of groups) {
      const earliest = new Date(mems[0].timestamp);
      const latest = new Date(mems[mems.length - 1].timestamp);

      const fmtDate = (d: Date) => `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;

      // Extract rough topics from content (first few words of each)
      const snippets = mems
        .slice(0, 5)
        .map(m => m.content.slice(0, 30).replace(/\n/g, ' ').trim())
        .join(', ');

      const summary = `[distilled] ${mems.length} observations about ${loc} between ${fmtDate(earliest)}-${fmtDate(latest)}: ${snippets}`;

      this.memories.push({
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'reflection',
        content: summary,
        timestamp: latest.getTime(),
        location: loc === 'general' ? undefined : loc,
        priority: 2, // distilled summaries are slightly more valuable than raw observations
      });
    }
  }

  // 获取最近 N 条记忆
  recent(n: number = 10): Memory[] {
    return this.memories.slice(-n);
  }

  // 按类型获取
  byType(type: MemoryType): Memory[] {
    return this.memories.filter(m => m.type === type);
  }

  // 搜索包含关键词的记忆
  search(keyword: string): Memory[] {
    const lower = keyword.toLowerCase();
    return this.memories.filter(m =>
      m.content.toLowerCase().includes(lower) ||
      (m.location && m.location.toLowerCase().includes(lower))
    );
  }

  // 给 LLM 用的记忆摘要
  toContext(n: number = 10): string {
    const recent = this.recent(n);
    if (recent.length === 0) return '（还没有记忆）';

    return recent.map(m => {
      const time = new Date(m.timestamp).toLocaleString('zh-CN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const loc = m.location ? ` [${m.location}]` : '';
      return `[${time}]${loc} ${m.content}`;
    }).join('\n');
  }

  toJSON(): Memory[] {
    return this.memories;
  }

  get count(): number {
    return this.memories.length;
  }
}
