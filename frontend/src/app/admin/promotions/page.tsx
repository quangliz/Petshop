"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Promotion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, X, Ticket } from "lucide-react";
import { AdminTableRowsSkeleton } from "@/components/skeletons/AdminSkeletons";
import { toast } from "sonner";

// Helper to format date string for input datetime-local
function formatForDateTimeLocal(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; promotion?: Promotion }>({ open: false });
  const [form, setForm] = useState({
    code: "",
    description: "",
    promo_type: "product" as "product" | "shipping",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 0,
    min_subtotal: 0,
    max_discount: "" as number | "",
    starts_at: "",
    expires_at: "",
    usage_limit: "" as number | "",
    is_active: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => {
      const res = await api.get("/promotions");
      return res.data as Promotion[] ?? [];
    },
  });

  const openCreate = () => {
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);
    
    setForm({
      code: "",
      description: "",
      promo_type: "product",
      discount_type: "percentage",
      discount_value: 0,
      min_subtotal: 0,
      max_discount: "",
      starts_at: formatForDateTimeLocal(now.toISOString()),
      expires_at: formatForDateTimeLocal(oneMonthLater.toISOString()),
      usage_limit: "",
      is_active: true,
    });
    setModal({ open: true });
  };

  const openEdit = (p: Promotion) => {
    setForm({
      code: p.code,
      description: p.description ?? "",
      promo_type: p.promo_type,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      min_subtotal: p.min_subtotal,
      max_discount: p.max_discount ?? "",
      starts_at: formatForDateTimeLocal(p.starts_at),
      expires_at: formatForDateTimeLocal(p.expires_at),
      usage_limit: p.usage_limit ?? "",
      is_active: p.is_active,
    });
    setModal({ open: true, promotion: p });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        promo_type: form.promo_type,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_subtotal: Number(form.min_subtotal),
        max_discount: form.max_discount === "" ? null : Number(form.max_discount),
        starts_at: new Date(form.starts_at).toISOString(),
        expires_at: new Date(form.expires_at).toISOString(),
        usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
        is_active: form.is_active,
      };

      if (modal.promotion) {
        await api.put(`/promotions/${modal.promotion.id}`, payload);
      } else {
        await api.post("/promotions", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      toast.success(modal.promotion ? "Cập nhật mã giảm giá thành công!" : "Tạo mã giảm giá thành công!");
      setModal({ open: false });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Lỗi lưu mã giảm giá";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/promotions/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      toast.success(res.data?.message || "Đã xóa mã giảm giá!");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Lỗi xóa mã giảm giá";
      toast.error(msg);
    },
  });

  const promotions = data ?? [];
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(promotions.length / itemsPerPage);
  const paginatedPromotions = promotions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (p: Promotion) => {
    const now = new Date();
    const start = new Date(p.starts_at);
    const expire = new Date(p.expires_at);

    if (!p.is_active) {
      return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">Đã khóa</span>;
    }
    if (now < start) {
      return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">Sắp diễn ra</span>;
    }
    if (now > expire) {
      return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-500 border border-red-100">Hết hạn</span>;
    }
    if (p.usage_limit !== null && p.usage_count >= p.usage_limit) {
      return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-500 border border-orange-100">Hết lượt</span>;
    }
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-100">Đang hoạt động</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-orange-500" /> Quản lý Voucher / Mã giảm giá
          </h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý các chương trình ưu đãi, giảm giá sản phẩm và phí vận chuyển</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-sm">
          <PlusCircle className="w-4 h-4 mr-2" /> Thêm mã mới
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 uppercase text-[11px] font-bold tracking-wider">
            <tr>
              <th className="text-left px-6 py-4">Mã</th>
              <th className="text-left px-6 py-4">Mô tả</th>
              <th className="text-left px-6 py-4">Loại áp dụng</th>
              <th className="text-right px-6 py-4">Giá trị giảm</th>
              <th className="text-right px-6 py-4">Đơn tối thiểu</th>
              <th className="text-center px-6 py-4">Lượt dùng</th>
              <th className="text-center px-6 py-4">Thời gian</th>
              <th className="text-center px-6 py-4">Trạng thái</th>
              <th className="text-center px-6 py-4 w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-700">
            {isLoading && <AdminTableRowsSkeleton columns={9} rows={5} />}
            {!isLoading && promotions.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Ticket className="w-8 h-8 text-neutral-300" />
                    <span>Chưa có mã giảm giá nào được tạo</span>
                  </div>
                </td>
              </tr>
            )}
            {paginatedPromotions.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-orange-600 uppercase tracking-wide">{p.code}</td>
                <td className="px-6 py-4 text-xs max-w-[200px] truncate" title={p.description ?? ""}>
                  {p.description || <span className="text-neutral-300">Không có mô tả</span>}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                    p.promo_type === "product" ? "bg-orange-50 text-orange-700 border border-orange-100" : "bg-teal-50 text-teal-700 border border-teal-100"
                  }`}>
                    {p.promo_type === "product" ? "Sản phẩm" : "Vận chuyển"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-semibold">
                  {p.discount_type === "percentage" ? (
                    <span className="text-blue-600 flex items-center justify-end gap-1">
                      {p.discount_value}% 
                      {p.max_discount && <span className="text-[10px] text-neutral-400 font-normal">(Tối đa {p.max_discount.toLocaleString()}đ)</span>}
                    </span>
                  ) : (
                    <span className="text-green-600">{p.discount_value.toLocaleString()}đ</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right font-medium">{p.min_subtotal.toLocaleString()}đ</td>
                <td className="px-6 py-4 text-center text-xs">
                  <span className="font-semibold text-neutral-900">{p.usage_count}</span>
                  {p.usage_limit ? (
                    <span className="text-neutral-400"> / {p.usage_limit}</span>
                  ) : (
                    <span className="text-neutral-400"> / ∞</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center text-xs">
                  <div className="flex flex-col items-center">
                    <span className="text-neutral-600 font-medium">{new Date(p.starts_at).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}</span>
                    <span className="text-neutral-400 text-[10px]">đến {new Date(p.expires_at).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'2-digit'})}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">{getStatusBadge(p)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-neutral-200 hover:bg-neutral-100 text-neutral-600 rounded-lg" onClick={() => openEdit(p)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 border-neutral-200 hover:bg-red-50 hover:border-red-200 text-red-500 rounded-lg"
                      onClick={() => {
                        const usageWarning = p.usage_count > 0 ? "\nLưu ý: Mã này đã có lượt sử dụng, hệ thống sẽ khóa thay vì xóa vĩnh viễn để bảo toàn lịch sử đơn hàng." : "";
                        if (confirm(`Xác nhận xóa/vô hiệu hóa mã giảm giá ${p.code}?${usageWarning}`)) {
                          deleteMutation.mutate(p.id);
                        }
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 rounded-b-2xl shrink-0">
          <div className="text-xs text-neutral-500 font-medium">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, promotions.length)} trong tổng số {promotions.length} mã
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(prev => Math.max(1, prev - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-8 px-2.5 text-xs rounded-lg border-neutral-200 bg-white"
            >
              Trước
            </Button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCurrentPage(pageNum);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`h-8 w-8 p-0 text-xs rounded-lg ${
                    currentPage === pageNum 
                      ? "bg-orange-600 hover:bg-orange-500 text-white" 
                      : "border-neutral-200 hover:bg-neutral-100 bg-white"
                  }`}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="h-8 px-2.5 text-xs rounded-lg border-neutral-200 bg-white"
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-orange-500" />
                {modal.promotion ? `Chỉnh sửa mã: ${form.code}` : "Tạo mã giảm giá mới"}
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0 rounded-full hover:bg-neutral-100" onClick={() => setModal({ open: false })}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="code" className="font-semibold text-neutral-700">Mã giảm giá (Ví dụ: SUMMER2026)</Label>
                <Input
                  id="code"
                  disabled={!!modal.promotion}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="Nhập mã viết liền không dấu..."
                  className="mt-1.5 uppercase rounded-xl border-neutral-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div>
                <Label htmlFor="description" className="font-semibold text-neutral-700">Mô tả chương trình</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả quyền lợi: Giảm 10% cho đơn hàng từ 200k..."
                  className="w-full mt-1.5 p-3 text-sm rounded-xl border border-neutral-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold text-neutral-700">Áp dụng cho</Label>
                  <select
                    value={form.promo_type}
                    onChange={(e) => setForm({ ...form, promo_type: e.target.value as "product" | "shipping" })}
                    className="w-full mt-1.5 p-2.5 text-sm rounded-xl border border-neutral-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  >
                    <option value="product">Giá trị sản phẩm</option>
                    <option value="shipping">Phí vận chuyển</option>
                  </select>
                </div>
                <div>
                  <Label className="font-semibold text-neutral-700">Loại chiết khấu</Label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percentage" | "fixed" })}
                    className="w-full mt-1.5 p-2.5 text-sm rounded-xl border border-neutral-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (đ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount_value" className="font-semibold text-neutral-700">
                    Giá trị giảm {form.discount_type === "percentage" ? "(%)" : "(đ)"}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    min="1"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: Math.max(0, Number(e.target.value)) })}
                    className="mt-1.5 rounded-xl border-neutral-200"
                  />
                </div>
                <div>
                  <Label htmlFor="min_subtotal" className="font-semibold text-neutral-700">Đơn tối thiểu (đ)</Label>
                  <Input
                    id="min_subtotal"
                    type="number"
                    min="0"
                    value={form.min_subtotal}
                    onChange={(e) => setForm({ ...form, min_subtotal: Math.max(0, Number(e.target.value)) })}
                    className="mt-1.5 rounded-xl border-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_discount" className="font-semibold text-neutral-700">Giảm tối đa (đ)</Label>
                  <Input
                    id="max_discount"
                    type="number"
                    placeholder={form.discount_type === "fixed" ? "Không khả dụng" : "Không giới hạn"}
                    disabled={form.discount_type === "fixed"}
                    value={form.max_discount}
                    onChange={(e) => setForm({ ...form, max_discount: e.target.value === "" ? "" : Math.max(0, Number(e.target.value)) })}
                    className="mt-1.5 rounded-xl border-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-400"
                  />
                </div>
                <div>
                  <Label htmlFor="usage_limit" className="font-semibold text-neutral-700">Giới hạn số lượt dùng</Label>
                  <Input
                    id="usage_limit"
                    type="number"
                    placeholder="Không giới hạn (vô tận)"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value === "" ? "" : Math.max(1, Number(e.target.value)) })}
                    className="mt-1.5 rounded-xl border-neutral-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="starts_at" className="font-semibold text-neutral-700">Thời gian bắt đầu</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="mt-1.5 rounded-xl border-neutral-200"
                  />
                </div>
                <div>
                  <Label htmlFor="expires_at" className="font-semibold text-neutral-700">Thời gian hết hạn</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="mt-1.5 rounded-xl border-neutral-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4.5 h-4.5 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                />
                <div>
                  <Label htmlFor="is_active" className="font-bold text-neutral-800 cursor-pointer">Kích hoạt mã giảm giá</Label>
                  <p className="text-neutral-400 text-[11px] mt-0.5">Cho phép người dùng nhìn thấy và áp dụng mã này khi thanh toán</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-100 sticky bottom-0 bg-white">
              <Button variant="ghost" onClick={() => setModal({ open: false })} className="rounded-xl border border-neutral-200">
                Hủy
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.code || !form.starts_at || !form.expires_at || form.discount_value <= 0}
                className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-sm px-6 disabled:opacity-50"
              >
                {saveMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
