// Shop listing screen

const FilterGroup = ({ title, children }) => (
  <div style={{ padding: '16px 0', borderBottom: '1px solid var(--neutral-100)' }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-800)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{title}</div>
    {children}
  </div>
);

const Checkbox = ({ label, count, checked, onChange, icon }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: 13, color: 'var(--neutral-700)' }}>
    <span style={{
      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
      background: checked ? 'var(--primary-500)' : 'white',
      border: checked ? 'none' : '1.5px solid var(--neutral-300)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
    }}>
      {checked && <Icon name="check" size={12} stroke={3} />}
    </span>
    {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
    <span style={{ flex: 1 }}>{label}</span>
    {count != null && <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontFamily: 'var(--font-mono)' }}>{count}</span>}
  </label>
);

const FilterSidebar = () => {
  const [cats, setCats] = useState(['food']);
  const [species, setSpecies] = useState(['cat']);
  const [brands, setBrands] = useState(['Royal Canin']);
  const [priceRange, setPriceRange] = useState([95, 420]);

  const toggle = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  return (
    <aside style={{ width: 260, flexShrink: 0 }}>
      <div className="card" style={{ padding: '4px 20px 20px', position: 'sticky', top: 84 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="filter" size={14} /> Bộ lọc
          </div>
          <button style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary-600)' }}>Xoá tất cả</button>
        </div>

        <FilterGroup title="Danh mục">
          {CATEGORIES.slice(0, 5).map(c => (
            <Checkbox key={c.id} label={c.name} count={c.count} icon={c.emoji}
              checked={cats.includes(c.id)} onChange={() => toggle(cats, setCats, c.id)} />
          ))}
        </FilterGroup>

        <FilterGroup title="Loài">
          {SPECIES.slice(0, 4).map(s => (
            <Checkbox key={s.id} label={s.name} icon={s.emoji}
              checked={species.includes(s.id)} onChange={() => toggle(species, setSpecies, s.id)} />
          ))}
        </FilterGroup>

        <FilterGroup title="Thương hiệu">
          {BRANDS.slice(0, 6).map(b => (
            <Checkbox key={b} label={b}
              checked={brands.includes(b)} onChange={() => toggle(brands, setBrands, b)} />
          ))}
          <button style={{ fontSize: 12, color: 'var(--primary-600)', fontWeight: 600, padding: '4px 0' }}>+ Xem thêm</button>
        </FilterGroup>

        <FilterGroup title="Khoảng giá">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <span>{priceRange[0]}K₫</span>
            <span>{priceRange[1]}K₫</span>
          </div>
          <div style={{ position: 'relative', height: 4, background: 'var(--neutral-100)', borderRadius: 2, margin: '10px 0' }}>
            <div style={{ position: 'absolute', left: `${(priceRange[0]/500)*100}%`, right: `${100 - (priceRange[1]/500)*100}%`, top: 0, bottom: 0, background: 'var(--primary-500)', borderRadius: 2 }} />
            <div style={{ position: 'absolute', left: `${(priceRange[0]/500)*100}%`, top: -6, width: 16, height: 16, borderRadius: 8, background: 'white', border: '2px solid var(--primary-500)', transform: 'translateX(-50%)', boxShadow: 'var(--shadow-sm)', cursor: 'grab' }} />
            <div style={{ position: 'absolute', left: `${(priceRange[1]/500)*100}%`, top: -6, width: 16, height: 16, borderRadius: 8, background: 'white', border: '2px solid var(--primary-500)', transform: 'translateX(-50%)', boxShadow: 'var(--shadow-sm)', cursor: 'grab' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <div style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--neutral-200)', borderRadius: 8, fontSize: 12 }}>95.000₫</div>
            <div style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--neutral-200)', borderRadius: 8, fontSize: 12 }}>420.000₫</div>
          </div>
        </FilterGroup>

        <FilterGroup title="Đánh giá">
          {[5, 4, 3].map(r => (
            <Checkbox key={r} checked={r === 4}
              label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Rating value={r} showValue={false} size={10} /> trở lên</span>} />
          ))}
        </FilterGroup>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>Áp dụng (120)</button>
        </div>
      </div>
    </aside>
  );
};

const ShopScreen = () => {
  const [sort, setSort] = useState('popular');
  const [view, setView] = useState('grid');

  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Trang chủ</span> <Icon name="arrowR" size={12} />
        <span>Cửa hàng</span> <Icon name="arrowR" size={12} />
        <span style={{ color: 'var(--neutral-800)', fontWeight: 600 }}>Thức ăn cho mèo</span>
      </div>

      {/* Hero / title */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Thức ăn cho mèo</h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '6px 0 0' }}>Hạt khô, pate, snack — từ mèo con tới mèo già. Tìm thấy <b style={{ color: 'var(--neutral-900)' }}>120 sản phẩm</b>.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', padding: 3, background: 'white', borderRadius: 9, border: '1px solid var(--neutral-200)' }}>
            {['grid', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 10px', borderRadius: 6,
                background: view === v ? 'var(--neutral-100)' : 'transparent',
                color: view === v ? 'var(--neutral-800)' : 'var(--neutral-500)',
              }}>
                <Icon name={v === 'grid' ? 'panel' : 'menu'} size={14} />
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <select value={sort} onChange={e => setSort(e.target.value)} style={{
              appearance: 'none', padding: '9px 32px 9px 14px', border: '1px solid var(--neutral-200)',
              borderRadius: 9, background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <option value="popular">Phổ biến nhất</option>
              <option value="new">Mới nhất</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
              <option value="rating">Đánh giá tốt</option>
            </select>
            <Icon name="arrowR" size={12} />
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {[
          { l: 'Thức ăn', icon: '🍖' },
          { l: 'Mèo', icon: '🐈' },
          { l: 'Royal Canin' },
          { l: '95K – 420K₫' },
        ].map((f, i) => (
          <div key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 12px',
            background: 'white', border: '1px solid var(--neutral-200)', borderRadius: 999,
            fontSize: 12, fontWeight: 500, color: 'var(--neutral-700)',
          }}>
            {f.icon && <span>{f.icon}</span>}
            {f.l}
            <button style={{ color: 'var(--neutral-400)', display: 'inline-flex' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l8 8M10 2l-8 8"/></svg>
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
        <FilterSidebar />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {[...PRODUCTS, ...PRODUCTS].slice(0, 12).map((p, i) => <ProductCard key={i} product={p} />)}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 40 }}>
            <button className="btn btn-outline btn-sm"><Icon name="arrowL" size={14} /></button>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} style={{
                width: 36, height: 36, borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: n === 1 ? 'var(--neutral-900)' : 'white',
                color: n === 1 ? 'white' : 'var(--neutral-700)',
                border: n === 1 ? 'none' : '1px solid var(--neutral-200)',
              }}>{n}</button>
            ))}
            <span style={{ padding: '0 8px', color: 'var(--neutral-500)' }}>…</span>
            <button style={{ width: 36, height: 36, borderRadius: 9, background: 'white', border: '1px solid var(--neutral-200)', fontSize: 13 }}>10</button>
            <button className="btn btn-outline btn-sm"><Icon name="arrowR" size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ShopScreen });
