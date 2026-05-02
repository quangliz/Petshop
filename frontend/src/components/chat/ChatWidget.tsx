"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Send, User, Plus, History, ArrowLeft, Phone, Mail } from "lucide-react";
import { useAuthStore, useViewingProductStore } from "@/lib/store";
import CatbotLogo from "./CatbotLogo";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";

type ChatProduct = { slug: string; name: string; brand?: string | null; price: number; sale_price?: number | null; thumbnail_url?: string | null };
type ChatMsg = { role: string; content: string; products?: ChatProduct[] };
type ChatSessionMeta = { id: string; title: string; created_at: string | null };
import Image from 'next/image';

const PRODUCT_TAG_RE = /<product>\s*([^<>\s]+)\s*<\/product>/gi;

function ProductCard({ pr }: { pr: ChatProduct }) {
  const effectivePrice = pr.sale_price ?? pr.price;
  return (
    <a href={`/products/${pr.slug}`} target="_blank" rel="noreferrer"
      style={{
        display: "inline-flex", gap: 8, alignItems: "center", padding: 8, borderRadius: 10,
        background: "var(--neutral-50)", border: "1px solid var(--neutral-100)",
        width: "calc(50% - 4px)", textDecoration: "none", color: "inherit", verticalAlign: "top",
      }}>
      {pr.thumbnail_url ? (
        <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
          <Image src={pr.thumbnail_url} alt={pr.name} fill sizes="40px" style={{ borderRadius: 8, objectFit: "cover" }} />
        </div>
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--neutral-100)", flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--neutral-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pr.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--teal-700)", fontWeight: 700 }}>
          {effectivePrice.toLocaleString("vi-VN")}đ
        </div>
      </div>
    </a>
  );
}

function renderInlineContent(content: string, products: ChatProduct[] | undefined) {
  if (!products || products.length === 0) {
    return <ReactMarkdown components={{
      p: ({ children }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p>,
      ul: ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: "18px" }}>{children}</ul>,
      li: ({ children }) => <li style={{ marginBottom: "3px" }}>{children}</li>,
    }}>{content}</ReactMarkdown>;
  }

  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(PRODUCT_TAG_RE.source, "gi");
  let idx = 0;

  while ((match = re.exec(content)) !== null) {
    const textBefore = content.slice(last, match.index);
    if (textBefore) {
      parts.push(
        <ReactMarkdown key={`t${idx}`} components={{
          p: ({ children }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: "18px" }}>{children}</ul>,
          li: ({ children }) => <li style={{ marginBottom: "3px" }}>{children}</li>,
        }}>{textBefore}</ReactMarkdown>
      );
    }
    const slug = match[1];
    const pr = bySlug[slug];
    if (pr) {
      parts.push(<div key={`p${idx}`} style={{ display: "flex", gap: 8, margin: "6px 0" }}><ProductCard pr={pr} /></div>);
    }
    last = match.index + match[0].length;
    idx++;
  }

  const remaining = content.slice(last);
  if (remaining) {
    parts.push(
      <ReactMarkdown key={`t${idx}`} components={{
        p: ({ children }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p>,
        ul: ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: "18px" }}>{children}</ul>,
        li: ({ children }) => <li style={{ marginBottom: "3px" }}>{children}</li>,
      }}>{remaining}</ReactMarkdown>
    );
  }

  return <>{parts}</>;
}

export default function ChatWidget() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const closePanel = () => {
    if (isClosing) return;
    setIsClosing(true);
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    setTimeout(() => { setIsOpen(false); setIsClosing(false); }, isMobile ? 280 : 200);
  };
  const togglePanel = () => { if (isOpen) closePanel(); else setIsOpen(true); };

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>("");

  const viewingProduct = useViewingProductStore((s) => s.viewingProduct);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: pets } = useQuery({
    queryKey: ["pets"],
    queryFn: async () => (await api.get("/pets/")).data,
    enabled: !!user,
  });

  const {
    data: sessions,
    refetch: refetchSessions,
  } = useQuery<ChatSessionMeta[]>({
    queryKey: ["chat-sessions"],
    queryFn: async () => (await api.get("/chat/sessions")).data,
    enabled: !!user && isOpen,
  });

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  if (!user) return null;

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setSessionTitle("");
    setSelectedPet("");
    setView("chat");
  };

  const loadSession = async (sid: string) => {
    try {
      const { data } = await api.get(`/chat/sessions/${sid}/messages`);
      setSessionId(sid);
      setSessionTitle(data.session.title);
      setMessages(
        (data.messages as { role: string; content: string; products?: ChatProduct[] }[]).map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.products ? { products: m.products } : {}),
        }))
      );
      setView("chat");
    } catch (e) {
      console.error("Failed to load session", e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1'}/chat/stream`;
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMsg,
          session_id: sessionId,
          pet_id: selectedPet || null,
          product_slug: viewingProduct?.slug || null,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error("Chat stream error", response.status, errText);
        throw new Error(`HTTP ${response.status}: ${errText || "Lấy phản hồi thất bại"}`);
      }
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let aiContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: aiContent }]);

      let buffer = "";
      const processEvent = (raw: string) => {
        let eventType = "message";
        const dataLines: string[] = [];
        for (const rawLine of raw.split(/\r?\n/)) {
          const line = rawLine.replace(/\r$/, "");
          if (!line) continue;
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).replace(/^ /, ""));
          }
        }
        if (dataLines.length === 0) return;
        const dataRaw = dataLines.join("\n");
        let data: { content?: string; items?: ChatProduct[]; session_id?: string };
        try {
          data = JSON.parse(dataRaw);
        } catch (e) {
          console.error("SSE JSON Parse error", e, dataRaw);
          return;
        }
        if (eventType === "message" && data.content) {
          aiContent += data.content;
          setMessages((prev) => {
            const clone = [...prev];
            clone[clone.length - 1].content = aiContent;
            return clone;
          });
        } else if (eventType === "products" && Array.isArray(data.items)) {
          setMessages((prev) => {
            const clone = [...prev];
            clone[clone.length - 1].products = data.items;
            return clone;
          });
        } else if (eventType === "done") {
          if (data.session_id) {
            if (!sessionId) setSessionId(data.session_id);
            refetchSessions();
          }
        } else if (eventType === "error") {
          console.error("SSE error event:", data);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) processEvent(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let sepIdx: number;
        while ((sepIdx = buffer.search(/\r?\n\r?\n/)) !== -1) {
          const raw = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx).replace(/^(\r?\n){2}/, "");
          processEvent(raw);
        }
      }
    } catch (e) {
      console.error("Chat Error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ Lỗi: ${e instanceof Error ? e.message : "Không thể kết nối tới máy chủ."}` },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-[76px] right-4 md:bottom-8 md:right-8 z-[1000] flex flex-col items-end gap-4">
      {isOpen && (
        <div className={`card chat-panel ${isClosing ? "chat-panel-closing" : ""} w-[calc(100vw-2rem)] h-[calc(100dvh-164px)] md:w-[400px] md:h-[600px] flex flex-col overflow-hidden bg-white rounded-2xl`} style={{
          boxShadow: "0 20px 40px rgba(26, 24, 20, 0.15)",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, var(--teal-600) 0%, var(--teal-700) 100%)",
            padding: "16px 20px", color: "white", display: "flex", alignItems: "center", gap: 12,
          }}>
            {view === "history" ? (
              <button onClick={() => setView("chat")} style={iconBtnStyle}>
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CatbotLogo size={24} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {view === "history" ? "Lịch sử cuộc trò chuyện" : (sessionTitle || "Catbot")}
              </div>
              {view === "chat" && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: "#4ade80" }} />
                  Trực tuyến · {viewingProduct ? `Đang xem: ${viewingProduct.name.slice(0, 20)}` : selectedPet ? "Hồ sơ pet" : "Tư vấn chung"}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {view === "chat" && (
                <>
                  <button onClick={startNewChat} title="Chat mới" style={iconBtnStyle}><Plus size={16} /></button>
                  <button onClick={() => { setView("history"); refetchSessions(); }} title="Lịch sử" style={iconBtnStyle}><History size={16} /></button>
                </>
              )}
            </div>
          </div>

          {/* History view */}
          {view === "history" ? (
            <div style={{ flex: 1, overflowY: "auto", background: "var(--neutral-25)" }}>
              {!sessions || sessions.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--neutral-400)", fontSize: 13 }}>
                  Chưa có cuộc trò chuyện nào
                </div>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    style={{
                      width: "100%", textAlign: "left", padding: "14px 20px",
                      background: s.id === sessionId ? "var(--teal-50)" : "transparent",
                      border: "none", borderBottom: "1px solid var(--neutral-100)",
                      cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--neutral-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {s.title}
                    </span>
                    {s.created_at && (
                      <span style={{ fontSize: 11, color: "var(--neutral-400)" }}>
                        {new Date(s.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Pet Selector */}
              <div style={{ background: "var(--neutral-50)", padding: "8px 20px", borderBottom: "1px solid var(--neutral-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--neutral-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Đang tư vấn cho:</span>
                <select
                  style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 700, color: "var(--teal-700)", cursor: "pointer", outline: "none" }}
                  value={selectedPet}
                  onChange={(e) => setSelectedPet(e.target.value)}
                  disabled={!!sessionId}
                >
                  <option value="">Tư vấn chung</option>
                  {pets?.map((p: { id: string, name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, background: "var(--neutral-25)" }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--neutral-500)", fontSize: 14, lineHeight: 1.6 }}>
                    Chào <strong>{user.full_name}</strong>! 🐱<br />
                    Mình là <strong>Catbot</strong> — trợ lý AI của ThePawsome. Hỏi mình bất cứ điều gì về sức khoẻ, dinh dưỡng hoặc sản phẩm cho pet nhé!
                  </div>
                )}

                {messages.map((m, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-end" }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                      background: m.role === "user" ? "var(--primary-100)" : "var(--teal-100)",
                      color: m.role === "user" ? "var(--primary-600)" : "var(--teal-600)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {m.role === "user" ? <User size={15} /> : <CatbotLogo size={18} />}
                    </div>
                    <div style={{
                      maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 13, lineHeight: 1.55,
                      background: m.role === "user" ? "var(--primary-600)" : "white",
                      color: m.role === "user" ? "white" : "var(--neutral-800)",
                      boxShadow: m.role === "user" ? "none" : "var(--shadow-sm)",
                      border: m.role === "user" ? "none" : "1px solid var(--neutral-100)",
                      borderBottomRightRadius: m.role === "user" ? 4 : 14,
                      borderBottomLeftRadius: m.role === "user" ? 14 : 4,
                    }}>
                      {m.role === "assistant"
                        ? renderInlineContent(m.content, m.products)
                        : <ReactMarkdown components={{
                            p: ({ children }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p>,
                          }}>{m.content}</ReactMarkdown>
                      }
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 10, background: "var(--teal-100)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CatbotLogo size={18} />
                    </div>
                    <div style={{ padding: "10px 14px", background: "white", borderRadius: 14, borderBottomLeftRadius: 4, boxShadow: "var(--shadow-sm)", border: "1px solid var(--neutral-100)", display: "flex", gap: 5, alignItems: "center" }}>
                      <span className="dot-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="dot-bounce" style={{ animationDelay: "160ms" }} />
                      <span className="dot-bounce" style={{ animationDelay: "320ms" }} />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Composer */}
              <div style={{ padding: "16px 20px", background: "white", borderTop: "1px solid var(--neutral-100)", display: "flex", gap: 10 }}>
                <input
                  placeholder="Nhập câu hỏi cho AI..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={isTyping}
                  style={{ flex: 1, border: "none", background: "var(--neutral-50)", padding: "10px 14px", borderRadius: 10, fontSize: 13, outline: "none" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isTyping}
                  style={{ width: 40, height: 40, borderRadius: 10, background: "var(--teal-600)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bottom row: contacts + toggle */}
      <div className="flex items-center gap-3">
        {isOpen && !isClosing && (
          <>
            <a href="mailto:qcontact.12@gmail.com" aria-label="Email"
              className="contact-btn contact-btn-3 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white shadow-md transition-transform duration-200 ease-out hover:scale-125 active:scale-95"
              style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}>
              <Mail size={18} />
            </a>
            <a href="tel:+84888987400" aria-label="Phone"
              className="contact-btn contact-btn-2 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white shadow-md transition-transform duration-200 ease-out hover:scale-125 active:scale-95"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
              <Phone size={18} />
            </a>
            <a href="https://zalo.me/0888987400" target="_blank" rel="noreferrer" aria-label="Zalo"
              className="contact-btn contact-btn-1 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-extrabold shadow-md transition-transform duration-200 ease-out hover:scale-125 active:scale-95"
              style={{ background: "linear-gradient(135deg, #2188ff 0%, #0068ff 100%)", fontSize: 14, letterSpacing: "-0.02em" }}>
              Zalo
            </a>
          </>
        )}

        {/* Toggle Button */}
        <button
          onClick={togglePanel}
          className="w-14 h-14 md:w-16 md:h-16 rounded-[20px] md:rounded-3xl text-white border-none cursor-pointer flex items-center justify-center transition-all duration-200 ease-out hover:scale-105 active:scale-95"
          style={{
            background: isOpen ? "var(--neutral-900)" : "linear-gradient(135deg, var(--teal-500) 0%, var(--teal-600) 100%)",
            boxShadow: "0 12px 24px rgba(13, 148, 136, 0.3)",
            transform: isOpen ? "rotate(90deg)" : "none",
          }}
          onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.transform = "none"; }}
        >
          {isOpen ? <X size={28} /> : <CatbotLogo size={34} />}
        </button>
      </div>

      <style jsx>{`
        .chat-panel {
          animation: chat-slide-up 320ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, opacity;
        }
        .chat-panel.chat-panel-closing {
          animation: chat-slide-down 280ms cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        @keyframes chat-slide-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chat-slide-down {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(100%); }
        }
        @media (min-width: 768px) {
          .chat-panel {
            animation: chat-appear 240ms cubic-bezier(0.2, 1, 0.3, 1);
          }
          .chat-panel.chat-panel-closing {
            animation: chat-disappear 200ms cubic-bezier(0.4, 0, 1, 1) forwards;
          }
        }
        @keyframes chat-appear {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .contact-btn {
          animation: contact-slide-in 360ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        .contact-btn-1 { animation-delay: 60ms; }
        .contact-btn-2 { animation-delay: 140ms; }
        .contact-btn-3 { animation-delay: 220ms; }
        @keyframes contact-slide-in {
          from { opacity: 0; transform: translateX(40px) scale(0.6); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes chat-disappear {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(20px) scale(0.95); }
        }
        .dot-bounce {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--teal-500);
          animation: dot-bounce 1.2s ease-in-out infinite both;
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  width: 30,
  height: 30,
  borderRadius: 8,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
