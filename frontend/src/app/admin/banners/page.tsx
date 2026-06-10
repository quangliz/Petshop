"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Banner, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, X, ImageIcon, Search } from "lucide-react";
import Image from "next/image";
import { AdminTableRowsSkeleton } from "@/components/skeletons/AdminSkeletons";

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; banner?: Banner }>({ open: false });
  const [desktopImageFile, setDesktopImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    link_url: "",
    sort_order: 0,
    is_active: true,
  });

  const [productSearch, setProductSearch] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [linkType, setLinkType] = useState<"product" | "custom">("product");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const res = await api.get("/admin/banners");
      return res.data?.items as Banner[] ?? [];
    },
  });

  const handleSearchProducts = async (q: string) => {
    if (!q.trim()) {
      setProductSearchResults([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const res = await api.get("/products/", { params: { q, size: 10 } });
      setProductSearchResults(res.data?.items ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingProducts(false);
    }
  };

  useEffect(() => {
    if (linkType !== "product" || !modal.open) return;
    const delayDebounceFn = setTimeout(() => {
      handleSearchProducts(productSearch);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [productSearch, linkType, modal.open]);

  const selectProduct = (slug: string) => {
    setForm((prev) => ({ ...prev, link_url: `/products/${slug}` }));
    setProductSearchResults([]);
    setProductSearch("");
  };

  const openCreate = () => {
    setForm({ title: "", subtitle: "", link_url: "", sort_order: 0, is_active: true });
    setDesktopImageFile(null);
    setMobileImageFile(null);
    setLinkType("product");
    setProductSearch("");
    setProductSearchResults([]);
    setModal({ open: true });
  };

  const openEdit = (b: Banner) => {
    const isProd = b.link_url?.startsWith("/products/") ?? false;
    setForm({
      title: "",
      subtitle: "",
      link_url: b.link_url ?? "",
      sort_order: b.sort_order ?? 0,
      is_active: b.is_active ?? true,
    });
    setDesktopImageFile(null);
    setMobileImageFile(null);
    setLinkType(isProd ? "product" : "custom");
    setProductSearch("");
    setProductSearchResults([]);
    setModal({ open: true, banner: b });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      const uploadImage = async (bannerId: number, file: File, kind: "desktop" | "mobile") => {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/admin/banners/${bannerId}/image?kind=${kind}`, fd);
      };
      if (modal.banner) {
        await api.put(`/admin/banners/${modal.banner.id}`, payload);
        if (desktopImageFile) await uploadImage(modal.banner.id, desktopImageFile, "desktop");
        if (mobileImageFile) await uploadImage(modal.banner.id, mobileImageFile, "mobile");
      } else {
        const res = await api.post("/admin/banners", payload);
        const bannerId = res.data.id;
        if (desktopImageFile) await uploadImage(bannerId, desktopImageFile, "desktop");
        if (mobileImageFile) await uploadImage(bannerId, mobileImageFile, "mobile");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      setModal({ open: false });
    },
    onError: (e: unknown) => alert((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Lỗi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/banners/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-banners"] }),
    onError: (e: unknown) => alert((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Lỗi"),
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
              <th className="text-left px-4 py-3">Link liên kết</th>
              <th className="text-center px-4 py-3">Thứ tự</th>
              <th className="text-center px-4 py-3">Hiển thị</th>
              <th className="text-center px-4 py-3 w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <AdminTableRowsSkeleton columns={5} rows={4} imageColumn />}
            {!isLoading && banners.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">
                  Chưa có banner nào
                </td>
              </tr>
            )}
            {banners.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  {(b.desktop_image_url || b.mobile_image_url || b.image_url) ? (
                    <div className="flex gap-2">
                      <div className="relative w-[96px] h-[25px] rounded overflow-hidden bg-gray-100">
                        <Image
                          src={b.desktop_image_url || b.mobile_image_url || b.image_url}
                          alt="banner desktop"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="relative w-[44px] h-[33px] rounded overflow-hidden bg-gray-100">
                        <Image
                          src={b.mobile_image_url || b.desktop_image_url || b.image_url}
                          alt="banner mobile"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-[120px] h-[50px] bg-gray-100 rounded flex items-center justify-center text-gray-300">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[250px] truncate">
                  {b.link_url || "—"}
                </td>
                <td className="px-4 py-3 text-center">{b.sort_order}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active
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
                <Label>Ảnh desktop 19:5</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDesktopImageFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-gray-500">Dùng cho tablet/desktop. Nếu thiếu, hệ thống dùng ảnh 4:3.</p>
                {modal.banner?.desktop_image_url && !desktopImageFile && (
                  <div className="relative w-full aspect-[19/5] mt-2 rounded overflow-hidden bg-gray-100">
                    <Image
                      src={modal.banner.desktop_image_url}
                      alt="preview desktop"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Ảnh mobile 4:3</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setMobileImageFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-gray-500">Dùng cho màn hình nhỏ. Nếu thiếu, hệ thống dùng ảnh 19:5.</p>
                {modal.banner?.mobile_image_url && !mobileImageFile && (
                  <div className="relative w-full max-w-[240px] aspect-[4/3] mt-2 rounded overflow-hidden bg-gray-100">
                    <Image
                      src={modal.banner.mobile_image_url}
                      alt="preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Loại liên kết</Label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="linkType"
                      checked={linkType === "product"}
                      onChange={() => {
                        setLinkType("product");
                        setForm(prev => ({ ...prev, link_url: "" }));
                      }}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium">Sản phẩm</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="linkType"
                      checked={linkType === "custom"}
                      onChange={() => {
                        setLinkType("custom");
                        setForm(prev => ({ ...prev, link_url: "" }));
                      }}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium">Tự chọn</span>
                  </label>
                </div>
              </div>

              {linkType === "product" ? (
                <div className="space-y-2 relative">
                  <Label>Tìm kiếm sản phẩm</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Nhập tên sản phẩm để tìm..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-2.5 text-gray-400">
                      {searchingProducts ? (
                        <span className="text-xs">Đang tìm...</span>
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {productSearchResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y">
                      {productSearchResults.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => selectProduct(prod.slug)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                        >
                          {prod.thumbnail_url ? (
                            <Image
                              src={prod.thumbnail_url}
                              alt={prod.name}
                              width={40}
                              height={40}
                              className="object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{prod.name}</p>
                            <p className="text-xs text-gray-500">
                              {prod.price.toLocaleString("vi-VN")}đ
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {form.link_url && (
                    <div className="p-3 bg-orange-50 text-orange-800 rounded-xl flex items-center justify-between border border-orange-100 mt-2">
                      <div className="text-xs font-medium truncate pr-4">
                        Đang liên kết: <code className="bg-white px-1.5 py-0.5 rounded border ml-1 font-mono text-orange-600">{form.link_url}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, link_url: "" }))}
                        className="text-xs font-bold text-orange-600 hover:text-orange-800 underline shrink-0"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Label>Link tự chọn</Label>
                  <Input
                    value={form.link_url}
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    placeholder="/products hoặc /profile"
                  />
                </div>
              )}
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
