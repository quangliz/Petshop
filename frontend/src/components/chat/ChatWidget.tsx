"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { X, Send, User, Plus, History, ArrowLeft, Phone, Mail, ShoppingCart } from "lucide-react";
import { useAuthStore, useViewingProductStore } from "@/lib/store";
import CatbotLogo from "./CatbotLogo";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";
import Image from 'next/image';
import { toast } from 'sonner';
import ProductVariantDrawer from "@/components/ProductVariantDrawer";
import { Product } from "@/lib/types";

type ChatProduct = { slug: string; name: string; brand?: string | null; price: number; sale_price?: number | null; thumbnail_url?: string | null };
type ChatMsg = { role: string; content: string; products?: ChatProduct[] };
type ChatSessionMeta = { id: string; title: string; created_at: string | null };
type OpenCatbotChatDetail = { message?: string };

const PRODUCT_TAG_RE = /<product>\s*([^<>\s]+)\s*<\/product>/gi;

function ProductCard({ pr, onAddToCart }: { pr: ChatProduct; onAddToCart?: (e: React.MouseEvent) => void }) {
  const effectivePrice = pr.sale_price ?? pr.price;
  return (
    <a
      href={`/products/${pr.slug}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex gap-3 items-center p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 no-underline text-inherit align-top w-full"
    >
      {pr.thumbnail_url ? (
        <div className="relative w-12 h-12 shrink-0">
          <Image src={pr.thumbnail_url} alt={pr.name} fill sizes="48px" className="rounded-lg object-cover" />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-neutral-100 shrink-0" />
      )}
      <div className="min-w-0 flex-1 flex flex-col justify-between h-full min-h-[44px]">
        <div className="text-[12px] font-bold text-neutral-800 line-clamp-2 leading-tight">{pr.name}</div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="text-[12px] font-bold" style={{ color: "var(--teal-700)" }}>{effectivePrice.toLocaleString("vi-VN")}đ</div>
          {onAddToCart && (
            <button
              onClick={onAddToCart}
              className="w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors hover:scale-105 active:scale-95 shrink-0"
              style={{ color: "var(--primary-600)", background: "var(--primary-50)" }}
              title="Thêm vào giỏ hàng"
            >
              <ShoppingCart size={13} />
            </button>
          )}
        </div>
      </div>
    </a>
  );
}

function isIncompleteProductTag(str: string): boolean {
  const s = str.toLowerCase();
  
  // State 1: Prefix of <product>
  const fullOpenTag = "<product>";
  if (fullOpenTag.startsWith(s)) {
    return true;
  }
  
  // State 2: <product> followed by slug (no < or > inside slug)
  if (s.startsWith("<product>")) {
    const rest = s.slice("<product>".length);
    if (!rest.includes("<") && !rest.includes(">")) {
      return true;
    }
    
    // State 3: <product>slug< followed by prefix of /product>
    const lastLess = s.lastIndexOf("<");
    if (lastLess > 0) {
      const slug = s.slice("<product>".length, lastLess);
      if (!slug.includes("<") && !slug.includes(">")) {
        const afterLess = s.slice(lastLess);
        const fullCloseTag = "</product>";
        if (fullCloseTag.startsWith(afterLess)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function preprocessContent(content: string): { cleanContent: string; incompleteTag: string | null } {
  const re = new RegExp(PRODUCT_TAG_RE.source, "gi");
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    lastIndex = match.index + match[0].length;
  }
  
  const tail = content.slice(lastIndex);
  const lastLess = tail.lastIndexOf("<");
  if (lastLess !== -1) {
    const possibleTag = tail.slice(lastLess);
    if (isIncompleteProductTag(possibleTag)) {
      return {
        cleanContent: content.slice(0, lastIndex + lastLess),
        incompleteTag: possibleTag,
      };
    }
  }
  
  return {
    cleanContent: content,
    incompleteTag: null,
  };
}

function ProductCardWrapper({
  slug,
  initialProduct,
  onOpenDrawer,
}: {
  slug: string;
  initialProduct?: ChatProduct;
  onOpenDrawer: (product: Product) => void;
}) {
  const [fetchedProduct, setFetchedProduct] = useState<ChatProduct | null>(null);
  const [loading, setLoading] = useState(!initialProduct);
  const [fullProduct, setFullProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (initialProduct) {
      return;
    }

    let isMounted = true;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${slug}`);
        if (isMounted) {
          setFetchedProduct({
            slug: data.slug,
            name: data.name,
            brand: data.brand,
            price: data.price,
            sale_price: data.sale_price,
            thumbnail_url: data.images?.main || null,
          });
          setFullProduct(data);
        }
      } catch (err) {
        console.error("Failed to fetch product for stream card:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void fetchProduct();
    return () => {
      isMounted = false;
    };
  }, [slug, initialProduct]);

  const handleAddToCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (fullProduct) {
      onOpenDrawer(fullProduct);
      return;
    }

    const toastId = toast.loading("Đang tải thông tin sản phẩm...");
    try {
      const { data } = await api.get(`/products/${slug}`);
      setFullProduct(data);
      onOpenDrawer(data);
      toast.dismiss(toastId);
    } catch (err) {
      console.error("Failed to fetch full product for drawer:", err);
      toast.error("Không thể lấy thông tin sản phẩm. Vui lòng thử lại.", { id: toastId });
    }
  };

  const displayProduct = initialProduct || fetchedProduct;
  const isDisplayLoading = !initialProduct && loading;

  if (isDisplayLoading) {
    return (
      <div
        className="inline-flex gap-3 items-center p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 align-top animate-pulse w-full"
        style={{ height: "66px" }}
      >
        <div className="w-12 h-12 rounded-lg bg-neutral-200 shrink-0" />
        <div className="min-w-0 flex-1 flex flex-col gap-1.5 justify-center">
          <div className="h-3 bg-neutral-200 rounded w-3/4" />
          <div className="h-3 bg-neutral-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!displayProduct) return null;

  return <ProductCard pr={displayProduct} onAddToCart={handleAddToCartClick} />;
}

function renderInlineContent(
  content: string,
  products: ChatProduct[] | undefined,
  onOpenDrawer: (product: Product) => void
) {
  const mdComponents = {
    p: ({ children }: { children?: React.ReactNode }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul style={{ margin: "6px 0", paddingLeft: "18px" }}>{children}</ul>,
    li: ({ children }: { children?: React.ReactNode }) => <li style={{ marginBottom: "3px" }}>{children}</li>,
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      let cleanHref = href || "";
      if (cleanHref.includes("://forum/")) {
        cleanHref = cleanHref.substring(cleanHref.indexOf("://forum/") + 3);
      }
      if (cleanHref.startsWith("forum/")) {
        cleanHref = "/" + cleanHref;
      }
      return (
        <a
          href={cleanHref}
          className="text-orange-600 hover:text-orange-700 font-semibold underline"
          target={cleanHref.startsWith("http") ? "_blank" : undefined}
          rel={cleanHref.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {children}
        </a>
      );
    },
  };

  const { cleanContent } = preprocessContent(content);
  const bySlug = Object.fromEntries((products || []).map((p) => [p.slug, p]));
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(PRODUCT_TAG_RE.source, "gi");
  let idx = 0;
  while ((match = re.exec(cleanContent)) !== null) {
    const textBefore = cleanContent.slice(last, match.index);
    if (textBefore) parts.push(<ReactMarkdown key={`t${idx}`} components={mdComponents}>{textBefore}</ReactMarkdown>);
    const slug = match[1];
    const pr = bySlug[slug];
    parts.push(
      <div key={`p${idx}`} style={{ display: "flex", gap: 8, margin: "6px 0" }}>
        <ProductCardWrapper slug={slug} initialProduct={pr} onOpenDrawer={onOpenDrawer} />
      </div>
    );
    last = match.index + match[0].length;
    idx++;
  }
  const remaining = cleanContent.slice(last);
  if (remaining) parts.push(<ReactMarkdown key={`t${idx}`} components={mdComponents}>{remaining}</ReactMarkdown>);
  return <>{parts}</>;
}


const iconBtnCls = "border-none bg-white/10 text-white w-[30px] h-[30px] rounded-[8px] cursor-pointer flex items-center justify-center shrink-0 hover:bg-white/20 transition-colors";

export default function ChatWidget() {
  const pathname = usePathname();
  const hasBottomTab = pathname.startsWith("/products/");
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const closePanel = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    setTimeout(() => { setIsOpen(false); setIsClosing(false); }, isMobile ? 280 : 200);
  }, [isClosing]);
  const togglePanel = () => { if (isOpen) closePanel(); else setIsOpen(true); };

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>("");

  const viewingProduct = useViewingProductStore((s) => s.viewingProduct);
  const widgetRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: sessions, refetch: refetchSessions } = useQuery<ChatSessionMeta[]>({
    queryKey: ["chat-sessions"],
    queryFn: async () => (await api.get("/chat/sessions")).data,
    enabled: !!user && isOpen,
  });

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setSessionTitle("");
    setView("chat");
    if (!user) {
      localStorage.removeItem("thepawsome_guest_session_id");
    }
  }, [user]);

  const loadSession = useCallback(async (sid: string) => {
    try {
      const { data } = await api.get(`/chat/sessions/${sid}/messages`);
      setSessionId(sid);
      setSessionTitle(data.session.title);
      setMessages((data.messages as { role: string; content: string; products?: ChatProduct[] }[]).map((m) => ({ role: m.role, content: m.content, ...(m.products ? { products: m.products } : {}) })));
      setView("chat");
    } catch (e) {
      console.error("Failed to load session", e);
      if (!user) {
        localStorage.removeItem("thepawsome_guest_session_id");
        setSessionId(null);
        setMessages([]);
      }
    }
  }, [user]);

  const sendMessage = useCallback(async (messageOverride?: string) => {
    const userMsg = (messageOverride ?? input).trim();
    if (!userMsg || isTypingRef.current) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    isTypingRef.current = true;
    setIsTyping(true);
    const activeSessionId = sessionId;
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1'}/chat/stream`;
    const token = localStorage.getItem("token");

    // Abort any in-flight request before starting a new one.
    // This is the root-cause fix: aborting cleanly tells the server to stop
    // immediately, avoiding orphaned tasks that cause CancelledError.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(backendUrl, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({ message: userMsg, session_id: activeSessionId, product_slug: viewingProduct?.slug || null }),
      });
      if (!response.ok) { const errText = await response.text().catch(() => ""); throw new Error(`HTTP ${response.status}: ${errText || "Lấy phản hồi thất bại"}`); }
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let aiContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: aiContent }]);
      let buffer = "";
      const rememberSession = (sid?: string) => {
        if (!sid || activeSessionId) return;
        setSessionId(sid);
        if (!user) {
          localStorage.setItem("thepawsome_guest_session_id", sid);
        }
      };
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
        } else if (eventType === "session") {
          rememberSession(data.session_id);
        } else if (eventType === "done" && data.session_id) {
          rememberSession(data.session_id);
          if (user) {
            refetchSessions();
          }
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
      // AbortError is expected when we cancel a request intentionally
      // (new message sent or component unmounted) — don't show error to user.
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Chat Error:", e);
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ Lỗi: ${e instanceof Error ? e.message : "Không thể kết nối tới máy chủ."}` }]);
    } finally {
      isTypingRef.current = false;
      setIsTyping(false);
    }
  }, [input, refetchSessions, sessionId, viewingProduct?.slug, user]);

  // Abort any in-flight SSE request when the component unmounts.
  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as OpenCatbotChatDetail | undefined : undefined;
      setIsOpen(true);
      setIsClosing(false);
      setView("chat");
      const message = detail?.message?.trim();
      if (message) {
        window.setTimeout(() => { void sendMessage(message); }, 0);
      }
    };
    window.addEventListener("open-catbot-chat", handleOpen);
    return () => window.removeEventListener("open-catbot-chat", handleOpen);
  }, [sendMessage]);

  // Handle user authentication transitions and initial guest session load
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (prevUserRef.current !== user) {
      prevUserRef.current = user;
      setMessages([]);
      setSessionId(null);
      setSessionTitle("");
      setView("chat");
      if (!user) {
        const savedGuestSessionId = localStorage.getItem("thepawsome_guest_session_id");
        if (savedGuestSessionId) {
          void loadSession(savedGuestSessionId);
        }
      }
    }
  }, [user, loadSession]);

  useEffect(() => {
    if (!user) {
      const savedGuestSessionId = localStorage.getItem("thepawsome_guest_session_id");
      if (savedGuestSessionId) {
        void loadSession(savedGuestSessionId);
      }
    }
  }, [user, loadSession]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || widgetRef.current?.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const blockNextClick = (clickEvent: MouseEvent) => {
        window.clearTimeout(cleanupClickBlocker);
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        clickEvent.stopImmediatePropagation();
      };
      const cleanupClickBlocker = window.setTimeout(() => {
        document.removeEventListener("click", blockNextClick, true);
      }, 750);
      document.addEventListener("click", blockNextClick, { capture: true, once: true });
      closePanel();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [closePanel, isOpen]);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  return (
    <div ref={widgetRef} className={`fixed ${hasBottomTab ? "bottom-[72px]" : "bottom-4"} right-4 md:bottom-8 md:right-8 z-[1000] flex flex-col items-end gap-4`}>
      {isOpen && (
        <div
          className={`chat-panel ${isClosing ? "chat-panel-closing" : ""} w-[calc(100vw-2rem)] ${hasBottomTab ? "h-[calc(100dvh-220px)]" : "h-[calc(100dvh-164px)]"} md:w-[400px] md:h-[600px] flex flex-col overflow-hidden bg-white rounded-2xl border`}
          style={{
            borderColor: "var(--primary-200)",
            boxShadow: "0 20px 44px rgba(193, 79, 39, 0.22), 0 6px 16px rgba(66, 60, 51, 0.08)",
          }}
        >
          {/* Header */}
          <div className="px-5 py-4 text-white flex items-center gap-3" style={{ background: "linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%)" }}>
            {view === "history" ? (
              <button onClick={() => setView("chat")} className={iconBtnCls}><ArrowLeft size={18} /></button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><CatbotLogo size={24} /></div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-extrabold overflow-hidden text-ellipsis whitespace-nowrap">
                {view === "history" ? "Lịch sử cuộc trò chuyện" : (sessionTitle || "Catbot")}
              </div>
              {view === "chat" && (
                <div className="text-[11px] text-white/70 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Trực tuyến · {viewingProduct ? `Đang xem: ${viewingProduct.name.slice(0, 20)}` : "Tư vấn chung"}
                </div>
              )}
            </div>
            {view === "chat" && (
              <div className="flex gap-1.5">
                <button onClick={startNewChat} title="Chat mới" className={iconBtnCls}><Plus size={16} /></button>
                {user && (
                  <button onClick={() => { setView("history"); refetchSessions(); }} title="Lịch sử" className={iconBtnCls}><History size={16} /></button>
                )}
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
                    style={{ background: s.id === sessionId ? "var(--primary-50)" : undefined, border: "none", borderBottom: "1px solid var(--neutral-100)" }}
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
              {/* Messages */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-neutral-25">
                {messages.length === 0 && (
                  <div className="text-center py-10 px-5 text-neutral-500 text-[14px] leading-relaxed">
                    Chào <strong>{user?.full_name || "bạn"}</strong>! 🐱<br />
                    Mình là <strong>Catbot</strong> — trợ lý AI của ThePawsome. Hỏi mình về sức khoẻ, dinh dưỡng hoặc sản phẩm cho pet nhé!
                    <span className="block mt-2 text-[12px]">
                      Nội dung chỉ mang tính tham khảo, không thay thế chẩn đoán hoặc điều trị của bác sĩ thú y.
                    </span>
                  </div>
                )}

                {messages.map((m, idx) => {
                  if (m.role === "assistant" && !m.content && (!m.products || m.products.length === 0)) {
                    return null;
                  }
                  return (
                    <div key={idx} className={`flex gap-2.5 items-end ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className="w-[30px] h-[30px] rounded-[10px] shrink-0 flex items-center justify-center"
                        style={{ background: "var(--primary-100)", color: "var(--primary-700)" }}
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
                          ? renderInlineContent(m.content, m.products, (prod) => {
                              setDrawerProduct(prod);
                              setIsDrawerOpen(true);
                            })
                          : <ReactMarkdown components={{ p: ({ children }) => <p style={{ margin: "0 0 6px 0" }}>{children}</p> }}>{m.content}</ReactMarkdown>
                        }
                      </div>
                    </div>
                  );
                })}

                {isTyping && (messages.length === 0 || messages[messages.length - 1].role !== "assistant" || !messages[messages.length - 1].content) && (
                  <div className="flex gap-2.5">
                    <div className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center" style={{ background: "var(--primary-100)", color: "var(--primary-700)" }}>
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
                    placeholder="Nhập câu hỏi cho Catbot..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void sendMessage(); }}
                    disabled={isTyping}
                    className="flex-1 border-none bg-neutral-50 px-3.5 py-2.5 rounded-[10px] text-[13px] outline-none disabled:opacity-60"
                  />
                  <button
                    onClick={() => { void sendMessage(); }}
                    disabled={!input.trim() || isTyping}
                    className="w-10 h-10 rounded-[10px] text-white border-none cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
                    style={{ background: "var(--primary-600)" }}
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] text-neutral-400">
                  Catbot là AI và có thể sai.
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
            background: isOpen ? "var(--neutral-900)" : "linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)",
            boxShadow: isOpen ? "0 12px 24px rgba(0, 0, 0, 0.15)" : "0 12px 24px rgba(193, 79, 39, 0.3)",
            transform: isOpen ? "rotate(90deg)" : undefined,
          }}
          onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-4px)"; }}
          onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
        >
          {isOpen ? <X size={28} /> : <CatbotLogo size={34} />}
        </button>
      </div>

      {drawerProduct && (
        <ProductVariantDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          product={drawerProduct}
          defaultAction="add"
        />
      )}
    </div>
  );
}
