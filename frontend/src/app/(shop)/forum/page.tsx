"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, MessageSquare, Plus, Search, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import VerifiedPawBadge from "@/components/forum/VerifiedPawBadge";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { ForumThread } from "@/lib/types";

type ForumCategory = { value: string; label: string };
type ForumPageData = { items: ForumThread[]; total: number; page: number; size: number; pages: number };

const SORTS = [
  { value: "latest", label: "Mới nhất" },
  { value: "popular", label: "Nổi bật" },
  { value: "answered", label: "Đã có đáp án" },
  { value: "unanswered", label: "Chưa có đáp án" },
] as const;

function ThreadRow({ thread }: { thread: ForumThread }) {
  return (
    <Link href={`/forum/${thread.slug}`} className="block no-underline text-inherit">
      <article className="bg-white border border-neutral-100 rounded-[16px] p-4 md:p-5 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
              {thread.category_label}
            </span>
            {thread.accepted_reply_id && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-[11px] font-bold text-green-700">
                <CheckCircle2 size={12} /> Đã giải đáp
              </span>
            )}
          </div>
          <div>
            <h2 className="m-0 text-[17px] md:text-[20px] font-extrabold leading-snug text-neutral-900 line-clamp-2">
              {thread.title}
            </h2>
            <p className="mt-2 mb-0 text-[13px] leading-relaxed text-neutral-500 line-clamp-2">
              {thread.body_preview}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-neutral-500">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-semibold text-neutral-700">{thread.author.full_name}</span>
              {thread.author.is_expert_verified && <VerifiedPawBadge compact />}
              {thread.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-neutral-50 px-2 py-0.5 text-neutral-500">#{tag}</span>
              ))}
            </div>
            <div className="flex items-center gap-3 font-semibold">
              <span className="inline-flex items-center gap-1"><ThumbsUp size={13} /> {thread.upvote_count}</span>
              <span className="inline-flex items-center gap-1"><MessageSquare size={13} /> {thread.reply_count}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function ForumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "latest");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", category: "health", body: "", tags: "" });

  const { data: categories } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => (await api.get("/forum/categories")).data as ForumCategory[],
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["forum-threads", q, category, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), size: "10", sort });
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      return (await api.get(`/forum/threads?${params.toString()}`)).data as ForumPageData;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        category: form.category,
        body: form.body,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      };
      return (await api.post("/forum/threads", payload)).data as ForumThread;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["forum-threads"] });
      toast.success("Đã đăng câu hỏi");
      router.push(`/forum/${thread.slug}`);
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail || "Không thể đăng bài"),
  });

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (sort !== "latest") params.set("sort", sort);
    router.replace(`/forum${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="w-full max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 text-[13px] text-neutral-500 mb-6">
        <Link href="/" className="text-inherit no-underline hover:text-neutral-900">Trang chủ</Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Forum</span>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h1 className="m-0 text-2xl md:text-[32px] font-extrabold tracking-[-0.025em]">Forum ThePawsome</h1>
          <p className="mt-1 mb-0 text-[14px] text-neutral-500">Hỏi đáp sức khoẻ, sản phẩm, hướng dẫn chăm sóc và sự kiện cho pet</p>
        </div>
        <Button onClick={() => user ? setShowCreate((open) => !open) : router.push("/login")}>
          <Plus size={16} /> Đặt câu hỏi
        </Button>
      </div>

      {showCreate && (
        <section className="mb-6 rounded-[16px] border border-neutral-100 bg-white p-4 md:p-5 shadow-sm">
          <div className="grid gap-3">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tiêu đề câu hỏi" className="h-10" />
            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
                {(categories || []).map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tag, cách nhau bằng dấu phẩy" className="h-10" />
            </div>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} placeholder="Mô tả chi tiết vấn đề hoặc kinh nghiệm của bạn" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-100" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Huỷ</Button>
              <Button disabled={createMutation.isPending || form.title.length < 5 || form.body.length < 20} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? "Đang đăng..." : "Đăng bài"}
              </Button>
            </div>
          </div>
        </section>
      )}

      <form onSubmit={applySearch} className="mb-6 grid gap-3 rounded-[16px] border border-neutral-100 bg-white p-3 shadow-sm md:grid-cols-[1fr_180px_170px_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm chủ đề..." className="h-10 pl-9" />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
          <option value="">Tất cả chủ đề</option>
          {(categories || []).map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm">
          {SORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <Button type="submit" className="h-10">Tìm</Button>
      </form>

      {isLoading && <div className="py-12 text-center text-neutral-400">Đang tải forum...</div>}
      {error && <div className="py-12 text-center text-red-500">Không thể tải forum</div>}
      {!isLoading && !error && data?.items.length === 0 && (
        <EmptyState icon={<MessageSquare size={32} />} title="Chưa có chủ đề phù hợp" description="Hãy thử bộ lọc khác hoặc tạo câu hỏi đầu tiên cho cộng đồng." />
      )}
      <div className="grid gap-4">
        {data?.items.map((thread) => <ThreadRow key={thread.id} thread={thread} />)}
      </div>

      {(data?.pages || 0) > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <span className="flex h-8 items-center px-3 text-sm font-semibold text-neutral-600">{page}/{data?.pages}</span>
          <Button variant="outline" disabled={page >= (data?.pages || 1)} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-neutral-400">Đang tải forum...</div>}>
      <ForumContent />
    </Suspense>
  );
}
