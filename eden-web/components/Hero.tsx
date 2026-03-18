"use client";

import { useState } from "react";

export default function Hero() {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText("npx eden-me");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative flex flex-col items-center justify-center px-6 pt-40 pb-28 overflow-hidden" style={{ borderTop: 'none' }}>
      {/* Background radial glow */}
      <div
        className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(109,159,255,0.05) 0%, rgba(192,132,252,0.02) 40%, transparent 70%)',
        }}
      />

      {/* Logo mark */}
      <div className="relative mb-10">
        <div className="w-10 h-10 rounded-xl border border-[var(--border-hover)] bg-[var(--elevated)] flex items-center justify-center glow-accent">
          <span className="text-[var(--green)] text-sm font-light">e</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="relative text-6xl sm:text-[7rem] font-light tracking-tighter text-[var(--text-bright)] animate-fade-up leading-none">
        eden
      </h1>


      {/* Subtitle */}
      <p className="relative mt-10 text-sm sm:text-base font-light text-[var(--dim)] text-center animate-fade-up" style={{ animationDelay: '0.1s' }}>
        Your AI identity that sleeps and wakes.
        <br />
        <span className="text-[var(--text-bright)]">It knows what changed while it was asleep.</span>
      </p>

      {/* Install command */}
      <button
        onClick={copyCommand}
        className="relative mt-14 group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-7 py-3.5 text-sm transition-all duration-300 hover:border-[var(--accent-dim)] hover:shadow-[0_0_30px_rgba(109,159,255,0.1)] cursor-pointer animate-fade-up"
        style={{ animationDelay: '0.25s' }}
      >
        <span className="text-[var(--muted)]">$</span>
        <span className="text-[var(--green)]">npx eden-me</span>
        <span className="text-[var(--muted)] text-xs transition-colors group-hover:text-[var(--dim)]">
          {copied ? "copied!" : "copy"}
        </span>
      </button>

      <p className="relative mt-10 text-[13px] text-[var(--muted)] max-w-sm text-center leading-relaxed animate-fade-up" style={{ animationDelay: '0.35s' }}>
        No daemon. No background process.<br />
        Eden sleeps until your AI tools wake it up.
      </p>

      {/* Tool compatibility */}
      <div className="relative mt-8 flex items-center gap-4 animate-fade-up" style={{ animationDelay: '0.45s' }}>
        <span className="text-[var(--muted)] text-[11px]">Works with</span>
        <div className="flex items-center gap-3">
          {['Claude Code', 'Cursor', 'Windsurf'].map(tool => (
            <span key={tool} className="px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--dim)] text-[11px]">{tool}</span>
          ))}
          <span className="text-[var(--muted)] text-[11px]">+ any MCP client</span>
        </div>
      </div>
    </section>
  );
}
