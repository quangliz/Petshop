"use client";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Order } from "@/lib/types";
import { AdminTableRowsSkeleton } from "@/components/skeletons/AdminSkeletons";
import { Button } from "@/components/ui/button";

const ALL_STATUSES = ["all", "pending", "confirmed", "shipping", "completed", "cancelled"];

const STATUS_LABELS: Record<string, string> = {
  all: "Tất cả", pending: "Chờ xử lý", confirmed: "Đã xác nhận",
  shipping: "Đang giao", completed: "Hoàn thành", cancelled: "Đã huỷ",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipping: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [activeStatus, setActiveStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", activeStatus],
    queryFn: async () => {
      const url = activeStatus === "all" ? "/admin/orders?limit=100" : `/admin/orders?status=${activeStatus}&limit=100`;
      const res = await api.get(url);
      return res.data;
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [activeStatus]);

  const orders = data?.items ?? [];
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
    onError: (e: { response?: { data?: { detail?: string } } }) => alert(e.response?.data?.detail ?? "Lỗi cập nhật"),
  });

  return (
    <div>
      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => setActiveStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeStatus === s ? "bg-orange-600 text-white shadow" : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 600 }}>
          <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Mã đơn</th>
              <th className="text-left px-4 py-3">Khách hàng</th>
              <th className="text-right px-4 py-3">Tổng tiền</th>
              <th className="text-center px-4 py-3">PTTT</th>
              <th className="text-center px-4 py-3">Trạng thái</th>
              <th className="text-center px-4 py-3">Ngày đặt</th>
              <th className="text-center px-4 py-3">Cập nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <AdminTableRowsSkeleton columns={7} rows={6} imageColumn={false} />}
            {paginatedOrders.map((o: Order) => (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-xs">{o.order_code}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{o.customer_name}</div>
                  <div className="text-xs text-gray-400">{o.customer_email}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{o.total.toLocaleString()}đ</td>
                <td className="px-4 py-3 text-center uppercase text-xs font-medium">{o.payment_method}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {new Date(o.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={o.status}
                    className="text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:border-orange-500"
                    onChange={(e) => updateStatusMutation.mutate({ id: o.id, status: e.target.value })}
                    disabled={o.status === "cancelled" || o.status === "completed"}
                  >
                    {["pending", "confirmed", "shipping", "completed", "cancelled"].map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!isLoading && data?.items?.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Không có đơn hàng nào</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 rounded-b-xl shrink-0">
          <div className="text-xs text-neutral-500 font-medium">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, orders.length)} trong tổng số {orders.length} đơn hàng
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
    </div>
  );
}
