// Shared primitives: icons, product placeholder, ProductCard, etc.

const Icon = ({ name, size = 18, stroke = 1.8 }) => {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    cart: <><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2.5L7 14h12l2-8H6"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>,
    chat: <><path d="M21 12a8 8 0 1 1-2.3-5.6L21 5v4.5h-4.5"/></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
    x: <><path d="M18 6 6 18M6 6l18 12" transform="scale(0.67 0.67) translate(3 3)"/><path d="m18 6-12 12M6 6l12 12"/></>,
    star: <><polygon points="12 2 15 9 22 10 17 15 18 22 12 18 6 22 7 15 2 10 9 9"/></>,
    starF: <><polygon points="12 2 15 9 22 10 17 15 18 22 12 18 6 22 7 15 2 10 9 9" fill="currentColor" stroke="none"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    minus: <><path d="M5 12h14"/></>,
    arrowR: <><path d="M5 12h14m-5-5 5 5-5 5"/></>,
    arrowL: <><path d="M19 12H5m5-5-5 5 5 5"/></>,
    sparkles: <><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="3"/></>,
    send: <><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></>,
    filter: <><path d="M3 5h18M6 12h12M10 19h4"/></>,
    heart: <><path d="M12 21s-8-5-8-12a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 7-8 12-8 12z"/></>,
    check: <><path d="M4 12l5 5L20 6"/></>,
    edit: <><path d="M16 3l5 5-11 11H5v-5z"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m-9 0v14h10V6"/></>,
    box: <><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v10"/></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></>,
    home: <><path d="M3 11 12 3l9 8v10h-6v-7H9v7H3z"/></>,
    shop: <><path d="M3 8h18l-1.5 12h-15zM8 8V5a4 4 0 0 1 8 0v3"/></>,
    paw: <><circle cx="6" cy="10" r="2"/><circle cx="10" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="18" cy="10" r="2"/><path d="M7 19c0-3 2.2-5 5-5s5 2 5 5c0 1.5-1 2-2.5 2h-5C8 21 7 20.5 7 19z"/></>,
    sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    tool: <><path d="M14 6l4 4M6 14l-3 3 3 3 3-3M18 3l3 3-9 9-3-3z"/></>,
    source: <><path d="M12 20h9M4 4l6 6L4 16M11 10l3 3"/></>,
    truck: <><rect x="1" y="6" width="14" height="11"/><path d="M15 9h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="1.5"/><circle cx="17.5" cy="18.5" r="1.5"/></>,
    shield: <><path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/></>,
    dot: <><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></>,
    panel: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
  };
  return <svg {...props}>{paths[name]}</svg>;
};

// Striped product placeholder
const ProductImg = ({ label = 'Product', style = {}, tone = 'warm', children }) => {
  const tones = {
    warm: { a: 'oklch(0.94 0.04 55)', b: 'oklch(0.97 0.02 55)', ink: 'oklch(0.55 0.1 50)' },
    cool: { a: 'oklch(0.94 0.03 195)', b: 'oklch(0.97 0.015 195)', ink: 'oklch(0.55 0.08 195)' },
    neutral: { a: 'var(--neutral-100)', b: 'var(--neutral-50)', ink: 'var(--neutral-500)' },
  };
  const t = tones[tone] || tones.warm;
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      backgroundImage: `repeating-linear-gradient(45deg, ${t.a}, ${t.a} 8px, ${t.b} 8px, ${t.b} 16px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', ...style,
    }}>
      <div style={{
        position: 'absolute', inset: '14% 14% auto 14%', bottom: '14%',
        border: `1.5px dashed ${t.ink}`, opacity: 0.25, borderRadius: 8,
      }} />
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
        color: t.ink, textTransform: 'uppercase', textAlign: 'center',
        background: 'rgba(255,255,255,0.85)', padding: '4px 8px', borderRadius: 4,
        position: 'relative', zIndex: 1,
      }}>{label}</div>
      {children}
    </div>
  );
};

// Rating stars
const Rating = ({ value, size = 12, showValue = true, count }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: size, color: 'var(--neutral-600)' }}>
      <div style={{ color: 'oklch(0.75 0.15 75)', display: 'inline-flex' }}>
        {[0,1,2,3,4].map(i => (
          <Icon key={i} name={i < Math.round(value) ? 'starF' : 'star'} size={size + 2} stroke={1.5} />
        ))}
      </div>
      {showValue && <span style={{ fontWeight: 600, color: 'var(--neutral-700)', fontSize: size }}>{value}</span>}
      {count != null && <span style={{ color: 'var(--neutral-500)', fontSize: size }}>({count})</span>}
    </div>
  );
};

// Product card
const ProductCard = ({ product, compact = false, onClick, onAdd }) => {
  const sale = product.originalPrice && product.originalPrice > product.price;
  const discount = sale ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const spc = product.species?.[0];
  const speciesMeta = SPECIES.find(s => s.id === spc);

  return (
    <div className="card" onClick={onClick} style={{
      cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'transform 160ms ease, box-shadow 160ms ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--neutral-50)' }}>
        <ProductImg label={product.label} />
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sale && <span className="badge badge-sale">-{discount}%</span>}
          {product.badge === 'new' && <span className="badge badge-new">Mới</span>}
          {product.badge === 'bestseller' && <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>Bán chạy</span>}
        </div>
        {speciesMeta && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <span className="badge badge-species">{speciesMeta.emoji} {speciesMeta.name}</span>
          </div>
        )}
      </div>
      <div style={{ padding: compact ? '12px 14px 14px' : '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.brand}</div>
        <div style={{
          fontSize: compact ? 13 : 14, fontWeight: 600, color: 'var(--neutral-800)', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: compact ? 34 : 38,
        }}>{product.name}</div>
        <Rating value={product.rating} count={product.reviews} size={11} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
          <span style={{ fontSize: compact ? 15 : 17, fontWeight: 700, color: 'var(--primary-600)' }}>{formatVND(product.price)}</span>
          {sale && <span style={{ fontSize: 12, color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{formatVND(product.originalPrice)}</span>}
        </div>
        {!compact && (
          <button className="btn btn-outline btn-sm" style={{ marginTop: 4, justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); onAdd?.(product); }}>
            <Icon name="plus" size={14} /> Thêm giỏ
          </button>
        )}
      </div>
    </div>
  );
};

// Avatar (emoji inside tinted circle)
const PetAvatar = ({ pet, size = 40 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: pet.color || 'var(--neutral-100)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.55, flexShrink: 0,
    border: '2px solid white', boxShadow: 'var(--shadow-xs)',
  }}>{pet.emoji}</div>
);

Object.assign(window, { Icon, ProductImg, Rating, ProductCard, PetAvatar });
