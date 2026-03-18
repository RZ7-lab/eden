"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { SyncData, ChatMessage } from "@/lib/types";

export default function ChatPage() {
  const [token, setToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<SyncData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load token and data
  useEffect(() => {
    const saved = localStorage.getItem("eden-token");
    if (!saved) {
      window.location.href = "/me";
      return;
    }
    setToken(saved);

    // Load chat history
    const hist = localStorage.getItem("eden-chat-history");
    if (hist) {
      try { setMessages(JSON.parse(hist)); } catch { /* ignore */ }
    }

    // Fetch user data
    fetch(`/api/user/${saved}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setUserData(d))
      .catch(() => {});
  }, []);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("eden-chat-history", JSON.stringify(messages.slice(-100)));
    }
  }, [messages]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, streamingText]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !token) return;

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceToken: token,
          message: text,
          history: messages.slice(-20),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.error || "Something went wrong"}`, timestamp: Date.now() },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6);
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.delta) {
                accumulated += parsed.delta;
                setStreamingText(accumulated);
              } else if (parsed.error) {
                accumulated += `\n[Error: ${parsed.error}]`;
                setStreamingText(accumulated);
              }
            } catch { /* ignore malformed SSE */ }
          }
        }
      }

      // Finalize: move streaming text into messages
      if (accumulated) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulated, timestamp: Date.now() },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Try again.", timestamp: Date.now() },
      ]);
    } finally {
      setSending(false);
      setStreamingText("");
      inputRef.current?.focus();
    }
  }, [input, sending, token, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem("eden-chat-history");
  };

  if (!token) return null;

  const topLangs = userData
    ? Object.entries(userData.profile.languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([l]) => l)
    : [];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-all overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl border border-[var(--border-hover)] bg-[var(--elevated)] flex items-center justify-center">
              <span className="text-[var(--accent)] text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>E</span>
            </div>
            <div>
              <div className="text-[var(--text-bright)] text-sm font-medium">
                {userData?.state.name || "Eden"}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
                <span className="text-[var(--green)] text-[10px]">online</span>
              </div>
            </div>
          </div>
        </div>

        {userData && (
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-[var(--dim)] text-[10px] uppercase tracking-wider mb-2">Languages</h3>
              <div className="flex flex-wrap gap-1.5">
                {topLangs.map((l) => (
                  <span key={l} className="px-2 py-0.5 rounded bg-[var(--elevated)] text-[var(--text)] text-[10px] border border-[var(--border)]">
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {userData.profile.frameworks.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[var(--dim)] text-[10px] uppercase tracking-wider mb-2">Frameworks</h3>
                <div className="flex flex-wrap gap-1.5">
                  {userData.profile.frameworks.slice(0, 8).map((fw) => (
                    <span key={fw} className="px-2 py-0.5 rounded bg-[var(--elevated)] text-[var(--text)] text-[10px] border border-[var(--border)]">
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[var(--dim)] text-[10px] uppercase tracking-wider mb-2">Active Projects</h3>
              {userData.profile.projects
                .filter((p) => Date.now() - p.lastActivity < 7 * 86400000)
                .slice(0, 5)
                .map((p) => (
                  <div key={p.path} className="flex items-center gap-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
                    <span className="text-[var(--text)] text-xs">{p.name}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-[var(--border)]">
          <a href="/me" className="text-[var(--dim)] text-xs hover:text-[var(--text)] transition-colors">
            &larr; Dashboard
          </a>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[var(--dim)] hover:text-[var(--text)] transition-colors text-sm"
              aria-label="Toggle sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div>
              <span className="text-[var(--text-bright)] text-sm font-medium">Chat with Eden</span>
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="text-[var(--muted)] text-xs hover:text-[var(--dim)] transition-colors"
          >
            Clear
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && !sending && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <div className="w-12 h-12 rounded-2xl border border-[var(--border-hover)] bg-[var(--elevated)] flex items-center justify-center mx-auto mb-4 glow-accent">
                  <span className="text-[var(--accent)] text-lg font-light" style={{ fontFamily: "'JetBrains Mono', monospace" }}>E</span>
                </div>
                <p className="text-[var(--dim)] text-sm">
                  Start a conversation. Eden knows your code, your patterns, your projects.
                </p>
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[var(--accent-dim)] text-white rounded-br-md"
                      : "bg-[var(--elevated)] text-[var(--text)] border border-[var(--border)] rounded-bl-md"
                  }`}
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {msg.role === "assistant" && (
                    <span className="text-[var(--accent)] text-[10px] font-medium block mb-1">Eden</span>
                  )}
                  <span
                    style={{
                      fontFamily: msg.content.includes("```") || msg.content.includes("`")
                        ? "'JetBrains Mono', monospace"
                        : "inherit",
                    }}
                  >
                    {msg.content}
                  </span>
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-[var(--elevated)] border border-[var(--border)] px-4 py-3 rounded-2xl rounded-bl-md text-sm leading-relaxed">
                  <span className="text-[var(--accent)] text-[10px] font-medium block mb-1">Eden</span>
                  {streamingText ? (
                    <span className="text-[var(--text)]" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {streamingText}
                      <span className="inline-block w-0.5 h-4 bg-[var(--accent)] ml-0.5 animate-pulse align-text-bottom" />
                    </span>
                  ) : (
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--dim)] animate-pulse" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--dim)] animate-pulse" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--dim)] animate-pulse" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Eden..."
              rows={1}
              className="flex-1 px-4 py-3 rounded-xl bg-[var(--elevated)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent-dim)] transition-colors resize-none text-sm"
              style={{ maxHeight: "120px" }}
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="px-4 py-3 rounded-xl bg-[var(--accent-dim)] text-white text-sm font-medium hover:bg-[var(--accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
