import Hero from "@/components/Hero";
import Terminal from "@/components/Terminal";
import Features from "@/components/Features";
import Architecture from "@/components/Architecture";
import ToolsTable from "@/components/ToolsTable";
import Privacy from "@/components/Privacy";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <Hero />
      <Terminal />
      <Features />
      <Architecture />
      <ToolsTable />
      <Privacy />

      {/* CTA */}
      <section className="flex justify-center px-6 pb-20">
        <div className="w-full max-w-[500px] text-center">
          <h2 className="text-2xl text-[var(--text-bright)] font-light mb-4">Ready?</h2>
          <p className="text-[var(--dim)] text-sm mb-6">One command. All your AI tools will know you.</p>
          <div className="flex items-center justify-center gap-4">
            <code className="px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--green)] text-sm">npx eden-me</code>
            <a href="/me" className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--dim)] text-sm hover:text-[var(--text)] transition-colors">Dashboard</a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
