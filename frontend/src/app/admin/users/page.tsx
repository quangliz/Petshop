"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/types";
import { AdminTableRowsSkeleton } from "@/components/skeletons/AdminSkeletons";

type AdminUser = User & { is_active: boolean; created_at: string };

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/admin/users?limit=200");
      return res.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/users/${id}/toggle-active`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: { response?: { data?: { detail?: string } } }) => alert(e.response?.data?.detail ?? "Lỗi"),
  });

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 500 }}>
          <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left px-4 py-3">Người dùng</th>
              <th className="text-center px-4 py-3">Vai trò</th>
              <th className="text-center px-4 py-3">Trạng thái</th>
              <th className="text-center px-4 py-3">Ngày tạo</th>
              <th className="text-center px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <AdminTableRowsSkeleton columns={5} rows={6} imageColumn={false} />}
            {data?.items?.map((u: AdminUser) => (
              <tr key={u.id} className={`transition-colors hover:bg-gray-50 ${!u.is_active ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {u.role === "admin" ? "Admin" : "User"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {u.is_active ? "Hoạt động" : "Đã khoá"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {new Date(u.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.role !== "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={u.is_active ? "text-red-500 hover:bg-red-50 border-red-200" : "text-green-600 hover:bg-green-50 border-green-200"}
                      onClick={() => {
                        const action = u.is_active ? "khoá" : "mở khoá";
                        if (confirm(`Bạn muốn ${action} tài khoản ${u.email}?`)) toggleMutation.mutate(u.id);
                      }}
                      disabled={toggleMutation.isPending}
                    >
                      {u.is_active ? <ShieldOff className="w-3.5 h-3.5 mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                      {u.is_active ? "Khoá" : "Mở khoá"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <div className="px-4 py-3 text-xs text-gray-400 border-t">Tổng: {data.total} người dùng</div>}
      </div>
    </div>
  );
}
