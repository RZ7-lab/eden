const points = [
  "Everything stored in ~/.eden/ on your machine",
  "No accounts, no sign-up required",
  "No telemetry, no analytics, no tracking",
  "Exclude sensitive directories via eden config",
  "Delete ~/.eden/ to erase everything instantly",
];

export default function Privacy() {
  return (
    <section className="flex justify-center px-6 pb-28">
      <div className="w-full max-w-[800px]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 sm:p-16 text-center">
          <div className="text-[var(--green)] text-[11px] tracking-[0.15em] uppercase mb-5">
            Privacy
          </div>
          <h2 className="text-[1.5rem] font-light text-[var(--text-bright)] mb-3">
            Local-first. Always.
          </h2>
          <p className="text-[var(--dim)] text-[13px] mb-12 max-w-sm mx-auto leading-relaxed">
            Your data never leaves your machine.<br />No cloud, no servers, no middlemen.
          </p>
          <div className="inline-flex flex-col gap-4 text-left">
            {points.map((p) => (
              <div key={p} className="flex items-start gap-3">
                <div className="w-1 h-1 rounded-full bg-[var(--green)] shrink-0 mt-2" />
                <span className="text-[13px] text-[var(--dim)] leading-relaxed">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
