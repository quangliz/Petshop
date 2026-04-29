"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Trash2, Search, Database } from "lucide-react";

type EmbeddingItem = {
  id: string;
  preview: string;
  metadata: Record<string, unknown>;
};

type ListResp = {
  collection: string;
  collection_name: string;
  total: number;
  items: EmbeddingItem[];
};

const COLLECTIONS = [
  { key: "products", label: "Sản phẩm", description: "Vector index cho product search" },
  { key: "knowledge", label: "Tri thức", description: "Chunk từ kho tri thức (RAG)" },
] as const;

function CollectionPanel({ collection, label }: { collection: string; label: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-embeddings", collection, search],
    queryFn: async () => {
      const res = await api.get(`/admin/embeddings/${collection}`, {
        params: { search, limit: 50 },
      });
      return res.data as ListResp;
    },
  });

  const reindexMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/admin/embeddings/${collection}/reindex`);
      return res.data as { indexed: number };
    },
    onSuccess: (d) => {
      alert(`Đã reindex ${d.indexed} mục cho ${label}`);
      qc.invalidateQueries({ queryKey: ["admin-embeddings", collection] });
    },
    onError: (e: unknown) => alert((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Lỗi reindex"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/embeddings/${collection}/${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-embeddings", collection] }),
    onError: (e: unknown) => alert((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Lỗi"),
  });

  const items = data?.items ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-orange-500" />
          <div>
            <h3 className="font-semibold text-gray-800">{label}</h3>
            <p className="text-xs text-gray-500">
              Tổng số vector: <strong>{data?.total ?? "—"}</strong>
              {data?.collection_name && <span className="ml-2 text-gray-400">({data.collection_name})</span>}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            if (confirm(`Reindex toàn bộ ${label.toLowerCase()}? Sẽ gọi OpenAI embedding API.`)) {
              reindexMutation.mutate();
            }
          }}
          disabled={reindexMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${reindexMutation.isPending ? "animate-spin" : ""}`} />
          {reindexMutation.isPending ? "Đang reindex..." : "Reindex"}
        </Button>
      </div>

      <div className="p-4 border-b flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm trong nội dung..."
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="divide-y max-h-[500px] overflow-y-auto">
        {isLoading && <div className="p-6 text-center text-gray-400">Đang tải...</div>}
        {!isLoading && items.length === 0 && (
          <div className="p-6 text-center text-gray-400">Chưa có dữ liệu — bấm Reindex.</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="p-4 hover:bg-gray-50 group">
            <div className="flex items-start justify-between gap-2 mb-2">
              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 break-all">
                {item.id}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                onClick={() => {
                  if (confirm("Xoá vector này?")) deleteMutation.mutate(item.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-sm text-gray-700 line-clamp-3 mb-2">{item.preview}</p>
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(item.metadata).slice(0, 6).map(([k, v]) => (
                  <span key={k} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                    <span className="text-gray-500">{k}:</span>{" "}
                    <span className="text-gray-800">
                      {Array.isArray(v) ? v.join(",") : String(v).slice(0, 40)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminEmbeddingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Embeddings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý các collection vector. Reindex sau khi thêm/sửa sản phẩm hoặc tài liệu.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {COLLECTIONS.map((c) => (
          <CollectionPanel key={c.key} collection={c.key} label={c.label} />
        ))}
      </div>
    </div>
  );
}
