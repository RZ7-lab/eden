"use client";

import { useState, useEffect, useCallback } from "react";
import type { SyncData, InsightReport } from "@/lib/types";

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}`);

export default function ReportPage() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<SyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchData = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${t}`);
      if (!res.ok) { window.location.href = "/me"; return; }
      setData(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("eden-token");
    if (!saved) { window.location.href = "/me"; return; }
    setToken(saved);
    fetchData(saved);
  }, [fetchData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-[var(--dim)] text-sm">Loading...</div></div>;
  if (!data) return null;

  const reports = data.reports || [];
  const report = reports[selectedIndex];

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <a href="/me" className="text-[var(--dim)] text-xs hover:text-[var(--text)] transition-colors">&larr;</a>
          <span className="text-[var(--text-bright)] text-sm font-medium">Weekly Reports</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/chat" className="px-3 py-1.5 rounded-lg bg-[var(--accent-dim)] text-white text-xs hover:bg-[var(--accent)] transition-colors">Chat</a>
        </div>
      </div>

      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Report Selector */}
          {reports.length > 1 && (
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              {reports.map((r, i) => (
                <button
                  key={r.period.end}
                  onClick={() => setSelectedIndex(i)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                    i === selectedIndex
                      ? "border-[var(--accent-dim)] bg-[var(--surface)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--dim)]"
                  }`}
                >
                  {formatPeriod(r.period)}
                </button>
              ))}
            </div>
          )}

          {report && <ReportView report={report} />}
        </>
      )}
    </div>
  );
}

function ReportView({ report }: { report: InsightReport }) {
  const maxCommits = Math.max(...report.raw.git.projects.map(p => p.commits), 1);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Period */}
      <div className="text-[var(--muted)] text-[11px] uppercase tracking-widest">
        {report.period.start} &rarr; {report.period.end}
      </div>

      {/* Narrative */}
      <section className="rounded-2xl border border-[var(--accent-dim)] bg-[var(--surface)] p-6 glow-accent">
        <div className="text-[10px] text-[var(--accent)] uppercase tracking-widest mb-3">Insight</div>
        <p className="text-[var(--text-bright)] text-sm leading-relaxed">{report.narrative}</p>
      </section>

      {/* Questions */}
      {report.questions.length > 0 && (
        <section>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">Questions for you</div>
          <div className="space-y-2">
            {report.questions.map((q, i) => (
              <a
                key={i}
                href={`/chat`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--border-hover)] transition-colors group"
              >
                <span className="text-[var(--text)] text-sm group-hover:text-[var(--text-bright)] transition-colors">{q}</span>
                <span className="text-[var(--muted)] text-[10px] ml-2">→ discuss</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Git Activity */}
      {report.raw.git.totalCommits > 0 && (
        <section>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">Git Activity</div>

          {/* Stats row */}
          <div className="flex gap-6 mb-4 text-[11px]">
            <span className="text-[var(--text)]"><span className="text-[var(--text-bright)] font-medium">{report.raw.git.totalCommits}</span> commits</span>
            <span className="text-[var(--text)]"><span className="text-[var(--text-bright)] font-medium">{report.raw.git.codingDays}</span>/7 days</span>
            <span className="text-[var(--text)]">peak <span className="text-[var(--text-bright)] font-medium">{report.raw.git.peakHours.map(h => `${h}:00`).join(', ')}</span></span>
          </div>

          {/* Project bar chart */}
          <div className="space-y-2">
            {report.raw.git.projects.map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-[var(--text)] text-xs w-24 shrink-0 truncate">{p.name}</span>
                <div className="flex-1 h-5 bg-[var(--surface)] rounded overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-dim)] rounded transition-all"
                    style={{ width: `${(p.commits / maxCommits) * 100}%` }}
                  />
                </div>
                <span className="text-[var(--muted)] text-[11px] w-8 text-right shrink-0">{p.commits}</span>
              </div>
            ))}
          </div>

          {/* Coding hours heatmap */}
          {report.raw.git.peakHours.length > 0 && (
            <div className="mt-4">
              <div className="text-[var(--muted)] text-[10px] mb-2">Activity by hour</div>
              <div className="flex gap-px">
                {HOUR_LABELS.map((label, h) => {
                  const isPeak = report.raw.git.peakHours.includes(h);
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full h-3 rounded-sm ${
                          isPeak ? "bg-[var(--accent)]" : "bg-[var(--surface)]"
                        }`}
                      />
                      {h % 6 === 0 && (
                        <span className="text-[var(--muted)] text-[8px]">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Patterns */}
      {report.patterns.length > 0 && (
        <section>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">Patterns</div>
          <div className="space-y-2">
            {report.patterns.map((p, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="text-[var(--accent)] shrink-0 mt-0.5">~</span>
                <span className="text-[var(--text)] text-sm">{p}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sessions */}
      {report.raw.sessions.length > 0 && (
        <section>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">Tool Sessions</div>
          <div className="space-y-1.5">
            {report.raw.sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--surface)] transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--dim)] text-xs">{s.tool}</span>
                  {s.summary && <span className="text-[var(--muted)] text-[11px]">— {s.summary}</span>}
                </div>
                <span className="text-[var(--muted)] text-[11px]">{s.when}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-2xl border border-[var(--border-hover)] bg-[var(--elevated)] flex items-center justify-center mx-auto mb-4">
          <span className="text-[var(--dim)] text-lg">~</span>
        </div>
        <p className="text-[var(--dim)] text-sm mb-3">No reports yet.</p>
        <p className="text-[var(--muted)] text-xs leading-relaxed">
          Generate your first weekly report in the terminal:
        </p>
        <code className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] text-xs">
          eden report
        </code>
        <p className="text-[var(--muted)] text-xs mt-2">
          Then sync to cloud:
        </p>
        <code className="inline-block mt-1 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] text-xs">
          eden sync cloud
        </code>
      </div>
    </div>
  );
}

function formatPeriod(period: { start: string; end: string }): string {
  const start = new Date(period.start);
  const end = new Date(period.end);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`;
}
