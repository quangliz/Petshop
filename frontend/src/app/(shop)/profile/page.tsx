"use client";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Plus, Trash2, ShieldCheck, Pencil } from 'lucide-react';
import Image from 'next/image';
import { User, Pet } from '@/lib/types';
import { VietnamAddressPicker } from '@/components/VietnamAddressPicker';

const inputCls = "w-full px-4 py-3 rounded-[12px] border-[1.5px] border-neutral-200 outline-none text-[14px]";
const labelCls = "block text-[13px] font-bold mb-2";

const PetCard = ({ pet, onDelete, onEdit }: { pet: Pet, onDelete: (id: string) => void, onEdit: (pet: Pet) => void }) => {
  const speciesColors: Record<string, string> = {
    dog: 'oklch(0.95 0.05 55)',
    cat: 'oklch(0.93 0.06 195)',
    bird: 'oklch(0.96 0.04 85)',
    other: 'var(--neutral-100)'
  };
  const emoji: Record<string, string> = { dog: '🐶', cat: '🐱', bird: '🦜', other: '🐾' };

  return (
    <div className="bg-white border border-neutral-100 rounded-[20px] shadow-sm overflow-hidden flex flex-col">
      <div
        className="relative flex items-center justify-center text-[56px]"
        style={{ aspectRatio: '1 / 1', background: speciesColors[pet.species] || speciesColors.other }}
      >
        {pet.avatar_url ? (
          <Image src={pet.avatar_url} alt={pet.name} fill sizes="120px" className="object-cover" />
        ) : emoji[pet.species] || emoji.other}
        <button
          onClick={() => onEdit(pet)}
          className="absolute top-3 right-12 w-8 h-8 rounded-2xl bg-white/80 border-none cursor-pointer flex items-center justify-center text-neutral-700 hover:bg-white transition-colors"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => { if (confirm("Xoá hồ sơ này?")) onDelete(pet.id) }}
          className="absolute top-3 right-3 w-8 h-8 rounded-2xl bg-white/80 border-none cursor-pointer flex items-center justify-center hover:bg-white transition-colors"
          style={{ color: 'var(--danger)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="p-5 flex flex-col gap-3">
        <div>
          <h3 className="text-[20px] font-extrabold m-0">{pet.name}</h3>
          <div className="text-[13px] text-neutral-500 font-medium">{pet.breed || pet.species} · {pet.age_months ? `${pet.age_months} tháng` : 'Chưa rõ tuổi'}</div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="px-3 py-2 bg-neutral-50 rounded-[10px] text-[12px]">
            <div className="text-neutral-400 font-semibold text-[10px] uppercase">Cân nặng</div>
            <div className="font-bold">{pet.weight_kg || '?'} kg</div>
          </div>
          <div className="px-3 py-2 bg-neutral-50 rounded-[10px] text-[12px]">
            <div className="text-neutral-400 font-semibold text-[10px] uppercase">Giới tính</div>
            <div className="font-bold">{pet.gender === 'male' ? 'Đực' : pet.gender === 'female' ? 'Cái' : 'Chưa rõ'}</div>
          </div>
        </div>
        {pet.allergies && (
          <div className="px-3 py-2 rounded-[10px] text-[12px] flex gap-2 items-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <ShieldCheck size={14} /> <strong>Dị ứng:</strong> {pet.allergies}
          </div>
        )}
      </div>
    </div>
  );
};

export default function GeneralProfilePage() {
  const { user, setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  const [profileForm, setProfileForm] = useState(() => ({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || ''
  }));
  const [petFormVisible, setPetFormVisible] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [petFormData, setPetFormData] = useState({ name: '', species: 'dog', breed: '', age_months: '', weight_kg: '', gender: 'unknown', health_notes: '', allergies: '' });
  const [file, setFile] = useState<File | null>(null);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => { const res = await api.put('/auth/me', data); return res.data; },
    onSuccess: (updatedUser) => { const token = localStorage.getItem('token'); if (token) setAuth(updatedUser, token); alert("Đã cập nhật thông tin thành công!"); }
  });

  const { data: pets } = useQuery({
    queryKey: ['pets'],
    queryFn: async () => { const res = await api.get('/pets/'); return res.data; },
    enabled: !!user,
  });

  const createPet = useMutation({
    mutationFn: async (data: Partial<Pet>) => { const res = await api.post('/pets/', data); return res.data; },
    onSuccess: async (newPet) => {
      if (file) { const fd = new FormData(); fd.append("file", file); await api.post(`/pets/${newPet.id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setPetFormVisible(false); setFile(null);
      setPetFormData({ name: '', species: 'dog', breed: '', age_months: '', weight_kg: '', gender: 'unknown', health_notes: '', allergies: '' });
    }
  });

  const updatePet = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pet> }) => { const res = await api.put(`/pets/${id}`, data); return res.data; },
    onSuccess: async (updatedPet) => {
      if (file) { const fd = new FormData(); fd.append("file", file); await api.post(`/pets/${updatedPet.id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); }
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setEditingPet(null); setPetFormVisible(false); setFile(null);
      setPetFormData({ name: '', species: 'dog', breed: '', age_months: '', weight_kg: '', gender: 'unknown', health_notes: '', allergies: '' });
    }
  });

  const deletePet = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/pets/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pets'] }); }
  });

  if (!user) return <div className="py-[100px] text-center text-neutral-500">Vui lòng đăng nhập để xem hồ sơ.</div>;

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <main className="flex flex-col gap-10">
        {/* Account Section */}
        <section className="p-8 rounded-[24px] border border-neutral-100 bg-white">
          <h2 className="text-[24px] font-extrabold mb-6">Thông tin tài khoản</h2>
          <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileForm); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className={labelCls}>Họ và tên</label>
              <input className={inputCls} value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Số điện thoại</label>
              <input className={inputCls} value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Địa chỉ giao hàng</label>
              <VietnamAddressPicker value={profileForm.address} onChange={v => setProfileForm({ ...profileForm, address: v })} />
            </div>
            <div className="sm:col-span-2 flex justify-end mt-2 md:mt-4">
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full sm:w-auto h-11 px-6 rounded-[12px] font-semibold text-[14px] text-white transition-opacity disabled:opacity-70"
                style={{ background: 'var(--primary-600)' }}
              >
                {updateProfileMutation.isPending ? "Đang lưu..." : "Cập nhật tài khoản"}
              </button>
            </div>
          </form>
        </section>

        {/* Pets Section */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-[28px] font-extrabold tracking-[-0.025em] m-0">Hồ sơ thú cưng</h2>
              <p className="text-[14px] text-neutral-500 mt-1">Quản lý thông tin sức khoẻ và dinh dưỡng của các bé</p>
            </div>
            <button
              className="h-10 px-4 rounded-[12px] text-[14px] font-semibold text-white flex items-center gap-1.5 transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary-600)' }}
              onClick={() => setPetFormVisible(true)}
            >
              <Plus size={18} /> Thêm bé mới
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {pets?.map((pet: Pet) => (
              <PetCard key={pet.id} pet={pet} onDelete={(id) => deletePet.mutate(id)} onEdit={(p: Pet) => {
                setEditingPet(p);
                setPetFormData({ name: p.name, species: p.species, breed: p.breed || '', age_months: p.age_months ? String(p.age_months) : '', weight_kg: p.weight_kg ? String(p.weight_kg) : '', gender: p.gender || 'unknown', health_notes: p.health_notes || '', allergies: p.allergies || '' });
                setPetFormVisible(true);
              }} />
            ))}
            <div
              onClick={() => setPetFormVisible(true)}
              className="rounded-[20px] border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-3 p-10 cursor-pointer text-neutral-400 transition-all duration-[120ms] hover:border-[var(--primary-300)] hover:text-[var(--primary-500)] hover:bg-[var(--primary-25)]"
            >
              <div className="w-12 h-12 rounded-full bg-current flex items-center justify-center text-white">
                <Plus size={24} />
              </div>
              <span className="font-semibold">Thêm hồ sơ bé mới</span>
            </div>
          </div>
        </section>

        {/* Pet Form Modal */}
        {petFormVisible && (
          <div className="fixed inset-0 bg-[rgba(26,24,20,0.4)] backdrop-blur-[4px] z-[100] flex items-center justify-center p-6">
            <div className="bg-white border border-neutral-100 rounded-[20px] shadow-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto p-8">
              <h3 className="text-[24px] font-extrabold mb-2">{editingPet ? 'Chỉnh sửa hồ sơ' : 'Mở hồ sơ y tế mới'}</h3>
              <p className="text-[14px] text-neutral-500 mb-6">Điền thông tin để AI có thể tư vấn chính xác nhất cho bé</p>

              <form onSubmit={(e) => {
                e.preventDefault();
                const payload = { ...petFormData, age_months: petFormData.age_months ? Number(petFormData.age_months) : undefined, weight_kg: petFormData.weight_kg ? Number(petFormData.weight_kg) : undefined };
                if (editingPet) { updatePet.mutate({ id: editingPet.id, data: payload }); } else { createPet.mutate(payload); }
              }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Tên thú cưng *</label>
                  <input required className={inputCls} value={petFormData.name} onChange={e => setPetFormData({ ...petFormData, name: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Loài *</label>
                  <select className={`${inputCls} bg-white`} value={petFormData.species} onChange={e => setPetFormData({ ...petFormData, species: e.target.value })}>
                    <option value="dog">Chó</option><option value="cat">Mèo</option><option value="bird">Chim</option><option value="other">Khác</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Giống</label>
                  <input className={inputCls} placeholder="Poodle, Golden..." value={petFormData.breed} onChange={e => setPetFormData({ ...petFormData, breed: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Tuổi (tháng)</label>
                  <input type="number" className={inputCls} value={petFormData.age_months} onChange={e => setPetFormData({ ...petFormData, age_months: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Cân nặng (kg)</label>
                  <input type="number" step="0.1" className={inputCls} value={petFormData.weight_kg} onChange={e => setPetFormData({ ...petFormData, weight_kg: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Dị ứng (quan trọng)</label>
                  <input placeholder="VD: Dị ứng thịt gà, dị ứng sữa..." className={inputCls} value={petFormData.allergies} onChange={e => setPetFormData({ ...petFormData, allergies: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Ảnh thú cưng</label>
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full py-2 text-[13px]" />
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3 mt-3">
                  <button type="button" onClick={() => { setPetFormVisible(false); setEditingPet(null); setFile(null); setPetFormData({ name: '', species: 'dog', breed: '', age_months: '', weight_kg: '', gender: 'unknown', health_notes: '', allergies: '' }); }}
                    className="flex-1 h-11 rounded-[12px] border-[1.5px] border-neutral-200 bg-white text-neutral-700 text-[14px] font-semibold cursor-pointer hover:bg-neutral-50 transition-colors">
                    Huỷ bỏ
                  </button>
                  <button type="submit" disabled={createPet.isPending || updatePet.isPending}
                    className="flex-[2] h-11 rounded-[12px] text-white text-[14px] font-semibold disabled:opacity-70"
                    style={{ background: 'var(--primary-600)' }}>
                    {(createPet.isPending || updatePet.isPending) ? "Đang lưu..." : "Lưu hồ sơ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
