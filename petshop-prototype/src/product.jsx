// Product detail screen

const ProductScreen = ({ onChatClick }) => {
  const product = PRODUCTS[0];
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('desc');
  const [mainImg, setMainImg] = useState(0);

  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Trang chủ</span> <Icon name="arrowR" size={12} />
        <span>Cửa hàng</span> <Icon name="arrowR" size={12} />
        <span>Thức ăn cho mèo</span> <Icon name="arrowR" size={12} />
        <span style={{ color: 'var(--neutral-800)', fontWeight: 600 }}>Royal Canin Kitten 1.5kg</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 48, alignItems: 'flex-start' }}>
        {/* Gallery */}
        <div>
          <div style={{ aspectRatio: '1 / 1', borderRadius: 20, overflow: 'hidden', background: 'var(--neutral-50)', marginBottom: 14, position: 'relative' }}>
            <ProductImg label={product.label + ' — Ảnh chính'} />
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="badge badge-sale">-15%</span>
              <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>Bán chạy</span>
            </div>
            <button style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, background: 'white', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-600)' }}>
              <Icon name="heart" size={18} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {[0,1,2,3,4].map(i => (
              <button key={i} onClick={() => setMainImg(i)} style={{
                aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden',
                border: mainImg === i ? '2px solid var(--primary-500)' : '1px solid var(--neutral-200)',
                padding: 0, background: 'var(--neutral-50)',
              }}>
                <ProductImg label={`thumb ${i+1}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--primary-700)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--primary-50)', padding: '4px 10px', borderRadius: 999 }}>{product.brand}</div>
            <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontFamily: 'var(--font-mono)' }}>SKU: RC-KT-1500</div>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 12px' }}>{product.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <Rating value={product.rating} count={product.reviews} size={13} />
            <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>·</span>
            <span style={{ fontSize: 13, color: 'var(--neutral-600)' }}>Đã bán <b>1.2K+</b></span>
          </div>

          {/* Price block */}
          <div style={{ padding: 20, background: 'linear-gradient(135deg, var(--primary-50), oklch(0.97 0.02 55))', borderRadius: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: 'var(--primary-700)', letterSpacing: '-0.02em' }}>{formatVND(product.price)}</span>
              <span style={{ fontSize: 16, color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{formatVND(product.originalPrice)}</span>
              <span className="badge badge-sale" style={{ fontSize: 12 }}>Tiết kiệm 55.000₫</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--neutral-600)', marginTop: 8 }}>Giá đã bao gồm VAT · Miễn phí ship đơn từ 300K</div>
          </div>

          {/* Attrs */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', rowGap: 10, fontSize: 13, marginBottom: 20 }}>
            <span style={{ color: 'var(--neutral-500)' }}>Cho loài:</span>
            <span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'white', border: '1px solid var(--neutral-200)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>🐈 Mèo con</span></span>
            <span style={{ color: 'var(--neutral-500)' }}>Trọng lượng:</span>
            <span style={{ fontWeight: 600 }}>1.5kg</span>
            <span style={{ color: 'var(--neutral-500)' }}>Độ tuổi:</span>
            <span style={{ fontWeight: 600 }}>4 – 12 tháng</span>
            <span style={{ color: 'var(--neutral-500)' }}>Xuất xứ:</span>
            <span style={{ fontWeight: 600 }}>Pháp 🇫🇷</span>
          </div>

          {/* Qty + CTAs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--neutral-200)', borderRadius: 999, background: 'white' }}>
              <button onClick={() => setQty(Math.max(1, qty-1))} style={{ width: 40, height: 44, color: 'var(--neutral-600)' }}><Icon name="minus" size={16} /></button>
              <span style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{qty}</span>
              <button onClick={() => setQty(qty+1)} style={{ width: 40, height: 44, color: 'var(--neutral-600)' }}><Icon name="plus" size={16} /></button>
            </div>
            <button className="btn btn-outline btn-lg" style={{ flex: 1 }}>
              <Icon name="cart" size={16} /> Thêm vào giỏ
            </button>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }}>Mua ngay</button>
          </div>

          {/* AI ask CTA — highlighted */}
          <button onClick={onChatClick} style={{
            width: '100%', padding: '14px 18px', borderRadius: 14,
            background: 'linear-gradient(135deg, var(--teal-50), oklch(0.96 0.04 195))',
            border: '1.5px solid var(--teal-100)',
            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            marginBottom: 20, cursor: 'pointer',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="sparkles" size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-900)' }}>Hỏi AI về sản phẩm này</div>
              <div style={{ fontSize: 12, color: 'var(--neutral-600)', marginTop: 2 }}>
                AI sẽ biết hồ sơ bé Miu của bạn để tư vấn liều lượng phù hợp
              </div>
            </div>
            <Icon name="arrowR" size={16} />
          </button>

          {/* Trust row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { i: 'truck', t: 'Giao 2-3 ngày', d: 'TP.HCM, Hà Nội' },
              { i: 'refresh', t: 'Đổi trả 7 ngày', d: 'Miễn phí' },
              { i: 'shield', t: 'Cam kết chính hãng', d: '100% từ NSX' },
            ].map((x, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 12, background: 'white', border: '1px solid var(--neutral-100)' }}>
                <div style={{ color: 'var(--primary-600)', marginBottom: 6 }}><Icon name={x.i} size={18} /></div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{x.t}</div>
                <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 56, borderBottom: '1px solid var(--neutral-200)', display: 'flex', gap: 4 }}>
        {[
          { id: 'desc', l: 'Mô tả' },
          { id: 'spec', l: 'Thông số' },
          { id: 'review', l: 'Đánh giá', c: 128 },
          { id: 'ship', l: 'Vận chuyển' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 20px', fontSize: 14, fontWeight: 600,
            color: tab === t.id ? 'var(--neutral-900)' : 'var(--neutral-500)',
            borderBottom: tab === t.id ? '2px solid var(--primary-500)' : '2px solid transparent',
            marginBottom: -1,
          }}>{t.l} {t.c && <span style={{ color: 'var(--neutral-400)', fontWeight: 500 }}>({t.c})</span>}</button>
        ))}
      </div>

      <div style={{ padding: '24px 0', fontSize: 14, lineHeight: 1.7, color: 'var(--neutral-700)', maxWidth: 780 }}>
        {tab === 'desc' && (
          <div>
            <p><b>Royal Canin Kitten 1.5kg</b> là dòng hạt cao cấp dành riêng cho mèo con 4–12 tháng tuổi. Công thức được nghiên cứu suốt 50+ năm bởi các chuyên gia dinh dưỡng thú y Pháp.</p>
            <p>Nổi bật với:</p>
            <ul>
              <li><b>Protein 34%</b> — hỗ trợ phát triển cơ bắp giai đoạn vàng</li>
              <li><b>DHA + EPA</b> — tăng cường trí não và hệ miễn dịch</li>
              <li><b>Hạt nhỏ hình quả hạnh</b> — thiết kế riêng cho răng sữa của mèo con</li>
              <li><b>Prebiotics + FOS</b> — giúp tiêu hoá khoẻ mạnh, giảm mùi phân</li>
            </ul>
          </div>
        )}
        {tab === 'spec' && <div>Thành phần, khối lượng tịnh, hạn sử dụng, NSX…</div>}
        {tab === 'review' && <div>Xếp hạng trung bình {product.rating} / 5 · {product.reviews} đánh giá</div>}
        {tab === 'ship' && <div>Thông tin giao hàng, phí ship, thời gian dự kiến…</div>}
      </div>

      {/* Similar products */}
      <div style={{ marginTop: 48 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="badge badge-ai"><Icon name="sparkles" size={10} /> AI SIMILARITY</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Sản phẩm tương tự</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {PRODUCTS.slice(3, 7).map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ProductScreen });
