"use client";
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  User as UserIcon, Plus, Trash2, Heart, Sparkles, ShieldCheck, Pencil
} from 'lucide-react';

const NavItem = ({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12,
    background: active ? 'var(--primary-50)' : 'transparent',
    color: active ? 'var(--primary-700)' : 'var(--neutral-600)',
    fontWeight: active ? 700 : 500, fontSize: 14, cursor: 'pointer', transition: 'all 120ms ease'
  }}>
    {icon} {label}
  </div>
);

const PetCard = ({ pet, onDelete, onEdit }: { pet: any, onDelete: any, onEdit: any }) => {
  const speciesColors: any = {
    dog: 'oklch(0.95 0.05 55)',
    cat: 'oklch(0.93 0.06 195)',
    bird: 'oklch(0.96 0.04 85)',
    other: 'var(--neutral-100)'
  };
  const emoji: any = { dog: '🐶', cat: '🐱', bird: '🦜', other: '🐾' };

  return (
    <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 120, background: speciesColors[pet.species] || speciesColors.other, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
        {pet.avatar_url ? <img src={pet.avatar_url} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : emoji[pet.species] || emoji.other}
        <button
          onClick={() => onEdit(pet)}
          style={{ position: 'absolute', top: 12, right: 48, width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-700)' }}
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => { if(confirm("Xoá hồ sơ này?")) onDelete(pet.id) }}
          style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{pet.name}</h3>
          <div style={{ fontSize: 13, color: 'var(--neutral-500)', fontWeight: 500 }}>{pet.breed || pet.species} · {pet.age_months ? `${pet.age_months} tháng` : 'Chưa rõ tuổi'}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ padding: '8px 12px', background: 'var(--neutral-50)', borderRadius: 10, fontSize: 12 }}>
            <div style={{ color: 'var(--neutral-400)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Cân nặng</div>
            <div style={{ fontWeight: 700 }}>{pet.weight_kg || '?'} kg</div>
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--neutral-50)', borderRadius: 10, fontSize: 12 }}>
            <div style={{ color: 'var(--neutral-400)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Giới tính</div>
            <div style={{ fontWeight: 700 }}>{pet.gender === 'male' ? 'Đực' : pet.gender === 'female' ? 'Cái' : 'Chưa rõ'}</div>
          </div>
        </div>
        {pet.allergies && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 10, fontSize: 12, display: 'flex', gap: 8 }}>
             <ShieldCheck size={14} /> <strong>Dị ứng:</strong> {pet.allergies}
          </div>
        )}
        <button className="btn btn-teal btn-sm" style={{ width: '100%', borderRadius: 10, marginTop: 4 }}>
          <Sparkles size={14} /> Chat AI về {pet.name}
        </button>
      </div>
    </div>
  );
};

export default function GeneralProfilePage() {
  const { user, setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', address: '' });
  const [petFormVisible, setPetFormVisible] = useState(false);
  const [editingPet, setEditingPet] = useState<any>(null);
  const [petFormData, setPetFormData] = useState({ name: '', species: 'dog', breed: '', age_months: '', weight_kg: '', gender: 'unknown', health_notes: '', allergies: '' });
  const [file, setFile] = useState<File | null>(null);
  
  useEffect(() => {
     if (user) {
        setProfileForm({ full_name: user.full_name || '', phone: user.phone || '', address: user.address || '' });
     }
  }, [user]);

  const updateProfileMutation = useMutation({
     mutationFn: async (data: any) => {
         const res = await api.put('/auth/me', data);
         return res.data;
     },
     onSuccess: (updatedUser) => {
         const token = localStorage.getItem('token');
         if (token) setAuth(updatedUser, token);
         alert("Đã cập nhật thông tin thành công!");
     }
  });

  const { data: pets } = useQuery({
    queryKey: ['pets'],
    queryFn: async () => {
      const res = await api.get('/pets');
      return res.data;
    },
    enabled: !!user,
  });

  const createPet = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/pets', data);
      return res.data;
    },
    onSuccess: async (newPet) => {
      if (file) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        await api.post(`/pets/${newPet.id}/avatar`, formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setPetFormVisible(false);
      setFile(null);
      setPetFormData({ name: '', species: 'dog', breed: '', age_months: '', weight_kg: '', gender: 'unknown', health_notes: '', allergies: '' });
    }
  });

  const updatePet = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/pets/${id}`, data);
      return res.data;
    },
    onSuccess: async (updatedPet) => {
      if (file) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        await api.post(`/pets/${updatedPet.id}/avatar`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setEditingPet(null);
      setPetFormVisible(false);
      setFile(null);
      setPetFormData({ name: '', species: 'dog', breed: '', age_months: '', weight_kg: '', gender: 'unknown', health_notes: '', allergies: '' });
    }
  });

  const deletePet = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/pets/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pets'] }); }
  });

  if (!user) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--neutral-500)' }}>Vui lòng đăng nhập để xem hồ sơ.</div>;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 md:gap-12">
      {/* Sidebar Nav */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>{user.full_name.charAt(0)}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{user.full_name}</span>
            <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>{user.email}</span>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavItem icon={<UserIcon size={18}/>} label="Thông tin tài khoản" active />
          <NavItem icon={<Heart size={18}/>} label="Thú cưng của tôi" />
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {/* Account Section */}
        <section style={{ padding: 32, borderRadius: 24, border: '1px solid var(--neutral-100)', background: 'white' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Thông tin tài khoản</h2>
          <form onSubmit={(e) => { e.preventDefault(); updateProfileMutation.mutate(profileForm); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Họ và tên</label>
              <input style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Số điện thoại</label>
              <input style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
            </div>
            <div className="sm:col-span-2">
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Địa chỉ giao hàng</label>
              <input style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
            </div>
            <div className="sm:col-span-2 flex justify-end mt-2 md:mt-4">
              <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={updateProfileMutation.isPending}>{updateProfileMutation.isPending ? "Đang lưu..." : "Cập nhật tài khoản"}</button>
            </div>
          </form>
        </section>

        {/* Pets Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Hồ sơ thú cưng</h2>
              <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginTop: 4 }}>Quản lý thông tin sức khoẻ và dinh dưỡng của các bé</p>
            </div>
            <button className="btn btn-primary" onClick={() => setPetFormVisible(true)}><Plus size={18}/> Thêm bé mới</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {pets?.map((pet: any) => (
              <PetCard key={pet.id} pet={pet} onDelete={deletePet.mutate} onEdit={(p: any) => {
                setEditingPet(p);
                setPetFormData({ name: p.name, species: p.species, breed: p.breed || '', age_months: p.age_months ? String(p.age_months) : '', weight_kg: p.weight_kg ? String(p.weight_kg) : '', gender: p.gender, health_notes: p.health_notes || '', allergies: p.allergies || '' });
                setPetFormVisible(true);
              }} />
            ))}
            <div 
              onClick={() => setPetFormVisible(true)}
              style={{
                borderRadius: 20, border: '2px dashed var(--neutral-200)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40, cursor: 'pointer',
                color: 'var(--neutral-400)', transition: 'all 120ms ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-300)'; e.currentTarget.style.color = 'var(--primary-500)'; e.currentTarget.style.background = 'var(--primary-25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--neutral-200)'; e.currentTarget.style.color = 'var(--neutral-400)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 24, background: 'currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Plus size={24} />
              </div>
              <span style={{ fontWeight: 600 }}>Thêm hồ sơ bé mới</span>
            </div>
          </div>
        </section>

        {/* Pet Form Modal-ish */}
        {petFormVisible && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26, 24, 20, 0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: 32 }}>
              <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{editingPet ? 'Chỉnh sửa hồ sơ' : 'Mở hồ sơ y tế mới'}</h3>
              <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 24 }}>Điền thông tin để AI có thể tư vấn chính xác nhất cho bé</p>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (editingPet) {
                  updatePet.mutate({ id: editingPet.id, data: petFormData });
                } else {
                  createPet.mutate(petFormData);
                }
              }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                <div className="sm:col-span-2">
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Tên thú cưng *</label>
                  <input required style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={petFormData.name} onChange={e => setPetFormData({...petFormData, name: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Loài *</label>
                  <select style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none', background: 'white' }} value={petFormData.species} onChange={e => setPetFormData({...petFormData, species: e.target.value})}>
                    <option value="dog">Chó</option><option value="cat">Mèo</option><option value="bird">Chim</option><option value="other">Khác</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Giống</label>
                  <input style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} placeholder="Poodle, Golden..." value={petFormData.breed} onChange={e => setPetFormData({...petFormData, breed: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Tuổi (tháng)</label>
                  <input type="number" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={petFormData.age_months} onChange={e => setPetFormData({...petFormData, age_months: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Cân nặng (kg)</label>
                  <input type="number" step="0.1" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={petFormData.weight_kg} onChange={e => setPetFormData({...petFormData, weight_kg: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Dị ứng (quan trọng)</label>
                  <input placeholder="VD: Dị ứng thịt gà, dị ứng sữa..." style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--neutral-200)', outline: 'none' }} value={petFormData.allergies} onChange={e => setPetFormData({...petFormData, allergies: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Ảnh thú cưng</label>
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: '8px 0', fontSize: 13 }} />
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3 mt-3">
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setPetFormVisible(false); setEditingPet(null); setFile(null); setPetFormData({ name: '', species: 'dog', breed: '', age_months: '', weight_kg: '', gender: 'unknown', health_notes: '', allergies: '' }); }}>Huỷ bỏ</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={createPet.isPending || updatePet.isPending}>{(createPet.isPending || updatePet.isPending) ? "Đang lưu..." : "Lưu hồ sơ"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
