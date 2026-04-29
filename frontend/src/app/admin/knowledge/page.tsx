"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, X, Search } from "lucide-react";

type KnowledgeDoc = {
  id: string;
  title: string;
  category: string;
  source_url: string | null;
  content?: string;
  content_length: number;
  created_at: string | null;
};

const CATEGORIES = ["nutrition", "health", "training", "grooming", "breed"] as const;

export default function AdminKnowledgePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [modal, setModal] = useState<{ open: boolean; doc?: KnowledgeDoc }>({ open: false });
  const [form, setForm] = useState({
    title: "",
    category: "nutrition",
    source_url: "",
    content: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-knowledge", search, category],
    queryFn: async () => {
      const res = await api.get("/admin/knowledge", {
        params: { search, category: category || undefined, limit: 100 },
      });
      return res.data as { total: number; items: KnowledgeDoc[] };
    },
  });

  const openCreate = () => {
    setForm({ title: "", category: "nutrition", source_url: "", content: "" });
    setModal({ open: true });
  };

  const openEdit = async (d: KnowledgeDoc) => {
    const res = await api.get(`/admin/knowledge/${d.id}`);
    const full = res.data as KnowledgeDoc;
    setForm({
      title: full.title,
      category: full.category,
      source_url: full.source_url ?? "",
      content: full.content ?? "",
    });
    setModal({ open: true, doc: full });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        category: form.category,
        source_url: form.source_url || null,
        content: form.content,
      };
      if (modal.doc) {
        await api.put(`/admin/knowledge/${modal.doc.id}`, payload);
      } else {
        await api.post("/admin/knowledge", payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-knowledge"] });
      setModal({ open: false });
    },
    onError: (e: unknown) => alert((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Lỗi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/knowledge/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-knowledge"] }),
    onError: (e: unknown) => alert((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Lỗi"),
  });

  const items = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Kho tri thức</h2>
          <p className="text-sm text-gray-500 mt-1">
            Tài liệu nguồn cho chatbot AI. Sau khi sửa, hãy reindex tại trang
            Embeddings.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="w-4 h-4 mr-1" /> Thêm tài liệu
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề..."
            className="pl-8"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="">Tất cả phân loại</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Tiêu đề</th>
              <th className="text-left px-4 py-3">Phân loại</th>
              <th className="text-right px-4 py-3">Độ dài</th>
              <th className="text-left px-4 py-3">Nguồn</th>
              <th className="text-center px-4 py-3 w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Không có tài liệu</td></tr>
            )}
            {items.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium max-w-md truncate">{d.title}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                    {d.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{d.content_length.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[240px] truncate">
                  {d.source_url ? (
                    <a href={d.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {d.source_url}
                    </a>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => { if (confirm(`Xóa "${d.title}"?`)) deleteMutation.mutate(d.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">
                {modal.doc ? "Chỉnh sửa tài liệu" : "Thêm tài liệu mới"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setModal({ open: false })}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Tiêu đề</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phân loại</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Nguồn (URL)</Label>
                  <Input
                    value={form.source_url}
                    onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <Label>Nội dung</Label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={16}
                  className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                  placeholder="Phân đoạn bằng dòng trống (\\n\\n)..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sẽ chia thành chunk khi reindex. Cách nhau bằng dòng trống để chunker hoạt động tốt.
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal({ open: false })}>Huỷ</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title || !form.content}>
                {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
