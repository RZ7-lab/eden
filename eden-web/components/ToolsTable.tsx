const mcpTools = [
  { name: "eden_get_user", desc: "Get structured user profile, projects, patterns" },
  { name: "eden_remember", desc: "Store observations about the user" },
  { name: "eden_search_memory", desc: "Search memories by keyword + category" },
  { name: "eden_log_session", desc: "Record what was done in this session" },
  { name: "eden_get_project", desc: "Get context about a specific project" },
  { name: "eden_weekly_report", desc: "Weekly insight report with narrative" },
];

const cliCommands = [
  { name: "eden", desc: "Auto-init + dashboard" },
  { name: "eden me", desc: "View your AI identity in browser" },
  { name: "eden report", desc: "Weekly coding insight report" },
  { name: "eden config", desc: "Privacy & settings" },
  { name: "eden sync github", desc: "Sync GitHub activity" },
  { name: "eden sync notion", desc: "Sync Notion data" },
  { name: "eden sync cloud", desc: "Sync to web dashboard" },
];

const webPages = [
  { name: "/me", desc: "Your AI identity dashboard — projects, memories, patterns" },
  { name: "/chat", desc: "Talk to Eden — it knows your projects and coding habits" },
];

export default function ToolsTable() {
  return (
    <section className="flex justify-center px-6 pb-28">
      <div className="w-full max-w-[800px] space-y-16">
        <div>
          <h2 className="text-2xl font-light text-[var(--text-bright)] text-center mb-2">
            For Agents
          </h2>
          <p className="text-sm text-[var(--muted)] text-center mb-10">
            MCP tools that any AI agent can call
          </p>
          <div className="space-y-0">
            {mcpTools.map((tool) => (
              <div key={tool.name} className="flex items-baseline gap-4 py-3 border-b border-[var(--border)]">
                <code className="text-[13px] text-[var(--accent)] shrink-0">
                  {tool.name}
                </code>
                <span className="text-sm text-[var(--dim)]">{tool.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-light text-[var(--text-bright)] text-center mb-2">
            For You
          </h2>
          <p className="text-sm text-[var(--muted)] text-center mb-10">
            CLI + Web
          </p>

          {/* CLI */}
          <div className="mb-6">
            <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-4">
              Terminal
            </div>
            <div className="space-y-0">
              {cliCommands.map((cmd) => (
                <div key={cmd.name} className="flex items-baseline gap-4 py-3 border-b border-[var(--border)]">
                  <code className="text-[13px] text-[var(--green)] shrink-0">
                    {cmd.name}
                  </code>
                  <span className="text-sm text-[var(--dim)]">{cmd.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Web */}
          <div className="mt-10">
            <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-4">
              Web
            </div>
            <div className="space-y-0">
              {webPages.map((page) => (
                <div key={page.name} className="flex items-baseline gap-4 py-3 border-b border-[var(--border)]">
                  <code className="text-[13px] text-[#c084fc] shrink-0">
                    {page.name}
                  </code>
                  <span className="text-sm text-[var(--dim)]">{page.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
