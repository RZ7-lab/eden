"use client";

import { useEffect, useState } from "react";

const lines = [
  { text: "$ npx eden-me", delay: 0, style: "bright" },
  { text: "", delay: 600, style: "" },
  { text: "  Scanning your environment...", delay: 1200, style: "dim" },
  { text: "", delay: 2000, style: "" },
  { text: "  9 projects. TypeScript, React, Three.js.", delay: 2800, style: "normal" },
  { text: "  React \u00b7 Next.js \u00b7 Tailwind \u00b7 Vite \u00b7 Three.js", delay: 3200, style: "dim" },
  { text: "", delay: 3600, style: "" },
  { text: "  \u2713 Claude Code \u2192 connected", delay: 4200, style: "green" },
  { text: "  \u2713 Cursor \u2192 connected", delay: 4800, style: "green" },
  { text: "", delay: 5400, style: "" },
  { text: "  Eden is ready. It will sleep until your next AI session.", delay: 6000, style: "bright" },
  { text: "", delay: 6800, style: "" },
  { text: "$ claude", delay: 7600, style: "bright" },
  { text: "", delay: 8200, style: "" },
  { text: "  [Eden wakes up]", delay: 8800, style: "accent" },
  { text: "  3 hours since last session. 2 new commits in eden-cli.", delay: 9400, style: "dim" },
  { text: "  symbia has uncommitted changes.", delay: 9800, style: "dim" },
];

const styleMap: Record<string, string> = {
  bright: "text-[var(--text-bright)]",
  normal: "text-[var(--text)]",
  dim: "text-[var(--dim)]",
  green: "text-[var(--green)]",
  accent: "text-[var(--accent)]",
};

export default function Terminal() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((_, i) => {
      timers.push(
        setTimeout(() => setVisibleLines(i + 1), lines[i].delay)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section className="flex justify-center px-6 pb-28">
      <div className="w-full max-w-[640px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden glow-accent">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--border)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] opacity-80" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] opacity-80" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] opacity-80" />
          <span className="ml-3 text-xs text-[var(--muted)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            terminal
          </span>
        </div>
        <div className="p-6 text-[13px] leading-7 min-h-[420px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {lines.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className={`transition-opacity duration-500 ${styleMap[line.style] || ''}`}
              style={{ minHeight: "1.75em" }}
            >
              {line.text || "\u00a0"}
            </div>
          ))}
          {visibleLines < lines.length && (
            <span className="inline-block w-[7px] h-[15px] bg-[var(--accent)] cursor-blink rounded-sm" />
          )}
        </div>
      </div>
    </section>
  );
}
