"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, X, ChevronDown, ChevronUp, Plus, Sparkles, Wand2 } from "lucide-react";
import Image from 'next/image';
import { Product, Variant, AttrImage } from '@/lib/types';

// Types imported from @/lib/types or defined locally for admin
type AdminVariant = Variant;
type AttrImageRow = { attr_key: string; attr_value: string; url?: string; file?: File | null };
type AdminProduct = Product;
type ProductDetail = AdminProduct & { variants: AdminVariant[]; attr_images: AttrImage[] };

const emptyForm = {
  name: "", slug: "", price: "", sale_price: "", stock_qty: "0",
  brand: "", description: "", category_id: "", is_active: true,
};

type AttrRow = { key: string; value: string };
type OptionGroup = { name: string; values: string };
type VariantRow = {
  id?: string; sku: string; price: string; sale_price: string;
  stock_qty: string; attrs: AttrRow[]; is_active: boolean;
};
type VariantSavePayload = {
  id?: string;
  sku: string | null;
  price: number;
  sale_price: number | null;
  stock_qty: number;
  attributes: Record<string, string>;
  is_active: boolean;
};
type BulkVariantEdit = { price: string; sale_price: string; stock_qty: string; sku_prefix: string };

const emptyOptionGroup = (): OptionGroup => ({ name: "", values: "" });
const emptyBulkEdit = (): BulkVariantEdit => ({ price: "", sale_price: "", stock_qty: "", sku_prefix: "" });

const parseOptionValues = (values: string) =>
  values
    .split(/[\n,;]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v, idx, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === idx);

const attrsToRecord = (attrs: AttrRow[]) => {
  const record: Record<string, string> = {};
  attrs.forEach(({ key, value }) => {
    const cleanKey = key.trim();
    const cleanValue = value.trim();
    if (cleanKey && cleanValue) record[cleanKey] = cleanValue;
  });
  return record;
};

const variantSignature = (attrs: Record<string, string>) =>
  Object.entries(attrs)
    .map(([key, value]) => `${key.trim().toLowerCase()}=${value.trim().toLowerCase()}`)
    .sort()
    .join("|");

const deriveOptionGroups = (rows: VariantRow[]): OptionGroup[] => {
  const map = new Map<string, string[]>();
  rows.forEach((row) => {
    row.attrs.forEach(({ key, value }) => {
      const cleanKey = key.trim();
      const cleanValue = value.trim();
      if (!cleanKey || !cleanValue) return;
      const values = map.get(cleanKey) ?? [];
      if (!values.some((v) => v.toLowerCase() === cleanValue.toLowerCase())) values.push(cleanValue);
      map.set(cleanKey, values);
    });
  });
  return Array.from(map.entries()).map(([name, values]) => ({ name, values: values.join(", ") }));
};

const cartesianOptions = (groups: { name: string; values: string[] }[]) =>
  groups.reduce<Record<string, string>[]>(
    (acc, group) => acc.flatMap((combo) => group.values.map((value) => ({ ...combo, [group.name]: value }))),
    [{}]
  );

const skuPart = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();

const buildSku = (prefix: string, attrs: Record<string, string>) => {
  const parts = Object.values(attrs).map(skuPart).filter(Boolean);
  return [prefix.trim(), ...parts].filter(Boolean).join("-");
};

const toVariantPayload = (variant: VariantRow): VariantSavePayload => ({
  ...(variant.id ? { id: variant.id } : {}),
  sku: variant.sku.trim() || null,
  price: parseFloat(variant.price) || 0,
  sale_price: variant.sale_price ? parseFloat(variant.sale_price) : null,
  stock_qty: parseInt(variant.stock_qty) || 0,
  attributes: attrsToRecord(variant.attrs),
  is_active: variant.is_active,
});

const getVariantAttrKeys = (rows: VariantRow[]) =>
  Array.from(new Set(rows.flatMap((variant) => variant.attrs.map((attr) => attr.key.trim()).filter(Boolean))));

const getVariantAttrValues = (rows: VariantRow[], attrKey: string) =>
  Array.from(new Set(
    rows
      .map((variant) => variant.attrs.find((attr) => attr.key.trim() === attrKey)?.value.trim())
      .filter((value): value is string => Boolean(value))
  ));

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ open: boolean; product?: Product }>({ open: false });
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([emptyOptionGroup()]);
  const [bulkEdit, setBulkEdit] = useState<BulkVariantEdit>(emptyBulkEdit);
  const [variantSectionOpen, setVariantSectionOpen] = useState(false);
  const [attrImages, setAttrImages] = useState<AttrImageRow[]>([]);
  const [imageAttrKey, setImageAttrKey] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: async () => {
      const res = await api.get(`/admin/products?search=${search}&limit=100`);
      return res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories/")).data,
  });

  const openCreate = () => {
    setForm(emptyForm);
    setVariants([]);
    setOptionGroups([emptyOptionGroup()]);
    setBulkEdit(emptyBulkEdit());
    setAttrImages([]);
    setImageAttrKey("");
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
      is_active: p.is_active ?? true,
    });
    setImageFile(null);
    setAttrImages([]);
    setImageAttrKey("");
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
      setOptionGroups(rows.length > 0 ? deriveOptionGroups(rows) : [emptyOptionGroup()]);
      setBulkEdit(emptyBulkEdit());
      setVariantSectionOpen(rows.length > 0);
      setAttrImages((detail.attr_images ?? []).map((ai) => ({ attr_key: ai.attr_key, attr_value: ai.attr_value, url: ai.url, file: null })));
      const imageKeys = Array.from(new Set((detail.attr_images ?? []).map((ai) => ai.attr_key).filter(Boolean)));
      setImageAttrKey(imageKeys[0] ?? deriveOptionGroups(rows)[0]?.name ?? "");
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
      const variantPayloads = variants.map(toVariantPayload);

      let savedId: string;
      if (modal.product) {
        await api.put(`/admin/products/${modal.product.id}/full`, { product: payload, variants: variantPayloads });
        savedId = modal.product.id;
      } else {
        const res = await api.post("/admin/products/full", { product: payload, variants: variantPayloads });
        savedId = res.data.id;
      }

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        await api.post(`/admin/products/${savedId}/image`, fd);
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

  const rewriteMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await api.post("/admin/rewrite-markdown", { text });
      return res.data.result as string;
    },
    onSuccess: (result) => {
      setForm((prev) => ({ ...prev, description: result }));
    },
    onError: () => alert("Không thể viết lại mô tả. Vui lòng thử lại sau."),
  });

  const removeVariantRow = (idx: number) => {
    const v = variants[idx];
    if (v.id && !confirm("Bỏ biến thể này khỏi sản phẩm? Khi lưu, biến thể đã có đơn hàng sẽ được ẩn thay vì xóa.")) return;
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, patch: Partial<VariantRow>) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const updateOptionGroup = (idx: number, patch: Partial<OptionGroup>) => {
    setOptionGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const generateVariantMatrix = () => {
    const groups = optionGroups
      .map((group) => ({ name: group.name.trim(), values: parseOptionValues(group.values) }))
      .filter((group) => group.name || group.values.length > 0);

    if (groups.length === 0) {
      alert("Vui lòng nhập ít nhất một nhóm thuộc tính.");
      return;
    }
    if (groups.length > 3) {
      alert("Chỉ nên dùng tối đa 3 nhóm thuộc tính cho một sản phẩm.");
      return;
    }
    if (groups.some((group) => !group.name || group.values.length === 0)) {
      alert("Mỗi nhóm thuộc tính cần có tên và ít nhất một giá trị.");
      return;
    }

    const existing = new Map(variants.map((variant) => [variantSignature(attrsToRecord(variant.attrs)), variant]));
    const combos = cartesianOptions(groups);
    const next = combos.map((attrs) => {
      const matched = existing.get(variantSignature(attrs));
      if (matched) return matched;
      return {
        sku: buildSku(bulkEdit.sku_prefix, attrs),
        price: bulkEdit.price || form.price || "0",
        sale_price: bulkEdit.sale_price || form.sale_price || "",
        stock_qty: bulkEdit.stock_qty || "0",
        attrs: Object.entries(attrs).map(([key, value]) => ({ key, value })),
        is_active: true,
      };
    });

    setVariants(next);
    setVariantSectionOpen(true);
  };

  const applyBulkEdit = (fields: Array<keyof BulkVariantEdit>) => {
    setVariants((prev) =>
      prev.map((variant) => {
        const patch: Partial<VariantRow> = {};
        if (fields.includes("price") && bulkEdit.price) patch.price = bulkEdit.price;
        if (fields.includes("sale_price")) patch.sale_price = bulkEdit.sale_price;
        if (fields.includes("stock_qty") && bulkEdit.stock_qty) patch.stock_qty = bulkEdit.stock_qty;
        if (fields.includes("sku_prefix")) patch.sku = buildSku(bulkEdit.sku_prefix, attrsToRecord(variant.attrs));
        return { ...variant, ...patch };
      })
    );
  };

  const generateAttrImageRows = (attrKey = imageAttrKey) => {
    if (!attrKey) {
      alert("Vui lòng chọn thuộc tính dùng cho ảnh.");
      return;
    }
    const values = getVariantAttrValues(variants, attrKey);
    if (values.length === 0) {
      alert("Thuộc tính này chưa có giá trị trong bảng biến thể.");
      return;
    }
    setAttrImages((prev) => {
      const existing = new Map(prev.map((row) => [`${row.attr_key}=${row.attr_value}`, row]));
      return values.map((value) => existing.get(`${attrKey}=${value}`) ?? { attr_key: attrKey, attr_value: value, file: null });
    });
  };

  const updateAttrImageFile = (attrKey: string, attrValue: string, file: File | null) => {
    setAttrImages((prev) => {
      const exists = prev.some((row) => row.attr_key === attrKey && row.attr_value === attrValue);
      if (!exists) return [...prev, { attr_key: attrKey, attr_value: attrValue, file }];
      return prev.map((row) => row.attr_key === attrKey && row.attr_value === attrValue ? { ...row, file } : row);
    });
  };

  const attrKeys = getVariantAttrKeys(variants);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input placeholder="Tìm kiếm sản phẩm..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-xs" />
        <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-700 sm:ml-auto w-full sm:w-auto">
          <PlusCircle className="w-4 h-4 mr-1" /> Thêm sản phẩm
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 700 }}>
          <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Ảnh</th>
              <th className="text-left px-4 py-3">Tên sản phẩm</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Danh mục</th>
              <th className="text-right px-4 py-3">Giá</th>
              <th className="text-right px-4 py-3">Tồn kho</th>
              <th className="text-center px-4 py-3">Kích hoạt</th>
              <th className="text-center px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={7} className="text-center py-10 text-gray-400">Đang tải...</td></tr>}
            {data?.items?.map((p: AdminProduct) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                    {(p.thumbnail_url || p.images?.main) ? (
                      <Image 
                        src={p.thumbnail_url || p.images?.main || ''} 
                        alt={p.name} 
                        width={48} 
                        height={48} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">N/A</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium max-w-[160px] lg:max-w-[200px] truncate">{p.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{p.category_name ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div>{p.price.toLocaleString()}đ</div>
                  {p.sale_price && <div className="text-orange-500 text-xs">{p.sale_price.toLocaleString()}đ</div>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={(p.stock_qty ?? 0) < 10 ? "text-red-500 font-bold" : ""}>{p.stock_qty ?? 0}</span>
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
          <div className="bg-white rounded-2xl w-full max-w-[95vw] md:max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
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
                  <div className="flex items-center justify-between">
                    <Label>Mô tả (hỗ trợ Markdown)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1 border-orange-200 text-orange-600 hover:bg-orange-50"
                      disabled={rewriteMutation.isPending || !form.description?.trim()}
                      onClick={() => rewriteMutation.mutate(form.description)}
                    >
                      <Sparkles className="w-3 h-3" />
                      {rewriteMutation.isPending ? "Đang viết..." : "AI viết lại"}
                    </Button>
                  </div>
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
                    <div className="rounded-lg border bg-white p-4 space-y-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold text-gray-800">Nhóm thuộc tính</div>
                        <p className="text-xs text-gray-500">Nhập các nhóm như Khối lượng, Hương vị, Màu sắc. Giá trị có thể phân cách bằng dấu phẩy hoặc xuống dòng.</p>
                      </div>
                      <div className="space-y-2">
                        {optionGroups.map((group, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-[180px_1fr_32px] gap-2 items-start">
                            <Input
                              placeholder="VD: Khối lượng"
                              value={group.name}
                              onChange={(e) => updateOptionGroup(idx, { name: e.target.value })}
                              className="h-9 text-xs"
                            />
                            <Input
                              placeholder="VD: 400g, 1kg, 2kg"
                              value={group.values}
                              onChange={(e) => updateOptionGroup(idx, { values: e.target.value })}
                              className="h-9 text-xs"
                            />
                            <button
                              type="button"
                              className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-red-500"
                              onClick={() => setOptionGroups((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setOptionGroups((prev) => [...prev, emptyOptionGroup()])}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Thêm nhóm
                        </Button>
                        <Button type="button" size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={generateVariantMatrix}>
                          <Wand2 className="w-3.5 h-3.5 mr-1" /> Tạo bảng biến thể
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                      <div className="text-sm font-semibold text-gray-800">Áp dụng nhanh</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Input type="number" placeholder="Giá chung" value={bulkEdit.price} onChange={(e) => setBulkEdit((prev) => ({ ...prev, price: e.target.value }))} className="h-9 text-xs" />
                        <Input type="number" placeholder="Giá sale chung" value={bulkEdit.sale_price} onChange={(e) => setBulkEdit((prev) => ({ ...prev, sale_price: e.target.value }))} className="h-9 text-xs" />
                        <Input type="number" placeholder="Tồn kho chung" value={bulkEdit.stock_qty} onChange={(e) => setBulkEdit((prev) => ({ ...prev, stock_qty: e.target.value }))} className="h-9 text-xs" />
                        <Input placeholder="Tiền tố SKU, VD: RC-CAT" value={bulkEdit.sku_prefix} onChange={(e) => setBulkEdit((prev) => ({ ...prev, sku_prefix: e.target.value }))} className="h-9 text-xs" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => applyBulkEdit(["price"])}>Áp giá</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => applyBulkEdit(["sale_price"])}>Áp sale</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => applyBulkEdit(["stock_qty"])}>Áp tồn</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => applyBulkEdit(["sku_prefix"])}>Tự sinh SKU</Button>
                      </div>
                    </div>

                    {variants.length > 0 ? (
                      <div className="overflow-x-auto border rounded-lg bg-white">
                        <table className="w-full text-xs" style={{ minWidth: 920 }}>
                          <thead className="bg-gray-50 text-gray-500 uppercase border-b">
                            <tr>
                              <th className="text-left px-3 py-2 w-[260px]">Phân loại</th>
                              <th className="text-left px-3 py-2">SKU</th>
                              <th className="text-right px-3 py-2">Giá</th>
                              <th className="text-right px-3 py-2">Sale</th>
                              <th className="text-right px-3 py-2">Tồn</th>
                              <th className="text-center px-3 py-2">Bán</th>
                              <th className="text-center px-3 py-2 w-[96px]">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {variants.map((v, vIdx) => (
                              <tr key={`${v.id ?? "new"}-${vIdx}`} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {v.attrs.map((a, aIdx) => (
                                      <span key={`${a.key}-${a.value}-${aIdx}`} className="rounded bg-orange-50 px-2 py-1 text-orange-700">
                                        {a.key}: {a.value}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <Input value={v.sku} onChange={(e) => updateVariant(vIdx, { sku: e.target.value })} className="h-8 text-xs" />
                                </td>
                                <td className="px-3 py-2">
                                  <Input type="number" value={v.price} onChange={(e) => updateVariant(vIdx, { price: e.target.value })} className="h-8 text-xs text-right" />
                                </td>
                                <td className="px-3 py-2">
                                  <Input type="number" value={v.sale_price} onChange={(e) => updateVariant(vIdx, { sale_price: e.target.value })} className="h-8 text-xs text-right" />
                                </td>
                                <td className="px-3 py-2">
                                  <Input type="number" value={v.stock_qty} onChange={(e) => updateVariant(vIdx, { stock_qty: e.target.value })} className="h-8 text-xs text-right" />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input type="checkbox" checked={v.is_active} onChange={(e) => updateVariant(vIdx, { is_active: e.target.checked })} />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex justify-center gap-1">
                                    <button type="button" className="p-1.5 text-gray-400 hover:text-red-600" onClick={() => removeVariantRow(vIdx)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-400">
                        Chưa có biến thể. Nhập nhóm thuộc tính rồi bấm Tạo bảng biến thể.
                      </div>
                    )}
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
                  <div className="p-4 space-y-4">
                    <div className="flex flex-col md:flex-row gap-2 md:items-end">
                      <div className="flex-1">
                        <Label className="text-xs">Thuộc tính dùng cho ảnh</Label>
                        <select
                          className="w-full border rounded p-2 text-sm bg-white h-9"
                          value={imageAttrKey}
                          onChange={(e) => {
                            setImageAttrKey(e.target.value);
                            if (e.target.value) generateAttrImageRows(e.target.value);
                          }}
                        >
                          <option value="">-- Chọn thuộc tính --</option>
                          {attrKeys.map((key) => <option key={key} value={key}>{key}</option>)}
                        </select>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => generateAttrImageRows()}>
                        <Wand2 className="w-3.5 h-3.5 mr-1" /> Tạo dòng ảnh
                      </Button>
                    </div>

                    {imageAttrKey && getVariantAttrValues(variants, imageAttrKey).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getVariantAttrValues(variants, imageAttrKey).map((value) => {
                          const row = attrImages.find((img) => img.attr_key === imageAttrKey && img.attr_value === value);
                          return (
                            <div key={`${imageAttrKey}-${value}`} className="border rounded-lg bg-white p-3 flex items-center gap-3">
                              <div className="w-14 h-14 rounded-lg bg-gray-100 border overflow-hidden relative shrink-0">
                                {row?.url ? (
                                  <Image src={row.url} alt={value} fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-300">NO IMG</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-gray-500">{imageAttrKey}</div>
                                <div className="text-sm font-semibold text-gray-900 truncate">{value}</div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="h-8 text-xs mt-2"
                                  onChange={(e) => updateAttrImageFile(imageAttrKey, value, e.target.files?.[0] ?? null)}
                                />
                              </div>
                              {(row?.url || row?.file) && (
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-red-500 shrink-0"
                                  onClick={() => setAttrImages((prev) => prev.filter((img) => !(img.attr_key === imageAttrKey && img.attr_value === value)))}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-400">
                        Chọn thuộc tính ảnh để hệ thống tự tạo các dòng upload.
                      </div>
                    )}
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
