// Main app — wires everything together

const App = () => {
  const [currentScreen, setCurrentScreen] = useState(() => localStorage.getItem('petshop_screen') || 'home');
  const [device, setDevice] = useState(() => localStorage.getItem('petshop_device') || 'desktop');
  const [loginState, setLoginStateRaw] = useState(() => (window.__TWEAKS__?.loginState) || 'logged_in');
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => localStorage.setItem('petshop_screen', currentScreen), [currentScreen]);
  useEffect(() => localStorage.setItem('petshop_device', device), [device]);

  const setLoginState = (v) => {
    setLoginStateRaw(v);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { loginState: v } }, '*');
  };

  const handleChatClick = () => {
    setCurrentScreen('chat');
  };

  const isMobile = device === 'mobile';

  let screen;
  switch (currentScreen) {
    case 'home': screen = <HomeScreen loginState={loginState} setCurrentScreen={setCurrentScreen} onChatClick={handleChatClick} isMobile={isMobile} />; break;
    case 'shop': screen = <ShopScreen />; break;
    case 'product': screen = <ProductScreen onChatClick={handleChatClick} />; break;
    case 'chat': screen = <ChatScreen loginState={loginState} />; break;
    case 'pets': screen = <PetsScreen loginState={loginState} setCurrentScreen={setCurrentScreen} />; break;
    default: screen = <HomeScreen loginState={loginState} setCurrentScreen={setCurrentScreen} onChatClick={handleChatClick} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <PrototypeSidebar
        currentScreen={currentScreen} setCurrentScreen={setCurrentScreen}
        device={device} setDevice={setDevice}
        loginState={loginState} setLoginState={setLoginState}
      />

      {/* Canvas area */}
      <div style={{ flex: 1, overflow: 'auto', background: '#efeae1', position: 'relative' }}>
        {isMobile ? (
          // Mobile showcase: centered phone frame
          <div style={{ minHeight: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 24px' }}>
            <MobileFrame>
              <div data-screen-label={`0${['home','shop','product','chat','pets'].indexOf(currentScreen)+1} ${currentScreen}`} style={{ height: '100%', overflow: 'auto' }}>
                <MobileShell currentScreen={currentScreen} loginState={loginState} setCurrentScreen={setCurrentScreen} onChatClick={handleChatClick} />
              </div>
            </MobileFrame>
          </div>
        ) : (
          <div data-screen-label={`0${['home','shop','product','chat','pets'].indexOf(currentScreen)+1} ${currentScreen}`} style={{ minHeight: '100%', position: 'relative' }}>
            <AppHeader loginState={loginState} onCartClick={() => {}} onChatClick={handleChatClick} setCurrentScreen={setCurrentScreen} />
            <main>{screen}</main>
            {currentScreen !== 'chat' && <ChatFAB onClick={handleChatClick} />}
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
      `}</style>
    </div>
  );
};

// Mobile frame (iPhone-ish)
const MobileFrame = ({ children }) => (
  <div style={{
    width: 390, height: 800, borderRadius: 50, padding: 12,
    background: 'linear-gradient(145deg, #2a2620, #1a1814)',
    boxShadow: '0 30px 60px rgba(0,0,0,0.3), 0 10px 20px rgba(0,0,0,0.2)',
    flexShrink: 0, position: 'relative',
  }}>
    <div style={{
      width: '100%', height: '100%', borderRadius: 40,
      background: 'white', overflow: 'hidden', position: 'relative',
    }}>
      {/* Notch */}
      <div style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        width: 110, height: 30, borderRadius: 18, background: '#1a1814', zIndex: 100,
      }} />
      {/* Status bar space */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', fontSize: 13, fontWeight: 700, paddingTop: 14,
      }}>
        <span>9:41</span>
        <span>●●●● 5G 100%</span>
      </div>
      <div style={{ height: 'calc(100% - 44px)', overflow: 'auto' }}>{children}</div>
    </div>
  </div>
);

// Mobile shell — simplified view for each screen on phone
const MobileShell = ({ currentScreen, loginState, setCurrentScreen, onChatClick }) => {
  const pet = PETS_DATA[0];

  // Shared mobile header
  const MHeader = ({ title }) => (
    <div style={{
      height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
      borderBottom: '1px solid var(--neutral-100)', background: 'white',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <button style={{ color: 'var(--neutral-700)' }}><Icon name="menu" size={22} /></button>
      <div style={{ flex: 1, fontSize: 15, fontWeight: 700, textAlign: 'center' }}>{title}</div>
      <button style={{ color: 'var(--neutral-700)', position: 'relative' }}>
        <Icon name="cart" size={20} />
      </button>
    </div>
  );

  const MBottomNav = () => (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 64,
      background: 'white', borderTop: '1px solid var(--neutral-100)',
      display: 'flex', paddingBottom: 8,
    }}>
      {[
        { id: 'home', l: 'Trang chủ', i: 'home' },
        { id: 'shop', l: 'Shop', i: 'shop' },
        { id: 'chat', l: 'AI', i: 'sparkles', special: true },
        { id: 'pets', l: 'Pets', i: 'paw' },
        { id: 'pets', l: 'Tôi', i: 'user' },
      ].map((t, i) => {
        const active = currentScreen === t.id;
        if (t.special) {
          return (
            <button key={i} onClick={() => setCurrentScreen(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: -14, boxShadow: '0 6px 16px oklch(0.54 0.12 192 / 0.4)' }}>
                <Icon name="sparkles" size={20} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--teal-700)' : 'var(--neutral-500)', marginTop: 30 }}>{t.l}</div>
            </button>
          );
        }
        return (
          <button key={i} onClick={() => setCurrentScreen(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            color: active ? 'var(--primary-600)' : 'var(--neutral-500)',
          }}>
            <Icon name={t.i} size={20} />
            <div style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{t.l}</div>
          </button>
        );
      })}
    </div>
  );

  const titles = { home: 'PetShop AI', shop: 'Cửa hàng', product: 'Royal Canin Kitten', chat: `Bé ${pet.name}`, pets: 'Thú cưng của tôi' };

  if (currentScreen === 'home') {
    return (
      <div style={{ paddingBottom: 80, background: 'var(--neutral-25)', minHeight: '100%' }}>
        <MHeader title="PetShop AI" />
        <div style={{ padding: 16 }}>
          <div style={{ borderRadius: 18, padding: 20, background: 'linear-gradient(135deg, oklch(0.96 0.04 55), oklch(0.93 0.07 30))', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'white', borderRadius: 999, fontSize: 10, fontWeight: 600, marginBottom: 10 }}>
              <span style={{ background: 'var(--teal-600)', color: 'white', padding: '2px 6px', borderRadius: 999, fontSize: 8, fontWeight: 700 }}>MỚI</span>
              AI hiểu bé pet của bạn
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15 }}>
              Thú cưng của bạn, <span style={{ color: 'var(--primary-600)' }}>AI hiểu từng chi tiết</span>
            </h1>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }}><Icon name="paw" size={12} /> Tạo hồ sơ</button>
          </div>

          {loginState === 'logged_in' && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="badge badge-ai" style={{ fontSize: 9 }}><Icon name="sparkles" size={9} /> CHO BÉ {pet.name.toUpperCase()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {PRODUCTS.slice(0, 4).map(p => <ProductCard key={p.id} product={p} compact />)}
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Danh mục</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {CATEGORIES.slice(0, 4).map(c => (
                <div key={c.id} className="card" style={{ padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 22 }}>{c.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 600 }}>{c.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Bán chạy</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PRODUCTS.slice(0, 4).map(p => <ProductCard key={p.id} product={p} compact />)}
            </div>
          </div>
        </div>
        <MBottomNav />
      </div>
    );
  }

  if (currentScreen === 'chat') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--neutral-25)' }}>
        <div style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button><Icon name="arrowL" size={20} /></button>
          <PetAvatar pet={pet} size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Bé {pet.name}</div>
            <div style={{ fontSize: 10, color: 'var(--neutral-500)' }}>{pet.breed} · {pet.age}</div>
          </div>
          <button style={{ color: 'var(--neutral-500)' }}><Icon name="panel" size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
          {CHAT_MESSAGES.slice(0, 3).map(m => <ChatMessage key={m.id} msg={m} />)}
        </div>
        <div style={{ padding: 10, background: 'white', borderTop: '1px solid var(--neutral-100)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 6, border: '1.5px solid var(--neutral-200)', borderRadius: 999 }}>
            <input placeholder="Hỏi AI..." style={{ flex: 1, border: 'none', outline: 'none', padding: '6px 10px', fontSize: 13 }} />
            <button style={{ width: 34, height: 34, borderRadius: 17, background: 'var(--primary-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="send" size={14} /></button>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === 'pets') {
    return (
      <div style={{ paddingBottom: 80, background: 'var(--neutral-25)', minHeight: '100%' }}>
        <MHeader title="Thú cưng" />
        <div style={{ padding: 16 }}>
          <button onClick={onChatClick} style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 14, background: 'linear-gradient(135deg, var(--teal-50), white)', border: '1px solid var(--teal-100)', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkles" size={14} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>AI: Miu sắp chuyển giai đoạn</div>
              <div style={{ fontSize: 10, color: 'var(--neutral-500)' }}>1-2 tháng nữa đổi hạt Kitten giai đoạn 2</div>
            </div>
            <Icon name="arrowR" size={14} />
          </button>
          {PETS_DATA.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <PetAvatar pet={p} size={56} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>{p.breed} · {p.age} · {p.weight}</div>
                {p.allergies.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 10 }}>
                    <span style={{ color: 'var(--neutral-500)' }}>Dị ứng: </span>
                    {p.allergies.map(a => <span key={a} style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 600, marginRight: 4 }}>{a}</span>)}
                  </div>
                )}
              </div>
              <button style={{ color: 'var(--neutral-500)' }}><Icon name="edit" size={16} /></button>
            </div>
          ))}
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', padding: 14, borderStyle: 'dashed' }}>
            <Icon name="plus" size={14} /> Thêm thú cưng
          </button>
        </div>
        <MBottomNav />
      </div>
    );
  }

  // shop + product fallback (simple)
  if (currentScreen === 'shop') {
    return (
      <div style={{ paddingBottom: 80, background: 'var(--neutral-25)', minHeight: '100%' }}>
        <MHeader title="Cửa hàng" />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 6, overflow: 'auto', marginBottom: 14, paddingBottom: 4 }}>
            {CATEGORIES.slice(0, 5).map((c, i) => (
              <button key={c.id} style={{ flexShrink: 0, padding: '6px 12px', background: i === 0 ? 'var(--neutral-900)' : 'white', color: i === 0 ? 'white' : 'var(--neutral-700)', border: i === 0 ? 'none' : '1px solid var(--neutral-200)', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PRODUCTS.slice(0, 6).map(p => <ProductCard key={p.id} product={p} compact />)}
          </div>
        </div>
        <MBottomNav />
      </div>
    );
  }

  // product
  const p = PRODUCTS[0];
  return (
    <div style={{ paddingBottom: 120, background: 'white', minHeight: '100%' }}>
      <MHeader title="Chi tiết SP" />
      <div style={{ aspectRatio: '1 / 1', background: 'var(--neutral-50)' }}><ProductImg label={p.label} /></div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary-700)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{p.brand}</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{p.name}</h1>
        <div style={{ marginTop: 8 }}><Rating value={p.rating} count={p.reviews} size={12} /></div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-600)' }}>{formatVND(p.price)}</span>
          <span style={{ fontSize: 13, color: 'var(--neutral-400)', textDecoration: 'line-through' }}>{formatVND(p.originalPrice)}</span>
        </div>
        <button onClick={onChatClick} style={{ width: '100%', marginTop: 16, padding: 12, borderRadius: 12, background: 'var(--teal-50)', border: '1px solid var(--teal-100)', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkles" size={14} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Hỏi AI về sản phẩm này</div>
            <div style={{ fontSize: 10, color: 'var(--neutral-600)' }}>Phù hợp cho Miu không?</div>
          </div>
        </button>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, background: 'white', borderTop: '1px solid var(--neutral-100)', display: 'flex', gap: 8 }}>
        <button className="btn btn-outline" style={{ flex: 1 }}><Icon name="cart" size={14} /> Giỏ</button>
        <button className="btn btn-primary" style={{ flex: 2 }}>Mua ngay</button>
      </div>
    </div>
  );
};

// Edit mode setup (tweak toggle exposes login state control)
{
  const handler = (e) => {
    // no-op: login state toggle is always visible in prototype sidebar
  };
  window.addEventListener('message', handler);
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
