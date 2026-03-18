const features = [
  {
    title: "Sleeps Until Needed",
    description: "No daemon, no background process. Eden wakes up only when your AI tools call it, senses what changed, then goes back to sleep.",
    accent: "var(--accent)",
  },
  {
    title: "Knows What You Missed",
    description: "Every time Eden wakes, it checks: new commits, project changes, shifted priorities. Your AI starts each session already caught up.",
    accent: "var(--green)",
  },
  {
    title: "Insights About You",
    description: "Eden sees patterns you can't. Weekly narratives about your coding rhythm, focus shifts, and habits — not stats, understanding.",
    accent: "var(--purple)",
  },
  {
    title: "Your Data, Your Machine",
    description: "Everything in ~/.eden/. No cloud, no accounts, no tracking. Eden reads your files — it never sends them anywhere.",
    accent: "#f59e0b",
  },
];

export default function Features() {
  return (
    <section className="flex justify-center px-6 pb-28">
      <div className="w-full max-w-[800px]">
        {/* Before / After */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-fade-up">
            <div className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">Without Eden</div>
            <p className="text-[var(--dim)] text-[13px] leading-relaxed">Every AI conversation starts from zero. You re-explain your stack, your projects, your preferences. Every. Single. Time.</p>
          </div>
          <div className="rounded-xl border border-[var(--accent-dim)] bg-[var(--surface)] p-5 animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="text-[10px] text-[var(--accent)] uppercase tracking-widest mb-3">With Eden</div>
            <p className="text-[var(--text)] text-[13px] leading-relaxed">AI knows your stack, your active projects, your coding patterns, and what changed since last session. Instantly.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 transition-all duration-300 hover:border-[var(--border-hover)] hover:translate-y-[-2px] animate-fade-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className="w-8 h-[2px] rounded-full mb-6 transition-all duration-300 group-hover:w-12"
                style={{ background: f.accent }}
              />
              <h3 className="text-[var(--text-bright)] font-medium text-base mb-3">{f.title}</h3>
              <p className="text-[13px] text-[var(--dim)] leading-[1.8]">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
