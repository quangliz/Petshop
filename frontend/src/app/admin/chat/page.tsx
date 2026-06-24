"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Send,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

interface ChatSessionMeta {
  id: string;
  title: string;
  routing_status: "ai" | "pending_human" | "human";
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  is_from_human?: boolean;
}

export default function AdminChatSupportPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "chatting">("all");
  const [messageInput, setMessageInput] = useState("");
  const [activeSessionDetails, setActiveSessionDetails] = useState<{
    id: string;
    title: string;
    routing_status: "ai" | "pending_human" | "human";
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch pending and active support sessions
  const {
    data: pendingSessions,
    isLoading: loadingSessions,
    isFetching: fetchingSessions,
    refetch: refetchSessions,
  } = useQuery<ChatSessionMeta[]>({
    queryKey: ["admin-pending-sessions"],
    queryFn: async () => (await api.get("/chat/admin/sessions/pending")).data,
    refetchInterval: 5000, // auto-refresh list every 5 seconds
  });

  // Filtered sessions list
  const filteredSessions = pendingSessions?.filter((s) => {
    if (filter === "pending") return s.routing_status === "pending_human";
    if (filter === "chatting") return s.routing_status === "human";
    return true;
  }) || [];

  // 2. Fetch messages for the selected session
  const {
    data: sessionData,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = useQuery<{
    session: { id: string; title: string; routing_status: "ai" | "pending_human" | "human" };
    messages: ChatMessage[];
  }>({
    queryKey: ["admin-session-messages", selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return { session: { id: "", title: "", routing_status: "ai" }, messages: [] };
      return (await api.get(`/chat/sessions/${selectedSessionId}/messages`)).data;
    },
    enabled: !!selectedSessionId,
  });

  // Track session details dynamically
  useEffect(() => {
    if (sessionData?.session) {
      setActiveSessionDetails(sessionData.session);
    }
  }, [sessionData]);

  // Set up polling for messages when a session is active
  useEffect(() => {
    if (selectedSessionId) {
      pollingIntervalRef.current = setInterval(() => {
        refetchMessages();
      }, 2500); // Poll messages every 2.5 seconds
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedSessionId, refetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionData?.messages]);

  // 3. Claim session mutation
  const claimSessionMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/chat/admin/sessions/${id}/claim`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-sessions"] });
      refetchMessages();
    },
  });

  // 4. Close session (hand back to AI) mutation
  const closeSessionMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/chat/admin/sessions/${id}/close`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-sessions"] });
      refetchMessages();
    },
  });

  // 5. Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) =>
      (await api.post(`/chat/admin/sessions/${id}/messages`, { message })).data,
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !messageInput.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({ id: selectedSessionId, message: messageInput });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="flex flex-1 min-h-0">
        
        {/* LEFT COLUMN: Sessions List */}
        <aside className="w-80 md:w-96 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-orange-500" />
                Khách hàng cần hỗ trợ
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {pendingSessions?.length || 0} phiên yêu cầu người thật
              </p>
            </div>
            <button
              onClick={() => refetchSessions()}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingSessions ? "animate-spin text-orange-500" : ""}`} />
            </button>
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex gap-1.5">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-1 px-2 text-xs font-semibold rounded-md transition-all ${
                filter === "all" ? "bg-white text-gray-800 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Tất cả ({pendingSessions?.length || 0})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`flex-1 py-1 px-2 text-xs font-semibold rounded-md transition-all ${
                filter === "pending"
                  ? "bg-red-50 text-red-700 shadow-sm border border-red-100"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Chờ tiếp nhận ({pendingSessions?.filter((s) => s.routing_status === "pending_human").length || 0})
            </button>
            <button
              onClick={() => setFilter("chatting")}
              className={`flex-1 py-1 px-2 text-xs font-semibold rounded-md transition-all ${
                filter === "chatting"
                  ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Đang chat ({pendingSessions?.filter((s) => s.routing_status === "human").length || 0})
            </button>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingSessions ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                <span className="text-sm">Đang tải cuộc trò chuyện...</span>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">Không có cuộc trò chuyện nào phù hợp.</p>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isActive = selectedSessionId === session.id;
                const isPending = session.routing_status === "pending_human";
                const createdTime = new Date(session.created_at).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-4 transition-all flex flex-col gap-1.5 ${
                      isActive ? "bg-orange-50/70 border-l-4 border-orange-500" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-gray-400">{createdTime}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPending ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isPending ? "Chờ hỗ trợ" : "Đang chat"}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm line-clamp-1">
                      {session.title || "Yêu cầu hỗ trợ"}
                    </span>
                    <span className="text-xs text-gray-400 truncate">ID: {session.id.slice(0, 8)}...</span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Active Chat Panel */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-100">
          {selectedSessionId ? (
            <div className="flex flex-col h-full">
              {/* Active Chat Header */}
              <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h4 className="font-bold text-gray-800 text-base line-clamp-1">
                    {activeSessionDetails?.title || "Phiên hỗ trợ"}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">ID: {selectedSessionId}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span
                      className={`text-xs font-semibold ${
                        activeSessionDetails?.routing_status === "pending_human"
                          ? "text-red-500"
                          : activeSessionDetails?.routing_status === "human"
                          ? "text-emerald-500"
                          : "text-gray-500"
                      }`}
                    >
                      {activeSessionDetails?.routing_status === "pending_human"
                        ? "Chờ tiếp nhận"
                        : activeSessionDetails?.routing_status === "human"
                        ? "Đang trực tiếp hỗ trợ"
                        : "AI đang trả lời"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {activeSessionDetails?.routing_status === "pending_human" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 font-semibold"
                      onClick={() => claimSessionMutation.mutate(selectedSessionId)}
                      disabled={claimSessionMutation.isPending}
                    >
                      {claimSessionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Tiếp nhận hỗ trợ
                    </Button>
                  )}
                  {activeSessionDetails?.routing_status === "human" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex items-center gap-1.5 font-semibold"
                      onClick={() => closeSessionMutation.mutate(selectedSessionId)}
                      disabled={closeSessionMutation.isPending}
                    >
                      {closeSessionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Chuyển lại cho AI
                    </Button>
                  )}
                </div>
              </header>

              {/* Chat Message Window */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  </div>
                ) : (
                  sessionData?.messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    const isSystem = msg.role === "system";

                    if (isSystem) {
                      return (
                        <div key={idx} className="flex justify-center my-2">
                          <span className="bg-gray-200/80 text-gray-600 text-xs px-3 py-1 rounded-full italic max-w-lg text-center shadow-sm">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                        <div className="max-w-[70%] flex flex-col gap-1">
                          {/* Sender details badge */}
                          <div className={`flex items-center gap-1 text-[10px] text-gray-400 ${isUser ? "justify-start pl-1" : "justify-end pr-1"}`}>
                            {isUser ? (
                              <>
                                <User className="w-3 h-3" />
                                <span>Khách hàng</span>
                              </>
                            ) : msg.is_from_human ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 font-semibold">Hỗ trợ viên (Bạn)</span>
                              </>
                            ) : (
                              <>
                                <Bot className="w-3 h-3 text-indigo-500" />
                                <span className="text-indigo-600 font-semibold">Catbot (AI)</span>
                              </>
                            )}
                          </div>

                          {/* Chat bubble */}
                          <div
                            className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                              isUser
                                ? "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                                : msg.is_from_human
                                ? "bg-emerald-600 text-white rounded-tr-none"
                                : "bg-indigo-600 text-white rounded-tr-none"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <footer className="bg-white border-t border-gray-200 p-4 shrink-0">
                {activeSessionDetails?.routing_status !== "human" ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      Bạn cần tiếp nhận (Claim) cuộc trò chuyện này để chat trực tiếp.
                    </span>
                    {activeSessionDetails?.routing_status === "pending_human" && (
                      <Button
                        size="xs"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-1 px-3 shadow"
                        onClick={() => claimSessionMutation.mutate(selectedSessionId)}
                        disabled={claimSessionMutation.isPending}
                      >
                        Tiếp nhận ngay
                      </Button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Nhập nội dung tin nhắn gửi khách hàng..."
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      type="submit"
                      className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-4 py-2 flex items-center gap-1 font-semibold"
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Gửi
                    </Button>
                  </form>
                )}
              </footer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mb-4 shadow-sm border border-orange-50 shadow-orange-100/50">
                <MessageCircle className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-gray-800 text-lg">Chưa chọn cuộc hội thoại</h4>
              <p className="text-gray-400 text-sm max-w-sm mt-1 leading-relaxed">
                Vui lòng chọn một phiên hội thoại từ danh sách bên trái để theo dõi tin nhắn và bắt đầu trực tiếp hỗ trợ khách hàng.
              </p>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
