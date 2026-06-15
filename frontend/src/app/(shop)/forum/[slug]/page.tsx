"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Lock, MessageSquare, Reply, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import VerifiedPawBadge from "@/components/forum/VerifiedPawBadge";
import MentionTextarea from "@/components/forum/MentionTextarea";
import { ProductMarkdownRenderer } from "@/components/forum/ProductEmbedRenderer";
import ProductVariantDrawer from "@/components/ProductVariantDrawer";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { ForumReply, ForumThread, Product } from "@/lib/types";

type ForumThreadDetail = ForumThread & { body: string; replies: ForumReply[] };
type ReplyNode = ForumReply & { children: ReplyNode[] };

function AuthorLine({ author, createdAt }: { author: ForumThread["author"]; createdAt: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-500">
      <span className="font-bold text-neutral-700">{author.full_name}</span>
      {author.is_expert_verified && <VerifiedPawBadge compact />}
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

function buildReplyTree(replies: ForumReply[]): ReplyNode[] {
  const byId = new Map<string, ReplyNode>();
  replies.forEach((reply) => byId.set(reply.id, { ...reply, children: [] }));

  const roots: ReplyNode[] = [];
  replies.forEach((reply) => {
    const node = byId.get(reply.id);
    if (!node) return;
    const parent = reply.parent_reply_id ? byId.get(reply.parent_reply_id) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function ReplyCard({
  reply,
  depth,
  canAccept,
  canVote,
  votePending,
  acceptPending,
  onVote,
  onAccept,
  onReply,
  onOpenDrawer,
}: {
  reply: ReplyNode;
  depth: number;
  canAccept: boolean;
  canVote: boolean;
  votePending: boolean;
  acceptPending: boolean;
  onVote: (replyId: string, value: number) => void;
  onAccept: (replyId: string) => void;
  onReply: (reply: ForumReply) => void;
  onOpenDrawer: (product: Product) => void;
}) {
  return (
    <div className={depth > 0 ? "ml-3 border-l border-neutral-100 pl-3 md:ml-6 md:pl-5" : ""}>
      <article className={`rounded-[16px] border bg-white p-4 md:p-5 shadow-xs ${reply.is_accepted ? "border-green-200" : "border-neutral-100"}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <AuthorLine author={reply.author} createdAt={reply.created_at} />
          <div className="flex flex-wrap items-center gap-2">
            {reply.is_accepted && <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-bold text-green-700"><CheckCircle2 size={12} /> Đáp án</span>}
            {reply.expert_upvote_count > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">{reply.expert_upvote_count} expert xác nhận</span>}
          </div>
        </div>
        <div className="prose prose-sm max-w-none text-neutral-700">
          <ProductMarkdownRenderer content={reply.body} onOpenDrawer={onOpenDrawer} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <VoteButtons disabled={!canVote || votePending} up={reply.upvote_count} down={reply.downvote_count} onVote={(value) => onVote(reply.id, value)} />
            <Button size="sm" variant="outline" onClick={() => onReply(reply)}>
              <Reply size={14} /> Phản hồi
            </Button>
          </div>
          {canAccept && !reply.is_accepted && (
            <Button size="sm" variant="outline" onClick={() => onAccept(reply.id)} disabled={acceptPending}>
              <CheckCircle2 size={14} /> Chọn đáp án
            </Button>
          )}
        </div>
      </article>
      {reply.children.length > 0 && (
        <div className="mt-3 grid gap-3">
          {reply.children.map((child) => (
            <ReplyCard
              key={child.id}
              reply={child}
              depth={depth + 1}
              canAccept={canAccept}
              canVote={canVote}
              votePending={votePending}
              acceptPending={acceptPending}
              onVote={onVote}
              onAccept={onAccept}
              onReply={onReply}
              onOpenDrawer={onOpenDrawer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ForumThreadPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [replyBody, setReplyBody] = useState("");
  const [replyTarget, setReplyTarget] = useState<ForumReply | null>(null);
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpenDrawer = (prod: Product) => {
    setDrawerProduct(prod);
    setIsDrawerOpen(true);
  };

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
    mutationFn: () => api.post(`/forum/threads/${data?.id}/replies`, {
      body: replyBody,
      parent_reply_id: replyTarget?.id ?? null,
    }),
    onSuccess: () => {
      setReplyBody("");
      setReplyTarget(null);
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
  const replyTree = buildReplyTree(data.replies);
  const startReplyTo = (reply: ForumReply) => {
    setReplyTarget(reply);
    document.getElementById("forum-reply-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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
          <ProductMarkdownRenderer content={data.body} onOpenDrawer={handleOpenDrawer} />
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
          {replyTree.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              depth={0}
              canAccept={canAccept}
              canVote={!!user}
              votePending={replyVote.isPending}
              acceptPending={acceptReply.isPending}
              onVote={(replyId, value) => replyVote.mutate({ replyId, value })}
              onAccept={(replyId) => acceptReply.mutate(replyId)}
              onReply={startReplyTo}
              onOpenDrawer={handleOpenDrawer}
            />
          ))}
        </div>
      </section>

      <section id="forum-reply-form" className="mt-8 rounded-[16px] border border-neutral-100 bg-white p-4 md:p-5 shadow-sm">
        <h2 className="m-0 mb-3 text-lg font-extrabold">{replyTarget ? "Phản hồi bình luận" : "Trả lời chủ đề"}</h2>
        {data.is_locked ? (
          <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Chủ đề đã bị khoá trả lời.</div>
        ) : user ? (
          <div className="grid gap-3">
            {replyTarget && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                <span className="min-w-0 truncate">Đang phản hồi {replyTarget.author.full_name}</span>
                <button type="button" onClick={() => setReplyTarget(null)} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-blue-700">
                  <X size={14} />
                </button>
              </div>
            )}
            <MentionTextarea value={replyBody} onChange={setReplyBody} rows={7} placeholder={replyTarget ? "Viết phản hồi của bạn... Gõ @ để nhúng sản phẩm" : "Chia sẻ kinh nghiệm hoặc lời khuyên của bạn... Gõ @ để nhúng sản phẩm"} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-100" disabled={createReply.isPending} />
            <div className="flex justify-end">
              <Button disabled={createReply.isPending || replyBody.length < 10} onClick={() => createReply.mutate()}>
                {createReply.isPending ? "Đang gửi..." : replyTarget ? "Gửi phản hồi" : "Gửi trả lời"}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => router.push("/login")}>Đăng nhập để trả lời</Button>
        )}
      </section>

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
