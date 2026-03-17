// 记忆系统 — Eden 的经历

export type MemoryType = 'observation' | 'conversation' | 'milestone' | 'reflection';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  timestamp: number;
  location?: string; // 文件路径或目录
}

const MAX_MEMORIES = 500;

export class MemoryStore {
  private memories: Memory[] = [];

  load(data: Memory[]): void {
    this.memories = data;
  }

  add(type: MemoryType, content: string, location?: string): Memory {
    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      content,
      timestamp: Date.now(),
      location,
    };

    this.memories.push(memory);

    // FIFO: 超过上限时删除最早的
    while (this.memories.length > MAX_MEMORIES) {
      this.memories.shift();
    }

    return memory;
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
