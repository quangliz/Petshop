"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Send, User, Plus, History, ArrowLeft, Phone, Mail } from "lucide-react";
import { useAuthStore, useViewingProductStore } from "@/lib/store";
import CatbotLogo from "./CatbotLogo";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";
import Image from 'next/image';

type ChatProduct = { slug: string; name: string; brand?: string | null; price: number; sale_price?: number | null; thumbnail_url?: string | null };
type ChatMsg = { role: string; content: string; products?: ChatProduct[] };
type ChatSessionMeta = { id: string; title: string; created_at: string | null };

const PRODUCT_TAG_RE = /<product>\s*([^<>\s]+)\s*<\/product>/gi;

function ProductCard({ pr }: { pr: ChatProduct }) {
  const effectivePrice = pr.sale_price ?? pr.price;
  return (
    <a
      href={`/products/${pr.slug}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex gap-2 items-center p-2 rounded-[10px] bg-neutral-50 border border-neutral-100 no-underline text-inherit align-top"
      style={{ width: "calc(50% - 4px)" }}
    >
      {pr.thumbnail_url ? (
        <div className="relative w-10 h-10 shrink-0">
          <Image src={pr.thumbnail_url} alt={pr.name} fill sizes="40px" className="rounded-lg object-cover" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-lg bg-neutral-100 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-neutral-800 overflow-hidden text-ellipsis whitespace-nowrap">{pr.name}</div>
        <div className="text-[11px] font-bold" style={{ color: "var(--teal-700)" }}>{effectivePrice.toLocaleString("vi-VN")}đ</div>
      </div>
    </a>
  );
}

function renderInlineContent(content: string, products: ChatProduct[] | undefined) {
  const mdComponents = {
    p: ({ children }: { children?: React.ReactNode }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul style={{ margin: "6px 0", paddingLeft: "18px" }}>{children}</ul>,
    li: ({ children }: { children?: React.ReactNode }) => <li style={{ marginBottom: "3px" }}>{children}</li>,
  };
  if (!products || products.length === 0) {
    return <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>;
  }
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(PRODUCT_TAG_RE.source, "gi");
  let idx = 0;
  while ((match = re.exec(content)) !== null) {
    const textBefore = content.slice(last, match.index);
    if (textBefore) parts.push(<ReactMarkdown key={`t${idx}`} components={mdComponents}>{textBefore}</ReactMarkdown>);
    const pr = bySlug[match[1]];
    if (pr) parts.push(<div key={`p${idx}`} style={{ display: "flex", gap: 8, margin: "6px 0" }}><ProductCard pr={pr} /></div>);
    last = match.index + match[0].length;
    idx++;
  }
  const remaining = content.slice(last);
  if (remaining) parts.push(<ReactMarkdown key={`t${idx}`} components={mdComponents}>{remaining}</ReactMarkdown>);
  return <>{parts}</>;
}

const iconBtnCls = "border-none bg-white/10 text-white w-[30px] h-[30px] rounded-[8px] cursor-pointer flex items-center justify-center shrink-0 hover:bg-white/20 transition-colors";

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

  const { data: sessions, refetch: refetchSessions } = useQuery<ChatSessionMeta[]>({
    queryKey: ["chat-sessions"],
    queryFn: async () => (await api.get("/chat/sessions")).data,
    enabled: !!user && isOpen,
  });

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  if (!user) return null;

  const startNewChat = () => { setMessages([]); setSessionId(null); setSessionTitle(""); setSelectedPet(""); setView("chat"); };

  const loadSession = async (sid: string) => {
    try {
      const { data } = await api.get(`/chat/sessions/${sid}/messages`);
      setSessionId(sid);
      setSessionTitle(data.session.title);
      setMessages((data.messages as { role: string; content: string; products?: ChatProduct[] }[]).map((m) => ({ role: m.role, content: m.content, ...(m.products ? { products: m.products } : {}) })));
      setView("chat");
    } catch (e) { console.error("Failed to load session", e); }
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg, session_id: sessionId, pet_id: selectedPet || null, product_slug: viewingProduct?.slug || null }),
      });
      if (!response.ok) { const errText = await response.text().catch(() => ""); throw new Error(`HTTP ${response.status}: ${errText || "Lấy phản hồi thất bại"}`); }
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
          if (line.startsWith("event:")) eventType = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
        }
        if (dataLines.length === 0) return;
        let data: { content?: string; items?: ChatProduct[]; session_id?: string };
        try { data = JSON.parse(dataLines.join("\n")); } catch { return; }
        if (eventType === "message" && data.content) {
          aiContent += data.content;
          setMessages((prev) => { const clone = [...prev]; clone[clone.length - 1].content = aiContent; return clone; });
        } else if (eventType === "products" && Array.isArray(data.items)) {
          setMessages((prev) => { const clone = [...prev]; clone[clone.length - 1].products = data.items; return clone; });
        } else if (eventType === "done" && data.session_id) {
          if (!sessionId) setSessionId(data.session_id);
          refetchSessions();
        }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) { if (buffer.trim()) processEvent(buffer); break; }
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
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Lỗi: ${e instanceof Error ? e.message : "Không thể kết nối tới máy chủ."}` }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="fixed bottom-[76px] right-4 md:bottom-8 md:right-8 z-[1000] flex flex-col items-end gap-4">
      {isOpen && (
        <div
          className={`chat-panel ${isClosing ? "chat-panel-closing" : ""} w-[calc(100vw-2rem)] h-[calc(100dvh-164px)] md:w-[400px] md:h-[600px] flex flex-col overflow-hidden bg-white rounded-2xl border border-neutral-100`}
          style={{ boxShadow: "0 20px 40px rgba(26, 24, 20, 0.15)" }}
        >
          {/* Header */}
          <div className="px-5 py-4 text-white flex items-center gap-3" style={{ background: "linear-gradient(135deg, var(--teal-600) 0%, var(--teal-700) 100%)" }}>
            {view === "history" ? (
              <button onClick={() => setView("chat")} className={iconBtnCls}><ArrowLeft size={18} /></button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><CatbotLogo size={24} /></div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-extrabold overflow-hidden text-ellipsis whitespace-nowrap">
                {view === "history" ? "Lịch sử cuộc trò chuyện" : (sessionTitle || "Catbot")}
              </div>
              {view === "chat" && (
                <div className="text-[11px] text-white/70 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Trực tuyến · {viewingProduct ? `Đang xem: ${viewingProduct.name.slice(0, 20)}` : selectedPet ? "Hồ sơ pet" : "Tư vấn chung"}
                </div>
              )}
            </div>
            {view === "chat" && (
              <div className="flex gap-1.5">
                <button onClick={startNewChat} title="Chat mới" className={iconBtnCls}><Plus size={16} /></button>
                <button onClick={() => { setView("history"); refetchSessions(); }} title="Lịch sử" className={iconBtnCls}><History size={16} /></button>
              </div>
            )}
          </div>

          {/* History view */}
          {view === "history" ? (
            <div className="flex-1 overflow-y-auto bg-neutral-25">
              {!sessions || sessions.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-[13px]">Chưa có cuộc trò chuyện nào</div>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className="w-full text-left px-5 py-3.5 border-b border-neutral-100 cursor-pointer flex flex-col gap-1 hover:bg-neutral-50 transition-colors"
                    style={{ background: s.id === sessionId ? "var(--teal-50)" : undefined, border: "none", borderBottom: "1px solid var(--neutral-100)" }}
                  >
                    <span className="text-[13px] font-semibold text-neutral-800 overflow-hidden text-ellipsis whitespace-nowrap block">{s.title}</span>
                    {s.created_at && (
                      <span className="text-[11px] text-neutral-400">{new Date(s.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Pet Selector */}
              <div className="px-5 py-2 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.05em]">Đang tư vấn cho:</span>
                <select
                  className="border-none bg-transparent text-[12px] font-bold cursor-pointer outline-none disabled:opacity-60"
                  style={{ color: "var(--teal-700)" }}
                  value={selectedPet}
                  onChange={(e) => setSelectedPet(e.target.value)}
                  disabled={!!sessionId}
                >
                  <option value="">Tư vấn chung</option>
                  {pets?.map((p: { id: string, name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Messages */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-neutral-25">
                {messages.length === 0 && (
                  <div className="text-center py-10 px-5 text-neutral-500 text-[14px] leading-relaxed">
                    Chào <strong>{user.full_name}</strong>! 🐱<br />
                    Mình là <strong>Catbot</strong> — trợ lý AI của ThePawsome. Hỏi mình về sức khoẻ, dinh dưỡng hoặc sản phẩm cho pet nhé!
                    <span className="block mt-2 text-[12px]">
                      Nội dung chỉ mang tính tham khảo, không thay thế chẩn đoán hoặc điều trị của bác sĩ thú y.
                    </span>
                  </div>
                )}

                {messages.map((m, idx) => (
                  <div key={idx} className={`flex gap-2.5 items-end ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div
                      className="w-[30px] h-[30px] rounded-[10px] shrink-0 flex items-center justify-center"
                      style={{ background: m.role === "user" ? "var(--primary-100)" : "var(--teal-100)", color: m.role === "user" ? "var(--primary-600)" : "var(--teal-600)" }}
                    >
                      {m.role === "user" ? <User size={15} /> : <CatbotLogo size={18} />}
                    </div>
                    <div
                      className="max-w-[85%] px-3.5 py-2.5 rounded-[14px] text-[13px] leading-[1.55]"
                      style={{
                        background: m.role === "user" ? "var(--primary-600)" : "white",
                        color: m.role === "user" ? "white" : "var(--neutral-800)",
                        boxShadow: m.role === "user" ? "none" : "var(--shadow-sm)",
                        border: m.role === "user" ? "none" : "1px solid var(--neutral-100)",
                        borderBottomRightRadius: m.role === "user" ? 4 : 14,
                        borderBottomLeftRadius: m.role === "user" ? 14 : 4,
                      }}
                    >
                      {m.role === "assistant"
                        ? renderInlineContent(m.content, m.products)
                        : <ReactMarkdown components={{ p: ({ children }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p> }}>{m.content}</ReactMarkdown>
                      }
                    </div>
                  </div>
                ))}

                {isTyping && (messages.length === 0 || messages[messages.length - 1].role !== "assistant" || !messages[messages.length - 1].content) && (
                  <div className="flex gap-2.5">
                    <div className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center" style={{ background: "var(--teal-100)", color: "var(--teal-600)" }}>
                      <CatbotLogo size={18} />
                    </div>
                    <div className="px-3.5 py-2.5 bg-white rounded-[14px] border border-neutral-100 flex gap-1.5 items-center" style={{ boxShadow: "var(--shadow-sm)", borderBottomLeftRadius: 4 }}>
                      <span className="dot-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="dot-bounce" style={{ animationDelay: "160ms" }} />
                      <span className="dot-bounce" style={{ animationDelay: "320ms" }} />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Composer */}
              <div className="px-5 py-3 bg-white border-t border-neutral-100">
                <div className="flex gap-2.5">
                  <input
                    placeholder="Nhập câu hỏi cho AI..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    disabled={isTyping}
                    className="flex-1 border-none bg-neutral-50 px-3.5 py-2.5 rounded-[10px] text-[13px] outline-none disabled:opacity-60"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isTyping}
                    className="w-10 h-10 rounded-[10px] text-white border-none cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
                    style={{ background: "var(--teal-600)" }}
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] text-neutral-400">
                  Catbot là AI và có thể sai. Tình huống khẩn cấp cần liên hệ bác sĩ thú y.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bottom row: contacts + toggle */}
      <div className="flex items-center gap-3">
        {isOpen && !isClosing && (
          <>
            <a href="mailto:help@thepawsome.store" aria-label="Email"
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
              className="contact-btn contact-btn-1 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-extrabold text-[14px] tracking-[-0.02em] shadow-md transition-transform duration-200 ease-out hover:scale-125 active:scale-95"
              style={{ background: "linear-gradient(135deg, #2188ff 0%, #0068ff 100%)" }}>
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
            transform: isOpen ? "rotate(90deg)" : undefined,
          }}
          onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px)"; }}
          onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
        >
          {isOpen ? <X size={28} /> : <CatbotLogo size={34} />}
        </button>
      </div>
    </div>
  );
}
