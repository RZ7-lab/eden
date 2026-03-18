export default function Architecture() {
  return (
    <section className="flex justify-center px-6 pb-28">
      <div className="w-full max-w-[800px]">
        <h2 className="text-[1.5rem] font-light text-[var(--text-bright)] mb-3 text-center">
          How it works
        </h2>
        <p className="text-[13px] text-[var(--muted)] text-center mb-16">
          Eden sleeps between sessions. Each wake-up takes &lt; 2 seconds.
        </p>

        <div className="flex flex-col items-center gap-6 max-w-[480px] mx-auto">
          {/* Sleep state */}
          <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center">
            <div className="text-[var(--muted)] text-[12px] uppercase tracking-wider mb-2">most of the time</div>
            <div className="text-[var(--text-bright)] text-lg font-light">Eden sleeps</div>
            <div className="text-[var(--dim)] text-[12px] mt-2">zero CPU · zero memory · zero cost</div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-2">
            <svg width="1" height="20" viewBox="0 0 1 20"><path d="M0.5 0 L0.5 20" stroke="var(--border-hover)" strokeWidth="1" /></svg>
            <div className="text-[10px] text-[var(--accent)] tracking-wider uppercase px-3 py-1 rounded-full border border-[var(--border)]">
              agent calls eden_get_user
            </div>
            <svg width="1" height="20" viewBox="0 0 1 20"><path d="M0.5 0 L0.5 20" stroke="var(--border-hover)" strokeWidth="1" /></svg>
          </div>

          {/* Wake state */}
          <div className="w-full rounded-2xl border border-[var(--accent-dim)] bg-[var(--surface)] p-7 glow-accent">
            <div className="text-center mb-5">
              <div className="text-[var(--accent)] text-[12px] uppercase tracking-wider mb-2">eden wakes up</div>
              <div className="text-[var(--text-bright)] text-lg font-light">Senses what changed</div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-[var(--bg)] p-3.5">
                <div className="text-[12px] text-[var(--dim)]">&lt; 5 min</div>
                <div className="text-[10px] text-[var(--muted)] mt-1.5">cache</div>
              </div>
              <div className="rounded-xl bg-[var(--bg)] p-3.5">
                <div className="text-[12px] text-[var(--dim)]">5m — 1h</div>
                <div className="text-[10px] text-[var(--muted)] mt-1.5">quick scan</div>
              </div>
              <div className="rounded-xl bg-[var(--bg)] p-3.5">
                <div className="text-[12px] text-[var(--dim)]">&gt; 1 hour</div>
                <div className="text-[10px] text-[var(--muted)] mt-1.5">full rescan</div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-2">
            <svg width="1" height="20" viewBox="0 0 1 20"><path d="M0.5 0 L0.5 20" stroke="var(--border-hover)" strokeWidth="1" /></svg>
            <div className="text-[10px] text-[var(--green)] tracking-wider uppercase px-3 py-1 rounded-full border border-[var(--border)]">
              returns identity + changes
            </div>
            <svg width="1" height="20" viewBox="0 0 1 20"><path d="M0.5 0 L0.5 20" stroke="var(--border-hover)" strokeWidth="1" /></svg>
          </div>

          {/* Tools row */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {["Claude Code", "Cursor", "Windsurf", "Any MCP"].map((tool, i) => (
              <div
                key={tool}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2.5 text-center text-[11px] transition-colors hover:border-[var(--border-hover)]"
                style={{
                  color: i < 3 ? 'var(--text)' : 'var(--muted)',
                }}
              >
                {tool}
              </div>
            ))}
          </div>

          {/* Back to sleep */}
          <div className="flex flex-col items-center gap-2 mt-2">
            <svg width="1" height="12" viewBox="0 0 1 12"><path d="M0.5 0 L0.5 12" stroke="var(--border-hover)" strokeWidth="1" strokeDasharray="2 2" /></svg>
            <div className="text-[10px] text-[var(--muted)] tracking-wider">
              session ends → sleeps again
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
