"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { TrendingUp, ShoppingCart, Users, DollarSign } from "lucide-react";

function KPICard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${color} flex items-center gap-4`}>
      <div className={`p-3 rounded-full bg-opacity-10 ${color.replace("border-", "bg-")}`}>
        <Icon className="w-6 h-6 text-gray-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await api.get("/admin/stats");
      return res.data;
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Đang tải tổng quan...</div>;

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M đ`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(0)}K đ`
      : `${n.toLocaleString()} đ`;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Doanh thu hôm nay" value={fmt(stats.today_revenue)} icon={TrendingUp} color="border-orange-500" />
        <KPICard title="Tổng doanh thu" value={fmt(stats.total_revenue)} icon={DollarSign} color="border-green-500" />
        <KPICard title="Đơn mới hôm nay" value={`${stats.new_orders_today}`} icon={ShoppingCart} color="border-blue-500" />
        <KPICard title="User mới hôm nay" value={`${stats.new_users_today} / ${stats.total_users}`} icon={Users} color="border-purple-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Revenue Line Chart */}
        <div className="xl:col-span-3 bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Doanh thu 30 ngày gần nhất</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.revenue_chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} đ`, "Doanh thu"]} labelFormatter={(l) => `Ngày ${l}`} />
              <Line type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products Bar Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Top 5 sản phẩm bán chạy</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.top_products} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip />
              <Bar dataKey="total_sold" fill="#ea580c" radius={[0, 4, 4, 0]} name="Đã bán" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
