"use client";
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ArrowLeft, Send, CheckSquare, Square, ShieldAlert, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  variant_attributes?: Record<string, string> | null;
}

interface OrderReturnItemInput {
  order_item_id: string;
  quantity: number;
}

export default function OrderReturnPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/${orderId}`);
      return res.data;
    }
  });

  const { data: existingReturns, isLoading: returnsLoading } = useQuery({
    queryKey: ['order-returns', orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/${orderId}/returns`);
      return res.data;
    }
  });

  // Local state for selected items and return quantities
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');

  // Calculate already returned quantities
  const returnedQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!existingReturns) return map;
    for (const ret of existingReturns) {
      if (ret.status !== 'rejected') {
        for (const rit of ret.items) {
          map[rit.order_item_id] = (map[rit.order_item_id] || 0) + rit.quantity;
        }
      }
    }
    return map;
  }, [existingReturns]);

  // Check if order is eligible
  const eligibility = useMemo(() => {
    if (!order) return { eligible: false, reason: 'Không tìm thấy đơn hàng' };
    if (order.status !== 'completed') {
      return { eligible: false, reason: 'Chỉ có thể yêu cầu đổi trả cho đơn hàng đã hoàn thành' };
    }
    const orderDate = new Date(order.updated_at || order.created_at);
    const diffDays = (new Date().getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays > 7) {
      return { eligible: false, reason: 'Đã quá hạn 7 ngày đổi trả kể từ ngày đơn hàng hoàn thành' };
    }
    return { eligible: true };
  }, [order]);

  const returnMutation = useMutation({
    mutationFn: async (payload: { reason: string; items: OrderReturnItemInput[] }) => {
      const res = await api.post(`/orders/${orderId}/returns`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Gửi yêu cầu đổi trả thành công!');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-returns', orderId] });
      router.push(`/orders/${orderId}`);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const msg = err.response?.data?.detail || 'Lỗi gửi yêu cầu đổi trả.';
      toast.error(msg);
    }
  });

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      if (next[itemId] && !quantities[itemId]) {
        setQuantities(q => ({ ...q, [itemId]: 1 }));
      }
      return next;
    });
  };

  const handleQtyChange = (itemId: string, val: number, maxQty: number) => {
    const q = Math.max(1, Math.min(maxQty, val));
    setQuantities(prev => ({ ...prev, [itemId]: q }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibility.eligible) {
      toast.error(eligibility.reason);
      return;
    }
    if (reason.trim().length < 5) {
      toast.error('Lý do đổi trả phải có ít nhất 5 ký tự.');
      return;
    }
    const itemsPayload: OrderReturnItemInput[] = Object.entries(selectedItems)
      .filter(([, selected]) => selected)
      .map(([itemId]) => ({
        order_item_id: itemId,
        quantity: quantities[itemId] || 1
      }));

    if (itemsPayload.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm để đổi trả.');
      return;
    }

    returnMutation.mutate({
      reason,
      items: itemsPayload
    });
  };

  if (orderLoading || returnsLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-6 bg-white border border-neutral-100 rounded-[20px] shadow-sm">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-2">Không tìm thấy đơn hàng</h2>
        <p className="text-neutral-500 text-sm mb-6">Đơn hàng bạn yêu cầu đổi trả không tồn tại hoặc đã bị xóa.</p>
        <Link href="/" className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-bold block">
          Quay lại Trang chủ
        </Link>
      </div>
    );
  }

  // Calculate estimated refund value
  const estimatedRefund = Object.entries(selectedItems)
    .filter(([, selected]) => selected)
    .reduce((sum, [itemId]) => {
      const item = order.items.find((oi: OrderItem) => oi.id === itemId);
      if (!item) return sum;
      const q = quantities[itemId] || 1;
      return sum + item.price * q;
    }, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 mb-6">
        <Link href={`/orders/${orderId}`} className="text-inherit hover:text-neutral-900 flex items-center gap-1 transition-colors">
          <ArrowLeft size={14} /> Chi tiết đơn hàng
        </Link>
        <ChevronRight size={14} />
        <span className="text-neutral-900 font-semibold">Yêu cầu đổi trả</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">Đổi trả hàng</h1>
      <p className="text-neutral-500 text-sm mb-8">
        Mã đơn hàng: <span className="font-semibold text-neutral-900">#{order.order_code}</span>
      </p>

      {!eligibility.eligible ? (
        <div className="bg-red-50 border border-red-200 rounded-[16px] p-5 flex gap-4 text-red-800 mb-8 animate-in fade-in duration-200">
          <ShieldAlert className="w-6 h-6 shrink-0 text-red-600" />
          <div>
            <h4 className="font-bold text-[15px]">Không thể yêu cầu đổi trả</h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{eligibility.reason}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Selection Card */}
          <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 sm:p-6">
            <h2 className="text-base font-extrabold mb-4 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--primary-50)] text-[var(--primary-600)]">
                <ShoppingBag size={15} />
              </div>
              Chọn sản phẩm muốn trả
            </h2>

            <div className="divide-y divide-neutral-100">
              {order.items.map((item: OrderItem) => {
                const alreadyReturned = returnedQtyMap[item.id] || 0;
                const maxQty = item.quantity - alreadyReturned;
                const isSelected = !!selectedItems[item.id];
                const isUnavailable = maxQty <= 0;

                return (
                  <div key={item.id} className={`py-4 flex items-start gap-3.5 ${isUnavailable ? 'opacity-50' : ''}`}>
                    <button
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => toggleSelectItem(item.id)}
                      className="mt-1 text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                    >
                      {isUnavailable ? (
                        <Square className="w-5 h-5 opacity-40 cursor-not-allowed" />
                      ) : isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[var(--primary-600)]" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-neutral-800 line-clamp-2">
                        {item.product_name}
                      </div>
                      {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                        <div className="text-xs text-neutral-400 mt-1">
                          {Object.entries(item.variant_attributes).map(([k, v]) => `${k}: ${v}`).join(" / ")}
                        </div>
                      )}
                      <div className="text-xs text-neutral-500 mt-1.5 flex items-center gap-2">
                        <span>Đã mua: {item.quantity}</span>
                        {alreadyReturned > 0 && (
                          <span className="text-[var(--danger)] font-medium">Đã trả: {alreadyReturned}</span>
                        )}
                        <span className="font-semibold text-neutral-800">
                          {item.price.toLocaleString()}đ
                        </span>
                      </div>
                    </div>

                    {isSelected && !isUnavailable && (
                      <div className="flex items-center gap-2 border border-neutral-200 rounded-lg px-2 py-1 bg-neutral-50 shrink-0">
                        <span className="text-[11px] font-bold text-neutral-500">SL:</span>
                        <input
                          type="number"
                          min="1"
                          max={maxQty}
                          value={quantities[item.id] || 1}
                          onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 1, maxQty)}
                          className="w-10 text-center bg-transparent border-none text-sm font-bold outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Return Reason Card */}
          <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 sm:p-6">
            <label htmlFor="return-reason" className="block text-base font-extrabold text-neutral-900 mb-3">
              Lý do đổi trả hàng
            </label>
            <textarea
              id="return-reason"
              rows={4}
              placeholder="Vui lòng cung cấp lý do chi tiết (ví dụ: sản phẩm không đúng mô tả, bị hư hỏng do vận chuyển, hàng lỗi kỹ thuật...)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-4 border border-neutral-200 rounded-2xl text-[14px] outline-none focus:border-[var(--primary-500)] resize-none"
            />
            <p className="text-[11px] text-neutral-400 mt-2">
              Ít nhất 5 ký tự. Vui lòng mô tả chính xác để quá trình duyệt diễn ra nhanh hơn.
            </p>
          </div>

          {/* Refund Calculation & Actions */}
          <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm p-5 sm:p-6">
            <div className="flex justify-between items-baseline mb-6">
              <span className="text-sm text-neutral-500 font-medium">Số tiền hoàn trả dự tính</span>
              <span className="text-2xl font-extrabold text-[var(--primary-600)]">
                {estimatedRefund.toLocaleString()}đ
              </span>
            </div>

            <div className="flex gap-4">
              <Link
                href={`/orders/${orderId}`}
                className="flex-1 h-12 border border-neutral-200 rounded-2xl flex items-center justify-center text-sm font-bold hover:bg-neutral-50 transition-colors"
              >
                Hủy bỏ
              </Link>
              <button
                type="submit"
                disabled={returnMutation.isPending}
                className="flex-1 h-12 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all disabled:opacity-75"
              >
                {returnMutation.isPending ? (
                  <>
                    <Spinner size={16} /> Đang gửi...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Gửi yêu cầu
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
