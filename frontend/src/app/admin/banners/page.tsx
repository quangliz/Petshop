"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Banner } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, X, ImageIcon } from "lucide-react";
import NextImage from "next/image";

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; banner?: Banner }>({ open: false });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    link_url: "",
    sort_order: 0,
    is_active: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const res = await api.get("/admin/banners");
      return res.data?.items as Banner[] ?? [];
    },
  });

  const openCreate = () => {
    setForm({ title: "", subtitle: "", link_url: "", sort_order: 0, is_active: true });
    setImageFile(null);
    setModal({ open: true });
  };

  const openEdit = (b: Banner) => {
    setForm({
      title: b.title ?? "",
      subtitle: b.subtitle ?? "",
      link_url: b.link_url ?? "",
      sort_order: b.sort_order ?? 0,
      is_active: b.is_active ?? true,
    });
    setImageFile(null);
    setModal({ open: true, banner: b });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (modal.banner) {
        await api.put(`/admin/banners/${modal.banner.id}`, payload);
        if (imageFile) {
          const fd = new FormData();
          fd.append("file", imageFile);
          await api.post(`/admin/banners/${modal.banner.id}/image`, fd);
        }
      } else {
        const res = await api.post("/admin/banners", payload);
        const bannerId = res.data.id;
        if (imageFile) {
          const fd = new FormData();
          fd.append("file", imageFile);
          await api.post(`/admin/banners/${bannerId}/image`, fd);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      setModal({ open: false });
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "Lỗi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/banners/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-banners"] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "Lỗi"),
  });

  const banners = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Banner</h2>
        <Button onClick={openCreate}>
          <PlusCircle className="w-4 h-4 mr-1" /> Thêm banner
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Ảnh</th>
              <th className="text-left px-4 py-3">Tiêu đề</th>
              <th className="text-left px-4 py-3">Link</th>
              <th className="text-center px-4 py-3">Thứ tự</th>
              <th className="text-center px-4 py-3">Hiển thị</th>
              <th className="text-center px-4 py-3 w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && banners.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Chưa có banner nào
                </td>
              </tr>
            )}
            {banners.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  {b.image_url ? (
                    <NextImage
                      src={b.image_url}
                      alt={b.title ?? ""}
                      width={120}
                      height={50}
                      className="rounded object-cover"
                      style={{ height: 50 }}
                    />
                  ) : (
                    <div className="w-[120px] h-[50px] bg-gray-100 rounded flex items-center justify-center text-gray-300">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{b.title || "—"}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                  {b.link_url || "—"}
                </td>
                <td className="px-4 py-3 text-center">{b.sort_order}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {b.is_active ? "Có" : "Ẩn"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Xóa banner này?")) deleteMutation.mutate(b.id);
                      }}
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">
                {modal.banner ? "Chỉnh sửa banner" : "Thêm banner mới"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setModal({ open: false })}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Ảnh banner</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                {modal.banner?.image_url && !imageFile && (
                  <NextImage
                    src={modal.banner.image_url}
                    alt="preview"
                    width={300}
                    height={120}
                    className="mt-2 rounded object-cover"
                    style={{ height: 120 }}
                  />
                )}
              </div>
              <div>
                <Label>Tiêu đề</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Khuyến mãi mùa hè"
                />
              </div>
              <div>
                <Label>Phụ đề</Label>
                <Input
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="Mô tả ngắn cho banner"
                />
              </div>
              <div>
                <Label>Link (tuỳ chọn)</Label>
                <Input
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="/products hoặc /profile"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Thứ tự</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Hiển thị</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal({ open: false })}>
                Huỷ
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
