import { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function fetchAIResponse(userMessage) {
  const url = `${API_BASE}/api/chat`.replace(/([^:]\/)\/+/g, "$1");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessage }),
  });
  if (!res.ok) {
    const errText = await res.text();
    let errMessage = errText;
    try {
      const j = JSON.parse(errText);
      errMessage = j.error ?? j.message ?? errText;
    } catch (_) {}
    throw new Error(errMessage || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.reply ?? data.answer ?? data.message ?? String(data);
}

function BotIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect x="2" y="12" width="20" height="8" rx="2" />
      <path d="M6 12v2M10 12v2M14 12v2M18 12v2" />
      <path d="M12 4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    </svg>
  );
}

function SendIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

export function AIChatWidget({ t }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    setInputValue("");
    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const reply = await fetchAIResponse(text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      const connectionError = t("chatConnectionError");
      const displayMessage =
        err.name === "TypeError" && err.message?.includes("fetch")
          ? connectionError
          : `${t("chatError")} (${err.message || connectionError})`;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: displayMessage },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 md:right-8 md:bottom-8 z-[9998] flex flex-col items-start sm:items-end gap-2 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto max-w-[calc(100vw-2rem)]">
      {isOpen && (
        <div
          className="flex flex-col w-[90vw] sm:w-[360px] max-w-[420px] max-h-[70vh] sm:max-h-[420px] rounded-2xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-ops-cyan/10 dark:shadow-ops-cyan/5 overflow-hidden"
          style={{ boxShadow: "0 0 40px rgba(6, 182, 212, 0.15), 0 25px 50px -12px rgba(0,0,0,0.25)" }}
        >
          <div className="shrink-0 px-3 py-2 md:px-4 md:py-3 border-b border-white/20 dark:border-white/10 bg-gradient-to-r from-ops-cyan/20 to-ops-teal/20 dark:from-ops-cyan/10 dark:to-ops-teal/10">
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-xs md:text-sm flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-ops-cyan/30 dark:bg-ops-cyan/20 flex items-center justify-center text-ops-teal dark:text-ops-cyan">
                <BotIcon className="w-4 h-4" />
              </span>
              {t("chatTitle")}
            </h3>
          </div>

          <div
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto min-h-[160px] max-h-[40vh] sm:min-h-[200px] sm:max-h-[280px] p-3 md:p-4 space-y-3 scrollbar-hide"
          >
            {messages.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                {t("chatEmpty")}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-ops-cyan/20 dark:bg-ops-cyan/20 text-slate-800 dark:text-slate-100 border border-ops-cyan/30"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-white/20 dark:border-white/10"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-white/20 dark:border-white/10 animate-pulse">
                  {t("chatTyping")}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 p-2 md:p-3 border-t border-white/20 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chatPlaceholder")}
              className="flex-1 rounded-xl border border-white/30 dark:border-white/10 bg-white dark:bg-slate-800/80 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-ops-cyan/50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="shrink-0 w-10 h-10 rounded-xl bg-ops-cyan/80 dark:bg-ops-cyan/70 text-white flex items-center justify-center hover:bg-ops-cyan dark:hover:bg-ops-cyan disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-glow-cyan"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-12 h-12 sm:w-14 sm:h-14 min-w-[3rem] min-h-[3rem] sm:min-w-[3.5rem] sm:min-h-[3.5rem] rounded-full bg-cyan-500 text-white flex items-center justify-center p-0 border-2 border-cyan-400 shadow-lg hover:bg-cyan-400 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-ops-cyan focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
        style={{ boxShadow: "0 0 30px rgba(6, 182, 212, 0.6), 0 4px 14px rgba(0,0,0,0.2)" }}
        aria-label={t("chatTitle")}
      >
        <BotIcon className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
      </button>
      </div>
    </div>
  );
}
