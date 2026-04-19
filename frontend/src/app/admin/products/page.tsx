"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, X, Upload } from "lucide-react";

type Product = {
  id: string; name: string; slug: string; price: number; sale_price?: number;
  stock_qty: number; brand?: string; description?: string; category_id?: number;
  category_name?: string; is_active: boolean; images?: any;
};

const emptyForm = {
  name: "", slug: "", price: "", sale_price: "", stock_qty: "0",
  brand: "", description: "", category_id: "", is_active: true,
};

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProductId, setUploadProductId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: async () => {
      const res = await api.get(`/admin/products?search=${search}&limit=100`);
      return res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data;
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ open: true });
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, slug: p.slug,
      price: String(p.price), sale_price: p.sale_price ? String(p.sale_price) : "",
      stock_qty: String(p.stock_qty), brand: p.brand ?? "",
      description: p.description ?? "", category_id: p.category_id ? String(p.category_id) : "",
      is_active: p.is_active,
    });
    setModal({ open: true, product: p });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, slug: form.slug,
        price: parseFloat(form.price), sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
        stock_qty: parseInt(form.stock_qty), brand: form.brand || null,
        description: form.description || null,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        is_active: form.is_active,
      };
      if (modal.product) {
        return api.put(`/admin/products/${modal.product.id}`, payload);
      } else {
        return api.post("/admin/products", payload);
      }
    },
    onSuccess: async (res) => {
      const savedId = modal.product?.id ?? res?.data?.id;
      if (imageFile && savedId) {
        const fd = new FormData();
        fd.append("file", imageFile);
        await api.post(`/admin/products/${savedId}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        setImageFile(null);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setModal({ open: false });
    },
    onError: (e: any) => alert(e.response?.data?.detail ?? "Lỗi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (e: any) => alert(e.response?.data?.detail ?? "Lỗi xóa")
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-3 mb-5">
        <Input placeholder="Tìm kiếm sản phẩm..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700 ml-auto">
          <PlusCircle className="w-4 h-4 mr-1" /> Thêm sản phẩm
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Ảnh</th>
              <th className="text-left px-4 py-3">Tên sản phẩm</th>
              <th className="text-left px-4 py-3">Danh mục</th>
              <th className="text-right px-4 py-3">Giá</th>
              <th className="text-right px-4 py-3">Tồn kho</th>
              <th className="text-center px-4 py-3">Kích hoạt</th>
              <th className="text-center px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
            )}
            {data?.items?.map((p: Product) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                    {p.images?.main ? (
                      <img src={p.images.main} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">N/A</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium max-w-[200px] truncate">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.category_name ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div>{p.price.toLocaleString()}đ</div>
                  {p.sale_price && <div className="text-orange-500 text-xs">{p.sale_price.toLocaleString()}đ</div>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={p.stock_qty < 10 ? "text-red-500 font-bold" : ""}>{p.stock_qty}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.is_active ? "Hoạt động" : "Ẩn"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50"
                      onClick={() => { if (confirm("Xóa sản phẩm này?")) deleteMutation.mutate(p.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <div className="px-4 py-3 text-xs text-gray-400 border-t">Tổng: {data.total} sản phẩm</div>}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">{modal.product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setModal({ open: false })}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Tên sản phẩm *</Label>
                <Input value={form.name} onChange={(e) => {
                  const slug = e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
                  setForm({ ...form, name: e.target.value, slug });
                }} />
              </div>
              <div className="col-span-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div>
                <Label>Giá gốc (đ) *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Giá sale (đ)</Label>
                <Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
              </div>
              <div>
                <Label>Tồn kho</Label>
                <Input type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
              </div>
              <div>
                <Label>Thương hiệu</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <Label>Danh mục</Label>
                <select className="w-full border rounded p-2 text-sm bg-white"
                  value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">-- Không có --</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="is_active" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <Label htmlFor="is_active">Kích hoạt bán</Label>
              </div>
              <div className="col-span-2">
                <Label>Mô tả</Label>
                <textarea className="w-full border rounded p-2 text-sm" rows={3}
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Ảnh sản phẩm (upload Cloudinary)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-gray-400 mt-1">Ảnh sẽ được upload lên sau khi lưu sản phẩm.</p>
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModal({ open: false })}>Huỷ</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-orange-600">
                {saveMutation.isPending ? "Đang lưu..." : "Lưu sản phẩm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
