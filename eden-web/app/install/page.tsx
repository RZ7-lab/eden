"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function InstallPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("token")) {
      setInstalled(true);
      localStorage.setItem("eden-token", params.get("token")!);
    }
  }, []);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (installed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl border border-[var(--green-dim)] bg-[var(--elevated)] flex items-center justify-center mx-auto mb-6 glow-green">
            <span className="text-[var(--green)] text-2xl">&#10003;</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Eden is installed</h1>
          <p className="text-[var(--dim)] text-sm mb-8">Your AI identity is active and connected.</p>
          <a href="/me" className="px-6 py-2.5 rounded-xl bg-[var(--accent-dim)] text-white text-sm hover:bg-[var(--accent)] transition-colors">
            Go to Dashboard
          </a>
        </div>
      </main>
    );
  }

  const steps = [
    { num: 1, title: "Install", desc: "Run a single command. Eden scans your environment and auto-connects to your AI tools." },
    { num: 2, title: "Verify", desc: "Open Claude Code and confirm Eden is connected." },
    { num: 3, title: "Explore", desc: "Use CLI commands to view your identity and generate insights." },
  ];

  return (
    <main className="min-h-screen flex justify-center px-6 py-24">
      <div className="w-full max-w-[800px]">
        <Link href="/" className="text-sm text-[var(--dim)] hover:text-white transition-colors">&larr; Home</Link>

        <h1 className="text-4xl font-bold text-white mt-8 mb-12">Install Eden</h1>

        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-12">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border border-[var(--accent-dim)] flex items-center justify-center">
                  <span className="text-[var(--accent)] text-xs font-medium">{s.num}</span>
                </div>
                <span className="text-[var(--text)] text-sm">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-12 h-px bg-[var(--border)] mx-4" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        <section className="mb-12 animate-fade-up">
          <h2 className="text-lg font-semibold text-white mb-1">Step 1 &mdash; Install</h2>
          <p className="text-[var(--dim)] text-sm mb-4">{steps[0].desc}</p>
          <div className="relative group">
            <pre className="rounded-lg border border-[#222] bg-[#111] px-5 py-4 font-mono text-sm text-[var(--green)] overflow-x-auto">
              npx eden-me
            </pre>
            <button
              onClick={() => copy("npx eden-me", "install")}
              className="absolute top-3 right-3 px-2 py-1 rounded text-[var(--muted)] text-xs opacity-0 group-hover:opacity-100 hover:text-[var(--text)] transition-all border border-[var(--border)]"
            >
              {copied === "install" ? "copied!" : "copy"}
            </button>
          </div>
        </section>

        {/* Step 2 */}
        <section className="mb-12 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <h2 className="text-lg font-semibold text-white mb-1">Step 2 &mdash; Verify</h2>
          <p className="text-[var(--dim)] text-sm">
            Open Claude Code and ask{" "}
            <span className="font-mono text-white">&quot;do you know me?&quot;</span>
          </p>
        </section>

        {/* Step 3 */}
        <section className="mb-16 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg font-semibold text-white mb-1">Step 3 &mdash; Explore</h2>
          <div className="relative group">
            <pre className="rounded-lg border border-[#222] bg-[#111] px-5 py-4 font-mono text-sm text-[var(--text)] overflow-x-auto leading-relaxed">
{`eden me          # View your AI identity
eden report      # Weekly coding insights
eden config      # Privacy settings`}
            </pre>
            <button
              onClick={() => copy("eden me", "explore")}
              className="absolute top-3 right-3 px-2 py-1 rounded text-[var(--muted)] text-xs opacity-0 group-hover:opacity-100 hover:text-[var(--text)] transition-all border border-[var(--border)]"
            >
              {copied === "explore" ? "copied!" : "copy"}
            </button>
          </div>
        </section>

        {/* FAQ */}
        <h2 className="text-2xl font-semibold text-white mb-8">FAQ</h2>

        <div className="space-y-6">
          <Faq q="What data does Eden collect?" a="Project names, languages, git stats. Never file contents by default." />
          <Faq q="Where is my data stored?" a="~/.eden/ on your local machine." />
          <Faq q="Does it cost money?" a="Eden itself is free. Weekly insight reports use the Claude API (optional)." />
          <Faq q="Can I use it without an API key?" a="Yes. Core MCP features work without any API key." />
        </div>
      </div>
    </main>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-[#1a1a1a] pb-4">
      <h3 className="text-sm font-medium text-white mb-1">{q}</h3>
      <p className="text-sm text-[var(--dim)]">{a}</p>
    </div>
  );
}
