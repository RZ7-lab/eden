"use client";

import { useState, useEffect, useCallback } from "react";
import TokenInput from "@/components/TokenInput";
import type { SyncData, Memory, Insight } from "@/lib/types";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f7df1e", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", Ruby: "#701516",
  CSS: "#563d7c", HTML: "#e34c26", Shell: "#89e051", Swift: "#F05138",
};

const INSIGHT_ICONS: Record<string, string> = {
  warning: "⚠", nudge: "→", observation: "·", encouragement: "✦",
};

const INSIGHT_COLORS: Record<string, string> = {
  warning: "var(--amber, #f59e0b)", nudge: "var(--accent)",
  observation: "var(--dim)", encouragement: "var(--green)",
};

function formatAge(ms: number): string {
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function timeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<SyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);

  const fetchData = useCallback(async (t: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/user/${t}`);
      if (!res.ok) { setError("Not found"); setToken(null); localStorage.removeItem("eden-token"); return; }
      setData(await res.json());
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) { localStorage.setItem("eden-token", urlToken); setToken(urlToken); fetchData(urlToken); return; }
    const saved = localStorage.getItem("eden-token");
    if (saved) { setToken(saved); fetchData(saved); }
    else { setLoading(false); }
  }, [fetchData]);

  // Detect first run
  useEffect(() => {
    if (data && !localStorage.getItem("eden-welcomed")) {
      const isFirstRun = data.firstRun || (data.memories.length <= 1 && data.memories[0]?.id === 'mem_birth');
      if (isFirstRun) setShowWelcome(true);
    }
  }, [data]);

  if (!token && !loading) return <TokenInput onTokenSubmit={(t) => { setToken(t); fetchData(t); }} />;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-[var(--dim)] text-sm">Loading...</div></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center"><p className="text-red-400 text-sm">{error || "No data"}</p></div>;

  const sortedLangs = Object.entries(data.profile.languages).sort((a, b) => b[1] - a[1]);
  const totalLangLines = sortedLangs.reduce((a, [, c]) => a + c, 0);
  const activeProjects = data.profile.projects.filter(p => Date.now() - p.lastActivity < 7 * 86400000);
  const dormantProjects = data.profile.projects.filter(p => Date.now() - p.lastActivity >= 7 * 86400000);
  const insights = data.insights || [];
  const narrative = data.weeklyNarrative;

  // 提取分类记忆
  const preferences = data.memories.filter(m => m.content.includes('[preference]'));
  const patterns = data.memories.filter(m => m.content.includes('[pattern]'));
  const decisions = data.memories.filter(m => m.content.includes('[decision]'));

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("eden-welcomed", "1");
  };

  if (showWelcome) {
    return <WelcomeOverlay data={data} onDismiss={dismissWelcome} />;
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-[var(--border-hover)] bg-[var(--elevated)] flex items-center justify-center">
            <span className="text-[var(--green)] text-xs">e</span>
          </div>
          <span className="text-[var(--text-bright)] text-sm">{data.state.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => token && fetchData(token)} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] text-xs hover:text-[var(--text)] transition-colors">Refresh</button>
          <a href="/report" className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] text-xs hover:text-[var(--text)] transition-colors">Reports</a>
          <a href="/chat" className="px-3 py-1.5 rounded-lg bg-[var(--accent-dim)] text-white text-xs hover:bg-[var(--accent)] transition-colors">Chat</a>
        </div>
      </div>

      {/* ===== INSIGHTS (核心) ===== */}
      {(insights.length > 0 || narrative) && (
        <section className="mb-10 animate-fade-up">
          {narrative && (
            <div className="rounded-2xl border border-[var(--accent-dim)] bg-[var(--surface)] p-6 mb-4 glow-accent">
              <div className="text-[10px] text-[var(--accent)] uppercase tracking-widest mb-3">Weekly Insight</div>
              <p className="text-[var(--text-bright)] text-sm leading-relaxed">{narrative}</p>
            </div>
          )}
          {insights.length > 0 && (
            <div className="space-y-2">
              {insights.map((insight: Insight, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <span className="shrink-0 mt-0.5" style={{ color: INSIGHT_COLORS[insight.type] || 'var(--dim)' }}>
                    {INSIGHT_ICONS[insight.type] || '·'}
                  </span>
                  <span className="text-[var(--text)] text-sm">{insight.message}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== IDENTITY ===== */}
      <section className="mb-10 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-4">Identity</div>

        {/* Languages bar */}
        <div className="flex h-2 rounded-full overflow-hidden mb-3">
          {sortedLangs.slice(0, 8).map(([lang, count]) => (
            <div key={lang} style={{ width: `${(count / totalLangLines) * 100}%`, backgroundColor: LANG_COLORS[lang] || "#444", minWidth: "2px" }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-4">
          {sortedLangs.slice(0, 6).map(([lang, count]) => (
            <span key={lang} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[lang] || "#444" }} />
              <span className="text-[var(--text)]">{lang}</span>
              <span className="text-[var(--muted)]">{Math.round((count / totalLangLines) * 100)}%</span>
            </span>
          ))}
        </div>

        {/* Frameworks */}
        {data.profile.frameworks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.profile.frameworks.map(fw => (
              <span key={fw} className="px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--dim)] text-[11px]">{fw}</span>
            ))}
          </div>
        )}
      </section>

      {/* ===== PROJECTS ===== */}
      <section className="mb-10 animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-4">Projects</div>
        <div className="space-y-1.5">
          {activeProjects.map(p => (
            <div key={p.path} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[var(--surface)] transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
                <span className="text-[var(--text-bright)] text-sm">{p.name}</span>
                {p.description && <span className="text-[var(--muted)] text-[11px] hidden sm:inline">— {p.description.slice(0, 40)}</span>}
              </div>
              <span className="text-[var(--muted)] text-[11px]">{p.language}</span>
            </div>
          ))}
          {dormantProjects.slice(0, 3).map(p => (
            <div key={p.path} className="flex items-center justify-between py-2.5 px-3 rounded-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
                <span className="text-[var(--muted)] text-sm">{p.name}</span>
              </div>
              <span className="text-[var(--muted)] text-[11px]">{Math.floor((Date.now() - p.lastActivity) / 86400000)}d</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== WHAT EDEN KNOWS ===== */}
      <MemoryBrowser
        preferences={preferences}
        patterns={patterns}
        decisions={decisions}
        token={token!}
        onDelete={(id) => {
          setData(prev => prev ? { ...prev, memories: prev.memories.filter(m => m.id !== id) } : prev);
        }}
      />

      {/* ===== STATS ===== */}
      <section className="animate-fade-up" style={{ animationDelay: '0.25s' }}>
        <div className="flex items-center justify-between py-6 border-t border-[var(--border)] text-[var(--muted)] text-[11px]">
          <div className="flex gap-6">
            <span>{data.profile.projects.length} projects</span>
            <span>{data.memories.length} memories</span>
            <span>{data.sessions.length} sessions</span>
          </div>
          <span>synced {timeAgo(data.syncedAt)}</span>
        </div>
      </section>
    </div>
  );
}

function MemoryBrowser({ preferences, patterns, decisions, token, onDelete }: {
  preferences: Memory[];
  patterns: Memory[];
  decisions: Memory[];
  token: string;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const hasMemories = preferences.length > 0 || patterns.length > 0 || decisions.length > 0;
  if (!hasMemories && !search) return null;

  const categories = [
    { key: 'preference', label: 'Preferences', color: '#f59e0b', items: preferences, tag: '[preference] ' },
    { key: 'pattern', label: 'Patterns', color: 'var(--accent)', items: patterns, tag: '[pattern] ' },
    { key: 'decision', label: 'Decisions', color: 'var(--green)', items: decisions, tag: '[decision] ' },
  ];

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/memories?token=${token}&id=${id}`, { method: 'DELETE' });
      if (res.ok) onDelete(id);
    } catch {}
    setDeleting(null);
  };

  const filterBySearch = (items: Memory[]) =>
    search ? items.filter(m => m.content.toLowerCase().includes(search.toLowerCase())) : items;

  return (
    <section className="mb-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest">What Eden Knows</div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memories..."
          className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent-dim)] text-[11px] w-36 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {categories.map(cat => {
          const filtered = filterBySearch(cat.items);
          if (filtered.length === 0) return null;
          const isExpanded = expanded === cat.key;
          const shown = isExpanded ? filtered : filtered.slice(-3);

          return (
            <div key={cat.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: cat.color }}>{cat.label}</div>
              {shown.map(m => (
                <div key={m.id} className="group flex items-start gap-1.5 mb-1.5">
                  <p className="text-[var(--dim)] text-[11px] leading-relaxed flex-1">{m.content.replace(cat.tag, '')}</p>
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={deleting === m.id}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-red-400 text-[10px] transition-all mt-0.5"
                    title="Delete"
                  >
                    {deleting === m.id ? '...' : 'x'}
                  </button>
                </div>
              ))}
              {filtered.length > 3 && (
                <button
                  onClick={() => setExpanded(isExpanded ? null : cat.key)}
                  className="text-[var(--muted)] text-[10px] hover:text-[var(--dim)] transition-colors mt-1"
                >
                  {isExpanded ? 'Show less' : `Show all ${filtered.length}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WelcomeOverlay({ data, onDismiss }: { data: SyncData; onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const sortedLangs = Object.entries(data.profile.languages).sort((a, b) => b[1] - a[1]);
  const activeProjects = data.profile.projects.filter(p => Date.now() - p.lastActivity < 7 * 86400000);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {step === 0 && (
          <div className="text-center animate-fade-up">
            <div className="w-16 h-16 rounded-2xl border border-[var(--accent-dim)] bg-[var(--elevated)] flex items-center justify-center mx-auto mb-6 glow-accent">
              <span className="text-[var(--accent)] text-2xl font-light" style={{ fontFamily: "'JetBrains Mono', monospace" }}>E</span>
            </div>
            <h1 className="text-[var(--text-bright)] text-xl mb-2">Eden has been born</h1>
            <p className="text-[var(--dim)] text-sm mb-8">Your AI identity is ready.</p>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left mb-6">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {sortedLangs.slice(0, 5).map(([lang]) => (
                  <span key={lang} className="px-2 py-0.5 rounded bg-[var(--elevated)] text-[var(--text)] text-xs border border-[var(--border)]">{lang}</span>
                ))}
              </div>
              {data.profile.frameworks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {data.profile.frameworks.slice(0, 5).map(fw => (
                    <span key={fw} className="px-2 py-0.5 rounded text-[var(--accent)] text-xs border border-[var(--accent-dim)]">{fw}</span>
                  ))}
                </div>
              )}
              <p className="text-[var(--muted)] text-xs">
                {data.profile.projects.length} projects found &middot; {activeProjects.length} active
              </p>
            </div>

            <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl bg-[var(--accent-dim)] text-white text-sm hover:bg-[var(--accent)] transition-colors">
              Next
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="text-center animate-fade-up">
            <div className="text-[var(--accent)] text-3xl mb-6">?</div>
            <h2 className="text-[var(--text-bright)] text-lg mb-2">Verify it works</h2>
            <p className="text-[var(--dim)] text-sm mb-6">Open your AI tool and ask:</p>

            <code className="inline-block px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-bright)] text-sm mb-8">
              &ldquo;do you know me?&rdquo;
            </code>

            <p className="text-[var(--muted)] text-xs mb-6">
              Eden is connected to Claude Code, Cursor, and Windsurf.<br />
              Any tool with MCP support will recognize you.
            </p>

            <button onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl bg-[var(--accent-dim)] text-white text-sm hover:bg-[var(--accent)] transition-colors">
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center animate-fade-up">
            <h2 className="text-[var(--text-bright)] text-lg mb-6">Explore</h2>

            <div className="space-y-3 mb-8">
              <a href="/chat" className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--accent-dim)] transition-colors text-left">
                <div className="text-[var(--text-bright)] text-sm mb-1">Chat with Eden</div>
                <div className="text-[var(--muted)] text-xs">Talk to an entity that knows your code</div>
              </a>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left">
                <div className="text-[var(--text-bright)] text-sm mb-1">
                  <code className="text-[var(--accent)]">eden report</code>
                </div>
                <div className="text-[var(--muted)] text-xs">Generate a weekly insight report</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left">
                <div className="text-[var(--text-bright)] text-sm mb-1">
                  <code className="text-[var(--accent)]">eden config</code>
                </div>
                <div className="text-[var(--muted)] text-xs">Set API key, configure privacy</div>
              </div>
            </div>

            <button onClick={onDismiss} className="px-6 py-2.5 rounded-xl bg-[var(--accent-dim)] text-white text-sm hover:bg-[var(--accent)] transition-colors">
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
