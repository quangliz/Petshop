"use client";
import React, { useState, useEffect } from 'react';

interface Province { code: number; name: string; }
interface District { code: number; name: string; }
interface Ward { code: number; name: string; }

const selectCls = "w-full px-4 py-3 rounded-[12px] border-[1.5px] border-neutral-200 outline-none bg-white text-[14px] focus:border-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const labelCls = "block text-[12px] font-semibold text-neutral-500 mb-1";

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

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Tỉnh / Thành phố</label>
          <select className={selectCls} value={province} onChange={handleProvinceChange}>
            <option value="">-- Chọn --</option>
            {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Quận / Huyện</label>
          <select className={selectCls} value={district} onChange={handleDistrictChange} disabled={!districts.length}>
            <option value="">-- Chọn --</option>
            {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Phường / Xã</label>
          <select className={selectCls} value={ward} onChange={e => setWard(e.target.value)} disabled={!wards.length}>
            <option value="">-- Chọn --</option>
            {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
          </select>
        </div>
      </div>
      <input
        className={selectCls}
        placeholder="Số nhà, tên đường..."
        value={street}
        onChange={e => setStreet(e.target.value)}
      />
      {value && (
        <div className="text-[12px] text-neutral-400 px-2.5 py-1.5 bg-neutral-50 rounded-[8px]">
          Địa chỉ: {value}
        </div>
      )}
    </div>
  );
}
