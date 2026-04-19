// Homepage screen

const HomeHero = ({ loginState, goToChat, goToPets }) => {
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, oklch(0.97 0.025 55) 0%, oklch(0.95 0.04 30) 60%, oklch(0.96 0.04 85) 100%)',
      borderRadius: 28, margin: '24px 32px 0', padding: '56px 56px',
    }}>
      {/* Decorative pet blobs */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'oklch(0.93 0.08 50 / 0.5)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: -50, left: '40%', width: 220, height: 220, borderRadius: '50%', background: 'oklch(0.92 0.07 195 / 0.4)', filter: 'blur(50px)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 40, alignItems: 'center', position: 'relative' }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 8px',
            background: 'white', borderRadius: 999, fontSize: 12, fontWeight: 600,
            color: 'var(--neutral-700)', boxShadow: 'var(--shadow-sm)', marginBottom: 22,
          }}>
            <span style={{ background: 'var(--teal-600)', color: 'white', padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>MỚI</span>
            Trợ lý AI hiểu từng bé pet của bạn
          </div>
          <h1 style={{
            fontSize: 60, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.035em',
            color: 'var(--neutral-900)', margin: '0 0 20px',
          }}>
            Thú cưng của bạn,<br/>
            <span style={{ color: 'var(--primary-600)', position: 'relative' }}>
              AI hiểu từng chi tiết
              <svg viewBox="0 0 200 12" preserveAspectRatio="none" style={{ position: 'absolute', bottom: -6, left: 0, width: '100%', height: 10, opacity: 0.35 }}>
                <path d="M2 8 Q 50 2, 100 6 T 198 5" stroke="var(--primary-500)" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--neutral-600)', maxWidth: 480, margin: '0 0 32px' }}>
            Tạo hồ sơ cho bé pet — chúng tôi gợi ý sản phẩm phù hợp với tuổi, cân nặng, giống và cả dị ứng của bé. Chat 24/7 với trợ lý AI khi bạn cần tư vấn.
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            <button className="btn btn-primary btn-lg" onClick={goToPets}>
              <Icon name="paw" size={16} /> Tạo hồ sơ pet
            </button>
            <button className="btn btn-outline btn-lg" onClick={goToChat}>
              <Icon name="sparkles" size={16} /> Thử chat AI
            </button>
          </div>
          <div style={{ display: 'flex', gap: 28, fontSize: 12, color: 'var(--neutral-600)' }}>
            {[
              { n: '15K+', l: 'Khách hàng' },
              { n: '2.4K', l: 'Sản phẩm' },
              { n: '4.8★', l: 'Đánh giá' },
              { n: '24/7', l: 'AI hỗ trợ' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>{s.n}</div>
                <div>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual — stacked cards with pet + AI chat preview */}
        <div style={{ position: 'relative', height: 440 }}>
          <div style={{
            position: 'absolute', top: 20, right: 20, width: 320, height: 400,
            borderRadius: 24, background: 'white', boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden', transform: 'rotate(3deg)',
          }}>
            <ProductImg label="Bé Miu · Mèo Anh lông ngắn" tone="warm" />
            <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', padding: '14px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: 'oklch(0.85 0.08 50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🐈</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Miu · 3 tháng</div>
                <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>Anh lông ngắn · 2.1kg</div>
              </div>
              <div style={{ background: 'var(--success-bg)', color: 'var(--success)', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 999 }}>ĐANG KHOẺ</div>
            </div>
          </div>
          {/* Chat preview card */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, width: 300,
            background: 'white', borderRadius: 20, padding: 16,
            boxShadow: 'var(--shadow-lg)', transform: 'rotate(-4deg)',
            border: '1px solid var(--neutral-100)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkles" size={14} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Trợ lý AI</div>
              <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 3, background: 'var(--success)' }} />
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--neutral-700)', marginBottom: 10 }}>
              Với Miu 3 tháng tuổi, em gợi ý <b>hạt Royal Canin Kitten</b> — hàm lượng protein 34% phù hợp mèo con 🐱
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, height: 46, borderRadius: 8, background: 'var(--neutral-50)', border: '1px solid var(--neutral-100)', padding: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'oklch(0.94 0.04 55)' }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary-600)' }}>295.000₫</div>
              </div>
              <div style={{ flex: 1, height: 46, borderRadius: 8, background: 'var(--neutral-50)', border: '1px solid var(--neutral-100)', padding: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'oklch(0.94 0.04 55)' }} />
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary-600)' }}>255.000₫</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const RecommendationBanner = ({ pet, products, goToChat }) => (
  <section style={{ padding: '56px 32px 0' }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className="badge badge-ai"><Icon name="sparkles" size={10} /> CÁ NHÂN HOÁ</span>
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', margin: 0, color: 'var(--neutral-900)' }}>
          Dành riêng cho <span style={{ color: 'var(--primary-600)' }}>bé {pet.name}</span>
        </h2>
        <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '6px 0 0' }}>
          Vì {pet.name} {pet.age}, {pet.breed}{pet.allergies.length > 0 ? `, dị ứng ${pet.allergies.join(', ')}` : ''} — AI gợi ý các sản phẩm phù hợp nhất.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', border: '1px solid var(--neutral-200)', borderRadius: 10, background: 'white', fontSize: 13, fontWeight: 600 }}>
          <PetAvatar pet={pet} size={24} />
          {pet.name}
          <Icon name="arrowR" size={14} />
        </button>
        <button className="btn btn-teal btn-sm" onClick={goToChat}>
          <Icon name="sparkles" size={14} /> Hỏi AI
        </button>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      {products.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  </section>
);

const GuestRecommendationCTA = ({ goToPets }) => (
  <section style={{ padding: '56px 32px 0' }}>
    <div style={{
      background: 'linear-gradient(135deg, var(--primary-50), oklch(0.96 0.04 30))',
      border: '1px dashed var(--primary-300)',
      borderRadius: 24, padding: '40px 48px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 38, marginBottom: 8 }}>🐾</div>
      <h3 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--neutral-900)' }}>Tạo hồ sơ pet để nhận gợi ý cá nhân hoá</h3>
      <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '8px 0 20px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
        AI sẽ dựa vào tuổi, cân nặng, giống và dị ứng của bé để gợi ý sản phẩm chuẩn xác nhất.
      </p>
      <button className="btn btn-primary btn-lg" onClick={goToPets}><Icon name="plus" size={16} /> Thêm thú cưng đầu tiên</button>
    </div>
  </section>
);

const CategorySection = () => (
  <section style={{ padding: '56px 32px 0' }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
      <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Danh mục nổi bật</h2>
      <button style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-600)', display: 'flex', alignItems: 'center', gap: 4 }}>Xem tất cả <Icon name="arrowR" size={14} /></button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
      {CATEGORIES.map((c, i) => (
        <button key={c.id} className="card" style={{
          padding: '22px 14px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10, cursor: 'pointer',
          transition: 'all 160ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary-200)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = ''; }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: i % 2 === 0 ? 'oklch(0.95 0.05 55)' : 'oklch(0.93 0.06 195)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          }}>{c.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-800)' }}>{c.name}</div>
          <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>{c.count} sản phẩm</div>
        </button>
      ))}
    </div>
  </section>
);

const BestSellersSection = ({ products }) => (
  <section style={{ padding: '56px 32px 0' }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Bán chạy nhất tuần</h2>
        <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '4px 0 0' }}>Top sản phẩm được mua nhiều nhất 7 ngày qua</p>
      </div>
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'white', borderRadius: 10, border: '1px solid var(--neutral-100)' }}>
        {['Tất cả', 'Chó', 'Mèo', 'Chim'].map((t, i) => (
          <button key={t} style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: i === 0 ? 'var(--neutral-900)' : 'transparent',
            color: i === 0 ? 'white' : 'var(--neutral-600)',
          }}>{t}</button>
        ))}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      {products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  </section>
);

const AIBanner = ({ goToChat }) => (
  <section style={{ padding: '72px 32px 0' }}>
    <div style={{
      background: 'linear-gradient(135deg, var(--neutral-900) 0%, oklch(0.25 0.05 190) 60%, var(--teal-700) 100%)',
      borderRadius: 28, padding: '48px 56px', color: 'white', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: '50%', background: 'oklch(0.62 0.12 195 / 0.2)', filter: 'blur(40px)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, alignItems: 'center', position: 'relative' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 999, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            <Icon name="sparkles" size={12} /> TRỢ LÝ AI 24/7
          </div>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' }}>
            Bé pet khoẻ, bạn nhàn.<br/>
            <span style={{ color: 'var(--teal-500)' }}>Hỏi AI bất cứ lúc nào.</span>
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', maxWidth: 420, margin: '0 0 28px' }}>
            Từ chọn thức ăn đúng cân nặng, lịch tiêm phòng, đến xử lý tình huống khẩn cấp — AI hiểu hồ sơ pet của bạn và gợi ý chính xác.
          </p>
          <button onClick={goToChat} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 26px',
            background: 'white', color: 'var(--neutral-900)', borderRadius: 999,
            fontSize: 15, fontWeight: 700, boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          }}>
            <Icon name="sparkles" size={16} /> Thử chat AI ngay →
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { q: 'Miu 3 tháng nên ăn hạt gì?', t: 'Mèo con' },
            { q: 'Lucky golden nên tẩy giun bao lâu 1 lần?', t: 'Chó' },
            { q: 'Cát đậu hũ có dùng được cho mèo con không?', t: 'Vệ sinh' },
          ].map((q, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="chat" size={14} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'white' }}>{q.q}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{q.t}</div>
              </div>
              <Icon name="arrowR" size={14} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const HomeScreen = ({ loginState, setCurrentScreen, onChatClick, isMobile }) => {
  const pet = PETS_DATA[0];
  return (
    <>
      <HomeHero loginState={loginState} goToChat={onChatClick} goToPets={() => setCurrentScreen('pets')} />
      {loginState === 'logged_in'
        ? <RecommendationBanner pet={pet} products={PRODUCTS} goToChat={onChatClick} />
        : <GuestRecommendationCTA goToPets={() => setCurrentScreen('pets')} />
      }
      <CategorySection />
      <BestSellersSection products={PRODUCTS} />
      <AIBanner goToChat={onChatClick} />
      <Footer />
    </>
  );
};

Object.assign(window, { HomeScreen });
