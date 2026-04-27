"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, X, ChevronDown, ChevronUp, Plus } from "lucide-react";

type Variant = {
  id: string; sku: string | null; price: number; sale_price: number | null;
  stock_qty: number; attributes: Record<string, string>; is_active: boolean;
};
type AttrImageRow = { attr_key: string; attr_value: string; url?: string; file?: File | null };
type Product = {
  id: string; name: string; slug: string; price: number; sale_price?: number;
  stock_qty: number; brand?: string; description?: string; category_id?: number;
  category_name?: string; is_active: boolean; images?: Record<string, string>; thumbnail_url?: string;
};
type ProductDetail = Product & { variants: Variant[]; attr_images: { attr_key: string; attr_value: string; url: string }[] };

const emptyForm = {
  name: "", slug: "", price: "", sale_price: "", stock_qty: "0",
  brand: "", description: "", category_id: "", is_active: true,
};

type AttrRow = { key: string; value: string };
type VariantRow = {
  id?: string; sku: string; price: string; sale_price: string;
  stock_qty: string; attrs: AttrRow[]; is_active: boolean;
};

const emptyVariantRow = (): VariantRow => ({
  sku: "", price: "", sale_price: "", stock_qty: "0",
  attrs: [{ key: "", value: "" }], is_active: true,
});

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [variantSectionOpen, setVariantSectionOpen] = useState(false);
  const [attrImages, setAttrImages] = useState<AttrImageRow[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: async () => {
      const res = await api.get(`/admin/products?search=${search}&limit=100`);
      return res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data,
  });

  const openCreate = () => {
    setForm(emptyForm);
    setVariants([]);
    setAttrImages([]);
    setVariantSectionOpen(false);
    setImageFile(null);
    setModal({ open: true });
  };

  const openEdit = async (p: Product) => {
    setForm({
      name: p.name, slug: p.slug,
      price: String(p.price), sale_price: p.sale_price ? String(p.sale_price) : "",
      stock_qty: String(p.stock_qty), brand: p.brand ?? "",
      description: p.description ?? "", category_id: p.category_id ? String(p.category_id) : "",
      is_active: p.is_active,
    });
    setImageFile(null);
    setAttrImages([]);
    setModal({ open: true, product: p });

    try {
      const res = await api.get<ProductDetail>(`/admin/products/${p.id}/detail`);
      const detail = res.data;
      const rows: VariantRow[] = detail.variants.map((v) => ({
        id: v.id,
        sku: v.sku ?? "",
        price: String(v.price),
        sale_price: v.sale_price ? String(v.sale_price) : "",
        stock_qty: String(v.stock_qty),
        attrs: Object.entries(v.attributes || {}).map(([k, val]) => ({ key: k, value: val as string })),
        is_active: v.is_active,
      }));
      setVariants(rows);
      setVariantSectionOpen(rows.length > 0);
      setAttrImages((detail.attr_images ?? []).map((ai) => ({ attr_key: ai.attr_key, attr_value: ai.attr_value, url: ai.url, file: null })));
    } catch {
      setVariants([]);
    }
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

      let savedId: string;
      if (modal.product) {
        await api.put(`/admin/products/${modal.product.id}`, payload);
        savedId = modal.product.id;
      } else {
        const res = await api.post("/admin/products", payload);
        savedId = res.data.id;
      }

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        await api.post(`/admin/products/${savedId}/image`, fd);
      }

      for (const v of variants) {
        const attrs: Record<string, string> = {};
        v.attrs.forEach(({ key, value }) => { if (key.trim()) attrs[key.trim()] = value; });
        const vPayload = {
          sku: v.sku || null,
          price: parseFloat(v.price) || 0,
          sale_price: v.sale_price ? parseFloat(v.sale_price) : null,
          stock_qty: parseInt(v.stock_qty) || 0,
          attributes: attrs,
          is_active: v.is_active,
        };
        if (v.id) {
          await api.put(`/admin/products/${savedId}/variants/${v.id}`, vPayload);
        } else {
          await api.post(`/admin/products/${savedId}/variants`, vPayload);
        }
      }

      for (const ai of attrImages) {
        if (ai.file && ai.attr_key.trim() && ai.attr_value.trim()) {
          const fd = new FormData();
          fd.append("file", ai.file);
          fd.append("attr_key", ai.attr_key.trim());
          fd.append("attr_value", ai.attr_value.trim());
          await api.post(`/admin/products/${savedId}/attr-images`, fd);
        }
      }

      if (!imageFile) {
        await api.post(`/admin/products/${savedId}/sync-thumbnail`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setModal({ open: false });
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => alert(e.response?.data?.detail ?? "Lỗi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (e: { response?: { data?: { detail?: string } } }) => alert(e.response?.data?.detail ?? "Lỗi xóa"),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: ({ productId, variantId }: { productId: string; variantId: string }) =>
      api.delete(`/admin/products/${productId}/variants/${variantId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const removeVariantRow = async (idx: number) => {
    const v = variants[idx];
    if (v.id && modal.product) {
      if (!confirm("Xóa biến thể này?")) return;
      await deleteVariantMutation.mutateAsync({ productId: modal.product.id, variantId: v.id });
    }
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, patch: Partial<VariantRow>) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const updateAttr = (vIdx: number, aIdx: number, patch: Partial<AttrRow>) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== vIdx) return v;
        const attrs = v.attrs.map((a, j) => (j === aIdx ? { ...a, ...patch } : a));
        return { ...v, attrs };
      })
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input placeholder="Tìm kiếm sản phẩm..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-xs" />
        <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700 sm:ml-auto w-full sm:w-auto">
          <PlusCircle className="w-4 h-4 mr-1" /> Thêm sản phẩm
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
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
            {isLoading && <tr><td colSpan={7} className="text-center py-10 text-gray-400">Đang tải...</td></tr>}
            {data?.items?.map((p: Product) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                    {(p.thumbnail_url || p.images?.main) ? (
                      <img src={p.thumbnail_url || p.images!.main} alt={p.name} className="w-full h-full object-cover" />
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

      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">{modal.product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setModal({ open: false })}><X className="w-4 h-4" /></Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Tên sản phẩm *</Label>
                  <Input value={form.name} onChange={(e) => {
                    const slug = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
                    setForm({ ...form, name: e.target.value, slug });
                  }} />
                </div>
                <div className="md:col-span-2">
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
                    {categories?.map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="is_active" checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  <Label htmlFor="is_active">Kích hoạt bán</Label>
                </div>
                <div className="md:col-span-2">
                  <Label>Mô tả (hỗ trợ Markdown)</Label>
                  <textarea className="w-full border rounded p-2 text-sm font-mono" rows={5}
                    placeholder="Hỗ trợ **in đậm**, *nghiêng*, - danh sách, ## tiêu đề..."
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <p className="text-xs text-gray-400 mt-1">Sử dụng cú pháp Markdown để định dạng.</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Ảnh chính sản phẩm</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>

              {/* Variants Section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setVariantSectionOpen((v) => !v)}
                >
                  <span>Biến thể sản phẩm ({variants.length})</span>
                  {variantSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {variantSectionOpen && (
                  <div className="p-4 space-y-4">
                    <p className="text-xs text-gray-500">Thêm các biến thể như Hương vị, Khối lượng, Màu sắc, Kích thước,... Mỗi biến thể có giá và tồn kho riêng.</p>

                    {variants.map((v, vIdx) => (
                      <div key={vIdx} className="border rounded-lg p-4 space-y-3 bg-gray-50 relative">
                        <button
                          type="button"
                          className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                          onClick={() => removeVariantRow(vIdx)}
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-semibold text-gray-600">Biến thể #{vIdx + 1}</div>
                          {vIdx > 0 && (
                            <button
                              type="button"
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => updateVariant(vIdx, { attrs: variants[vIdx - 1].attrs.map((a) => ({ ...a })) })}
                            >
                              Sao chép thuộc tính từ #{vIdx}
                            </button>
                          )}
                        </div>

                        {/* Attributes */}
                        <div>
                          <Label className="text-xs">Thuộc tính (tên → giá trị)</Label>
                          <div className="space-y-1.5 mt-1">
                            {v.attrs.map((a, aIdx) => (
                              <div key={aIdx} className="flex gap-2 items-center">
                                <Input
                                  placeholder="Tên (VD: Khối lượng)"
                                  value={a.key}
                                  onChange={(e) => updateAttr(vIdx, aIdx, { key: e.target.value })}
                                  className="text-xs h-8"
                                />
                                <Input
                                  placeholder="Giá trị (VD: 1kg)"
                                  value={a.value}
                                  onChange={(e) => updateAttr(vIdx, aIdx, { value: e.target.value })}
                                  className="text-xs h-8"
                                />
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-red-500 shrink-0"
                                  onClick={() => updateVariant(vIdx, { attrs: v.attrs.filter((_, j) => j !== aIdx) })}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                              onClick={() => updateVariant(vIdx, { attrs: [...v.attrs, { key: "", value: "" }] })}
                            >
                              <Plus className="w-3 h-3" /> Thêm thuộc tính
                            </button>
                          </div>
                        </div>

                        {/* Price / Stock / SKU */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs">Giá (đ) *</Label>
                            <Input type="number" value={v.price} onChange={(e) => updateVariant(vIdx, { price: e.target.value })} className="h-8 text-xs" />
                          </div>
                          <div>
                            <Label className="text-xs">Giá sale (đ)</Label>
                            <Input type="number" value={v.sale_price} onChange={(e) => updateVariant(vIdx, { sale_price: e.target.value })} className="h-8 text-xs" />
                          </div>
                          <div>
                            <Label className="text-xs">Tồn kho</Label>
                            <Input type="number" value={v.stock_qty} onChange={(e) => updateVariant(vIdx, { stock_qty: e.target.value })} className="h-8 text-xs" />
                          </div>
                          <div>
                            <Label className="text-xs">SKU</Label>
                            <Input value={v.sku} onChange={(e) => updateVariant(vIdx, { sku: e.target.value })} className="h-8 text-xs" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={v.is_active} onChange={(e) => updateVariant(vIdx, { is_active: e.target.checked })} />
                          <Label className="text-xs">Kích hoạt biến thể</Label>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed border-orange-300 text-orange-600 hover:bg-orange-50"
                      onClick={() => { setVariants((prev) => [...prev, emptyVariantRow()]); setVariantSectionOpen(true); }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Thêm biến thể
                    </Button>
                  </div>
                )}
              </div>

              {/* Attr Images Section */}
              {variants.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700">
                    Hình ảnh theo thuộc tính
                    <p className="text-xs font-normal text-gray-400 mt-0.5">
                      Mỗi dòng = một giá trị thuộc tính (VD: Màu=Đỏ). Nhiều biến thể cùng giá trị sẽ dùng chung ảnh.
                    </p>
                  </div>
                  <div className="p-4 space-y-2">
                    {attrImages.map((ai, idx) => (
                      <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                        <Input
                          placeholder="Thuộc tính (VD: Màu)"
                          value={ai.attr_key}
                          onChange={(e) => setAttrImages((prev) => prev.map((r, i) => i === idx ? { ...r, attr_key: e.target.value } : r))}
                          className="h-8 text-xs w-32"
                        />
                        <Input
                          placeholder="Giá trị (VD: Đỏ)"
                          value={ai.attr_value}
                          onChange={(e) => setAttrImages((prev) => prev.map((r, i) => i === idx ? { ...r, attr_value: e.target.value } : r))}
                          className="h-8 text-xs w-32"
                        />
                        {ai.url && <img src={ai.url} alt="" className="w-8 h-8 object-cover rounded border shrink-0" />}
                        <Input
                          type="file" accept="image/*" className="h-8 text-xs flex-1"
                          onChange={(e) => setAttrImages((prev) => prev.map((r, i) => i === idx ? { ...r, file: e.target.files?.[0] ?? null } : r))}
                        />
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-500 shrink-0"
                          onClick={() => setAttrImages((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                      onClick={() => setAttrImages((prev) => [...prev, { attr_key: "", attr_value: "", file: null }])}
                    >
                      <Plus className="w-3 h-3" /> Thêm ảnh theo thuộc tính
                    </button>
                  </div>
                </div>
              )}
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
