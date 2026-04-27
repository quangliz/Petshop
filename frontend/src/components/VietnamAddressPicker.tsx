"use client";
import React, { useState, useEffect } from 'react';

interface Province { code: number; name: string; }
interface District { code: number; name: string; }
interface Ward { code: number; name: string; }

export function VietnamAddressPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [street, setStreet] = useState(() => value || '');

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(r => r.json()).then(setProvinces);
  }, []);

  useEffect(() => {
    if (!province) return;
    fetch(`https://provinces.open-api.vn/api/p/${province}?depth=2`)
      .then(r => r.json()).then(d => setDistricts(d.districts || []));
  }, [province]);

  useEffect(() => {
    if (!district) return;
    fetch(`https://provinces.open-api.vn/api/d/${district}?depth=2`)
      .then(r => r.json()).then(d => setWards(d.wards || []));
  }, [district]);

  useEffect(() => {
    const pName = provinces.find(p => String(p.code) === province)?.name || '';
    const dName = districts.find(d => String(d.code) === district)?.name || '';
    const wName = wards.find(w => String(w.code) === ward)?.name || '';
    const parts = [street, wName, dName, pName].filter(Boolean);
    onChange(parts.join(', '));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [street, province, district, ward, provinces, districts, wards]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProvince(e.target.value);
    setDistricts([]);
    setDistrict('');
    setWards([]);
    setWard('');
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDistrict(e.target.value);
    setWards([]);
    setWard('');
  };

  const sel: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    border: '1.5px solid var(--neutral-200)', outline: 'none', background: 'white', fontSize: 14
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--neutral-500)', marginBottom: 4 }}>Tỉnh / Thành phố</label>
          <select style={sel} value={province} onChange={handleProvinceChange}>
            <option value="">-- Chọn --</option>
            {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--neutral-500)', marginBottom: 4 }}>Quận / Huyện</label>
          <select style={sel} value={district} onChange={handleDistrictChange} disabled={!districts.length}>
            <option value="">-- Chọn --</option>
            {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--neutral-500)', marginBottom: 4 }}>Phường / Xã</label>
          <select style={sel} value={ward} onChange={e => setWard(e.target.value)} disabled={!wards.length}>
            <option value="">-- Chọn --</option>
            {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
          </select>
        </div>
      </div>
      <input
        style={sel}
        placeholder="Số nhà, tên đường..."
        value={street}
        onChange={e => setStreet(e.target.value)}
      />
      {value && (
        <div style={{ fontSize: 12, color: 'var(--neutral-400)', padding: '6px 10px', background: 'var(--neutral-50)', borderRadius: 8 }}>
          Địa chỉ: {value}
        </div>
      )}
    </div>
  );
}
