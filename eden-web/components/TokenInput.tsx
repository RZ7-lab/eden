"use client";

interface TokenInputProps {
  onTokenSubmit: (token: string) => void;
}

export default function TokenInput({ onTokenSubmit: _onTokenSubmit }: TokenInputProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md animate-fade-up text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl border border-[var(--border-hover)] bg-[var(--elevated)] flex items-center justify-center glow-accent">
            <span className="text-[var(--green)] text-lg font-light">e</span>
          </div>
        </div>

        <h2 className="text-[var(--text-bright)] text-xl font-light mb-3">
          Your Dashboard
        </h2>
        <p className="text-[var(--dim)] text-sm mb-10 leading-relaxed">
          Install Eden on your machine. Your dashboard will appear here automatically.
        </p>

        {/* Install command */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-4 mb-8">
          <code className="text-[var(--green)] text-sm">npx eden-me</code>
        </div>

        {/* How it works */}
        <div className="text-left space-y-4 mb-10">
          <div className="flex gap-3 items-start">
            <span className="text-[var(--accent)] text-sm shrink-0">1</span>
            <span className="text-[var(--dim)] text-sm">Run <code className="text-[var(--text)]">npx eden-me</code> in your terminal</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-[var(--accent)] text-sm shrink-0">2</span>
            <span className="text-[var(--dim)] text-sm">Eden scans your environment and connects your AI tools</span>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-[var(--accent)] text-sm shrink-0">3</span>
            <span className="text-[var(--dim)] text-sm">Your dashboard link appears — click it and you&#39;re here</span>
          </div>
        </div>

        <p className="text-[var(--muted)] text-xs">
          Already installed? Your dashboard syncs every time your AI tools use Eden.
          <br />
          Run <code className="text-[var(--dim)]">eden me --web</code> to open it.
        </p>
      </div>
    </div>
  );
}
