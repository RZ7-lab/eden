export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-14 px-6">
      <div className="max-w-[800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-bright)] text-sm">eden</span>
          <span className="text-[var(--muted)] text-[11px]">v0.1.0</span>
        </div>
        <div className="flex items-center gap-8 text-[13px] text-[var(--muted)]">
          <a
            href="https://github.com/RZ7-lab/eden"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-200 hover:text-[var(--text)]"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/eden-me"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-200 hover:text-[var(--text)]"
          >
            npm
          </a>
          <a
            href="/install"
            className="transition-colors duration-200 hover:text-[var(--text)]"
          >
            Install
          </a>
          <a
            href="/me"
            className="transition-colors duration-200 hover:text-[var(--text)]"
          >
            Dashboard
          </a>
        </div>
      </div>
    </footer>
  );
}
