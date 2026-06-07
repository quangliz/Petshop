"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, MessageSquare, ShieldOff, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { ForumReply, ForumThread } from "@/lib/types";

type AdminReply = ForumReply & { thread: { id: string; title: string; slug: string } };

export default function AdminForumPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"threads" | "replies">("threads");

  const { data: threads, isLoading: loadingThreads } = useQuery({
    queryKey: ["admin-forum-threads"],
    queryFn: async () => (await api.get("/admin/forum/threads?limit=100")).data as { total: number; items: ForumThread[] },
  });

  const { data: replies, isLoading: loadingReplies } = useQuery({
    queryKey: ["admin-forum-replies"],
    queryFn: async () => (await api.get("/admin/forum/replies?limit=100")).data as { total: number; items: AdminReply[] },
  });

  const patchThread = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Pick<ForumThread, "status" | "is_locked">> & { is_ai_blocked?: boolean } }) =>
      api.patch(`/admin/forum/threads/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-forum-threads"] });
      queryClient.invalidateQueries({ queryKey: ["admin-forum-replies"] });
    },
  });

  const patchReply = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status?: string; is_ai_blocked?: boolean } }) =>
      api.patch(`/admin/forum/replies/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-forum-replies"] }),
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="m-0 text-2xl font-bold text-gray-800">Forum moderation</h2>
          <p className="mt-1 text-sm text-gray-500">Duyệt hiển thị và kiểm soát nội dung forum đi vào AI knowledge.</p>
        </div>
        <div className="inline-flex rounded-lg border bg-white p-1">
          <button onClick={() => setTab("threads")} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === "threads" ? "bg-orange-600 text-white" : "text-gray-600"}`}>Threads</button>
          <button onClick={() => setTab("replies")} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === "replies" ? "bg-orange-600 text-white" : "text-gray-600"}`}>Replies</button>
        </div>
      </div>

      {tab === "threads" ? (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Chủ đề</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Tương tác</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingThreads && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Đang tải...</td></tr>}
              {threads?.items.map((thread) => (
                <tr key={thread.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/forum/${thread.slug}`} className="font-semibold text-gray-800 hover:underline">{thread.title}</Link>
                    <div className="mt-1 text-xs text-gray-400">{thread.category_label} · {thread.author.full_name}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${thread.status === "published" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {thread.status}
                    </span>
                    {thread.is_locked && <div className="mt-1 text-xs text-gray-400">locked</div>}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{thread.upvote_count} vote · {thread.reply_count} reply</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => patchThread.mutate({ id: thread.id, payload: { status: thread.status === "published" ? "hidden" : "published" } })}>
                        {thread.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => patchThread.mutate({ id: thread.id, payload: { is_locked: !thread.is_locked } })}>
                        {thread.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => patchThread.mutate({ id: thread.id, payload: { is_ai_blocked: true } })}>
                        <ShieldOff size={14} /> AI
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Câu trả lời</th>
                <th className="px-4 py-3 text-center">Knowledge</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingReplies && <tr><td colSpan={4} className="py-10 text-center text-gray-400">Đang tải...</td></tr>}
              {replies?.items.map((reply) => (
                <tr key={reply.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/forum/${reply.thread.slug}`} className="font-semibold text-gray-800 hover:underline">{reply.thread.title}</Link>
                    <div className="mt-1 line-clamp-2 text-xs text-gray-500">{reply.body}</div>
                    <div className="mt-1 text-xs text-gray-400">{reply.author.full_name} · {reply.upvote_count} vote</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${reply.knowledge_status === "eligible" ? "bg-teal-100 text-teal-700" : reply.knowledge_status === "blocked" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                      {reply.knowledge_status}
                    </span>
                    <div className="mt-1 text-xs text-gray-400">score {reply.knowledge_score}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${reply.status === "published" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {reply.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => patchReply.mutate({ id: reply.id, payload: { status: reply.status === "published" ? "hidden" : "published" } })}>
                        {reply.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => patchReply.mutate({ id: reply.id, payload: { is_ai_blocked: true } })}>
                        <ShieldOff size={14} /> AI
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loadingReplies && replies?.items.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-gray-400"><MessageSquare className="mx-auto mb-2" /> Chưa có reply</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
