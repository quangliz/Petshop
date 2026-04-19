"use client";
import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Sparkles, User, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";

export default function ChatWidget() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  const { data: pets } = useQuery({
    queryKey: ['pets'],
    queryFn: async () => {
      const res = await api.get('/pets');
      return res.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  if (!user) return null;

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    const backendUrl = "http://localhost:8000/api/v1/chat/stream";
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMsg,
          session_id: sessionId,
          pet_id: selectedPet || null
        })
      });

      if (!response.ok) throw new Error("Lấy phản hồi thất bại");
      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let aiContent = "";
      setMessages(prev => [...prev, { role: "assistant", content: aiContent }]); 

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        let eventType = "message";
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("event: ")) {
                eventType = line.substring(7);
            } else if (line.startsWith("data: ")) {
                const dataRaw = line.substring(6);
                if (!dataRaw) continue;
                
                try {
                    const data = JSON.parse(dataRaw);
                    if (eventType === "message" && data.content) {
                        aiContent += data.content;
                        setMessages(prev => {
                            const clone = [...prev];
                            clone[clone.length - 1].content = aiContent;
                            return clone;
                        });
                    } else if (eventType === "done") {
                        if (data.session_id && !sessionId) {
                            setSessionId(data.session_id);
                        }
                    }
                } catch (e) {
                    console.error("SSE JSON Parse error", e);
                }
            }
        }
      }
    } catch (e) {
       console.error("Chat Error:", e);
    } finally {
       setIsTyping(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>
      {/* Chat Window */}
      {isOpen && (
        <div className="card" style={{
          width: 400, height: 600, display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(26, 24, 20, 0.15)', overflow: 'hidden',
          animation: 'chat-appear 240ms cubic-bezier(0.2, 1, 0.3, 1)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--teal-600) 0%, var(--teal-700) 100%)',
            padding: '20px 24px', color: 'white', display: 'flex', alignItems: 'center', gap: 14
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Trợ lý PetShop AI</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#4ade80' }} /> Trực tuyến · {selectedPet ? 'Hồ sơ pet' : 'Tư vấn chung'}
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Pet Selector Dropdown (Minimalist) */}
          <div style={{ background: 'var(--neutral-50)', padding: '10px 20px', borderBottom: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đang tư vấn cho:</span>
             <select 
               style={{ border: 'none', background: 'transparent', fontSize: 12, fontWeight: 700, color: 'var(--teal-700)', cursor: 'pointer', outline: 'none' }}
               value={selectedPet} onChange={e => setSelectedPet(e.target.value)} disabled={!!sessionId}
             >
                <option value="">Tư vấn chung</option>
                {pets?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--neutral-25)' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--neutral-500)', fontSize: 14, lineHeight: 1.6 }}>
                 Chào <strong>{user.full_name}</strong>! 👋<br/>
                 Hãy hỏi mình bất cứ điều gì về sức khoẻ, dinh dưỡng hoặc huấn luyện cho pet nhé.
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} style={{
                display: 'flex', gap: 12, flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: m.role === 'user' ? 'var(--primary-100)' : 'var(--teal-100)',
                  color: m.role === 'user' ? 'var(--primary-600)' : 'var(--teal-600)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {m.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                </div>
                <div style={{
                  maxWidth: '85%', padding: '12px 16px', borderRadius: 16,
                  fontSize: 14, lineHeight: 1.5,
                  background: m.role === 'user' ? 'var(--primary-600)' : 'white',
                  color: m.role === 'user' ? 'white' : 'var(--neutral-800)',
                  boxShadow: m.role === 'user' ? 'none' : 'var(--shadow-sm)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--neutral-100)',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: m.role === 'user' ? 16 : 4,
                }}>
                  <ReactMarkdown components={{
                    p: ({children}) => <p style={{margin: '0 0 8px 0', lastChild: {margin: 0}}}>{children}</p>,
                    ul: ({children}) => <ul style={{margin: '8px 0', paddingLeft: '20px'}}>{children}</ul>,
                    li: ({children}) => <li style={{marginBottom: '4px'}}>{children}</li>
                  }}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--teal-100)', color: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={16} /></div>
                <div style={{ padding: '12px 16px', background: 'white', borderRadius: 16, borderBottomLeftRadius: 4, display: 'flex', gap: 4 }}>
                   <span className="dot-blink" style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--teal-300)' }} />
                   <span className="dot-blink" style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--teal-300)', animationDelay: '200ms' }} />
                   <span className="dot-blink" style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--teal-300)', animationDelay: '400ms' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div style={{ padding: '20px 24px', background: 'white', borderTop: '1px solid var(--neutral-100)', display: 'flex', gap: 12 }}>
            <input 
              placeholder="Nhập câu hỏi cho AI..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={isTyping}
              style={{ flex: 1, border: 'none', background: 'var(--neutral-50)', padding: '12px 16px', borderRadius: 12, fontSize: 14, outline: 'none' }}
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--teal-600)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 64, height: 64, borderRadius: 24,
          background: isOpen ? 'var(--neutral-900)' : 'linear-gradient(135deg, var(--teal-500) 0%, var(--teal-600) 100%)',
          color: 'white', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 24px rgba(13, 148, 136, 0.3)',
          transition: 'all 240ms cubic-bezier(0.2, 1, 0.3, 1)',
          transform: isOpen ? 'rotate(90deg)' : 'none'
        }}
        onMouseEnter={(e) => { if(!isOpen) e.currentTarget.style.transform = 'translateY(-4px)'; }}
        onMouseLeave={(e) => { if(!isOpen) e.currentTarget.style.transform = 'none'; }}
      >
        {isOpen ? <X size={28} /> : <Sparkles size={28} />}
      </button>

      <style jsx>{`
        @keyframes chat-appear {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dot-blink {
          animation: dot-blink 1.4s infinite both;
        }
        @keyframes dot-blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
