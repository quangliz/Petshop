"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { CheckCircle2, ChevronRight, Lock, MessageSquare, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { ForumReply, ForumThread } from "@/lib/types";

type ForumThreadDetail = ForumThread & { body: string; replies: ForumReply[] };

function AuthorLine({ author, createdAt }: { author: ForumThread["author"]; createdAt: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-500">
      <span className="font-bold text-neutral-700">{author.full_name}</span>
      {author.is_expert && (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700">
          <Sparkles size={12} /> Chuyên gia
        </span>
      )}
      {createdAt && <span>{new Date(createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</span>}
    </div>
  );
}

function VoteButtons({ onVote, up, down, disabled }: { onVote: (value: number) => void; up: number; down: number; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onVote(1)}><ThumbsUp size={14} /> {up}</Button>
      <Button size="sm" variant="outline" disabled={disabled} onClick={() => onVote(-1)}><ThumbsDown size={14} /> {down}</Button>
    </div>
  );
}

export default function ForumThreadPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [replyBody, setReplyBody] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["forum-thread", params.slug],
    queryFn: async () => (await api.get(`/forum/threads/${params.slug}`)).data as ForumThreadDetail,
  });

  const threadVote = useMutation({
    mutationFn: (value: number) => api.post(`/forum/threads/${data?.id}/votes`, { value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-thread", params.slug] }),
    onError: () => user ? toast.error("Không thể vote") : router.push("/login"),
  });

  const replyVote = useMutation({
    mutationFn: ({ replyId, value }: { replyId: string; value: number }) => api.post(`/forum/replies/${replyId}/votes`, { value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-thread", params.slug] }),
    onError: () => user ? toast.error("Không thể vote") : router.push("/login"),
  });

  const createReply = useMutation({
    mutationFn: () => api.post(`/forum/threads/${data?.id}/replies`, { body: replyBody }),
    onSuccess: () => {
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["forum-thread", params.slug] });
      toast.success("Đã gửi câu trả lời");
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => user ? toast.error(e.response?.data?.detail || "Không thể trả lời") : router.push("/login"),
  });

  const acceptReply = useMutation({
    mutationFn: (replyId: string) => api.post(`/forum/replies/${replyId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-thread", params.slug] });
      toast.success("Đã chọn câu trả lời");
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail || "Không thể chọn câu trả lời"),
  });

  if (isLoading) return <div className="py-16 text-center text-neutral-400">Đang tải chủ đề...</div>;
  if (error || !data) return <div className="py-16 text-center text-red-500">Không tìm thấy chủ đề forum</div>;

  const canAccept = !!user && (data.author.id === user.id || ["admin", "support", "content_manager"].includes(user.role));

  return (
    <div className="w-full max-w-[960px] mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-[13px] text-neutral-500 mb-6">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900">Trang chủ</Link>
        <ChevronRight size={14} />
        <Link href="/forum" className="text-inherit no-underline hover:text-neutral-900">Forum</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold line-clamp-1">{data.title}</span>
      </div>

      <article className="rounded-[18px] border border-neutral-100 bg-white p-5 md:p-7 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">{data.category_label}</span>
          {data.accepted_reply_id && <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-bold text-green-700"><CheckCircle2 size={12} /> Đã giải đáp</span>}
          {data.is_locked && <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-600"><Lock size={12} /> Đã khoá</span>}
        </div>
        <h1 className="m-0 text-2xl md:text-[34px] font-extrabold leading-tight tracking-[-0.025em] text-neutral-900">{data.title}</h1>
        <div className="mt-3"><AuthorLine author={data.author} createdAt={data.created_at} /></div>
        <div className="prose prose-sm max-w-none mt-5 text-neutral-700">
          <ReactMarkdown>{data.body}</ReactMarkdown>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag) => <span key={tag} className="rounded-full bg-neutral-50 px-2 py-1 text-[12px] text-neutral-500">#{tag}</span>)}
          </div>
          <VoteButtons disabled={!user || threadVote.isPending} up={data.upvote_count} down={data.downvote_count} onVote={(value) => threadVote.mutate(value)} />
        </div>
      </article>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 flex items-center gap-2 text-xl font-extrabold"><MessageSquare size={20} /> {data.replies.length} câu trả lời</h2>
        </div>
        <div className="grid gap-4">
          {data.replies.map((reply) => (
            <article key={reply.id} className={`rounded-[16px] border bg-white p-4 md:p-5 shadow-xs ${reply.is_accepted ? "border-green-200" : "border-neutral-100"}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <AuthorLine author={reply.author} createdAt={reply.created_at} />
                <div className="flex flex-wrap items-center gap-2">
                  {reply.is_accepted && <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-bold text-green-700"><CheckCircle2 size={12} /> Đáp án</span>}
                  {reply.knowledge_status === "eligible" && <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">AI knowledge</span>}
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-neutral-700">
                <ReactMarkdown>{reply.body}</ReactMarkdown>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <VoteButtons disabled={!user || replyVote.isPending} up={reply.upvote_count} down={reply.downvote_count} onVote={(value) => replyVote.mutate({ replyId: reply.id, value })} />
                {canAccept && !reply.is_accepted && (
                  <Button size="sm" variant="outline" onClick={() => acceptReply.mutate(reply.id)} disabled={acceptReply.isPending}>
                    <CheckCircle2 size={14} /> Chọn đáp án
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[16px] border border-neutral-100 bg-white p-4 md:p-5 shadow-sm">
        <h2 className="m-0 mb-3 text-lg font-extrabold">Trả lời chủ đề</h2>
        {data.is_locked ? (
          <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Chủ đề đã bị khoá trả lời.</div>
        ) : user ? (
          <div className="grid gap-3">
            <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={7} placeholder="Chia sẻ kinh nghiệm hoặc lời khuyên của bạn" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-100" />
            <div className="flex justify-end">
              <Button disabled={createReply.isPending || replyBody.length < 10} onClick={() => createReply.mutate()}>
                {createReply.isPending ? "Đang gửi..." : "Gửi trả lời"}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => router.push("/login")}>Đăng nhập để trả lời</Button>
        )}
      </section>
    </div>
  );
}
