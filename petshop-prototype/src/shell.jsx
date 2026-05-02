// App shell: prototype nav + header + footer + chat FAB

const { useState, useEffect, useMemo, useRef } = React;

const NAV_ITEMS = [
  { id: 'home', label: 'Trang chủ', icon: 'home' },
  { id: 'shop', label: 'Cửa hàng', icon: 'shop' },
  { id: 'product', label: 'Chi tiết SP', icon: 'box' },
  { id: 'chat', label: 'Chat AI', icon: 'sparkles', star: true },
  { id: 'pets', label: 'Thú cưng', icon: 'paw' },
];

// Logo
const Logo = ({ size = 28 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
      boxShadow: '0 4px 12px oklch(0.68 0.19 50 / 0.35)',
    }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="10" r="2" /><circle cx="10" cy="6" r="2" />
        <circle cx="14" cy="6" r="2" /><circle cx="18" cy="10" r="2" />
        <path d="M7 19c0-3 2.2-5 5-5s5 2 5 5c0 1.5-1 2-2.5 2h-5C8 21 7 20.5 7 19z" />
      </svg>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
      <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--neutral-900)' }}>ThePawsome</span>
      {/* <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--teal-600)', letterSpacing: '0.15em', margi## Error Type
Runtime NotFoundError

## Error Message
Element.releasePointerCapture: Invalid pointer id


    at nI/s< (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:3826:7928)
    at p (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:3826:9791)
    at EventListener.handleEvent*onPointerDown (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:3826:10314)
    at cJ (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:162928)
    at ./dist/compiled/react-dom/cjs/react-dom-client.production.js/c5/< (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:168825)
    at tA (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:30648)
    at c5 (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:164162)
    at dP (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:200663)
    at dL (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:200483)
    at EventListener.handleEvent*c4 (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:163725)
    at c1 (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:163124)
    at ./dist/compiled/react-dom/cjs/react-dom-client.production.js/c3/< (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:163290)
    at c3 (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:163235)
    at ./dist/compiled/react-dom/cjs/react-dom-client.production.js/cg/r< (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:145864)
    at cg (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:147919)
    at cp (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:139169)
    at ./dist/compiled/react-dom/cjs/react-dom-client.production.js/ct/o< (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:133996)
    at ct (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:134095)
    at cB (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:160673)
    at N (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:224253)
    at EventHandlerNonNull*./dist/compiled/scheduler/cjs/scheduler.production.js (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:224632)
    at ./dist/compiled/scheduler/index.js (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:226256)
    at ./dist/compiled/react-dom/cjs/react-dom-client.production.js (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:10520)
    at ./dist/compiled/react-dom/client.js (file:///home/quang/Documents/DATN/frontend/.next/dev/static/chunks/node_modules_next_dist_compiled_next-devtools_index_0553esy.js:1841:213431)

Next.js version: 16.2.4 (Turbopack)
nTop: 2 }}>AI · BETA</span> */}
    </div>
  </div>
);

// Prototype sidebar (chrome around the app)
const PrototypeSidebar = ({ currentScreen, setCurrentScreen, device, setDevice, loginState, setLoginState }) => {
  return (
    <aside style={{
      width: 240, flexShrink: 0, background: 'var(--neutral-900)', color: 'var(--neutral-300)',
      display: 'flex', flexDirection: 'column', padding: '20px 16px',
      borderRight: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ padding: '6px 10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <circle cx="6" cy="10" r="2" /><circle cx="10" cy="6" r="2" />
              <circle cx="14" cy="6" r="2" /><circle cx="18" cy="10" r="2" />
              <path d="M7 19c0-3 2.2-5 5-5s5 2 5 5c0 1.5-1 2-2.5 2h-5C8 21 7 20.5 7 19z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>ThePawsome</div>
            <div style={{ fontSize: 10, color: 'var(--neutral-500)', fontFamily: 'var(--font-mono)' }}>Hi-fi Prototype v1</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 10px 8px', fontSize: 10, fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Màn hình</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map((item, i) => {
          const active = currentScreen === item.id;
          return (
            <button key={item.id} onClick={() => setCurrentScreen(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 10, textAlign: 'left',
              background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: active ? 'white' : 'var(--neutral-400)',
              fontSize: 13, fontWeight: 500, transition: 'all 140ms ease',
              position: 'relative',
            }}>
              {active && <div style={{ position: 'absolute', left: -16, top: 8, bottom: 8, width: 3, background: 'var(--primary-500)', borderRadius: 2 }} />}
              <span style={{ color: active ? (item.star ? 'var(--teal-500)' : 'var(--primary-400)') : 'var(--neutral-500)' }}>
                <Icon name={item.icon} size={16} />
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral-600)', width: 18 }}>0{i + 1}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.star && <span style={{ color: 'var(--teal-500)', fontSize: 10 }}>★</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '20px 10px 8px', fontSize: 10, fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Thiết bị</div>
      <div style={{ display: 'flex', gap: 4, padding: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
        {['desktop', 'mobile'].map(d => (
          <button key={d} onClick={() => setDevice(d)} style={{
            flex: 1, padding: '8px 10px', borderRadius: 7,
            background: device === d ? 'var(--neutral-700)' : 'transparent',
            color: device === d ? 'white' : 'var(--neutral-500)',
            fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
          }}>{d === 'desktop' ? 'Desktop' : 'Mobile'}</button>
        ))}
      </div>

      <div style={{ padding: '20px 10px 8px', fontSize: 10, fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Trạng thái</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
        {[
          { id: 'guest', label: 'Khách (chưa login)' },
          { id: 'logged_in', label: 'Đã login + có pet' },
        ].map(s => (
          <button key={s.id} onClick={() => setLoginState(s.id)} style={{
            padding: '8px 10px', borderRadius: 7, textAlign: 'left',
            background: loginState === s.id ? 'var(--neutral-700)' : 'transparent',
            color: loginState === s.id ? 'white' : 'var(--neutral-500)',
            fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 4,
              background: loginState === s.id ? (s.id === 'logged_in' ? 'var(--success)' : 'var(--warning)') : 'transparent',
              border: loginState === s.id ? 'none' : '1.5px solid var(--neutral-600)',
            }} />
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        padding: 12, borderRadius: 10, background: 'rgba(13, 148, 136, 0.08)',
        border: '1px solid rgba(13, 148, 136, 0.2)', fontSize: 11, color: 'var(--neutral-400)',
        lineHeight: 1.5,
      }}>
        <div style={{ fontWeight: 700, color: 'var(--teal-500)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="sparkles" size={12} /> Design system
        </div>
        Warm orange · teal AI accent · Be Vietnam Pro · Rounded 12/16px · Cream neutrals
      </div>
    </aside>
  );
};

// App header (inside the mock product)
const AppHeader = ({ loginState, onCartClick, onChatClick, setCurrentScreen, isMobile }) => {
  if (isMobile) {
    return (
      <header style={{
        height: 56, background: 'white', borderBottom: '1px solid var(--neutral-100)',
        display: 'flex', alignItems: 'center', padding: '0 14px', gap: 12,
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button style={{ color: 'var(--neutral-700)' }}><Icon name="menu" size={22} /></button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }} onClick={() => setCurrentScreen('home')}>
          <Logo size={26} />
        </div>
        <button style={{ color: 'var(--neutral-700)', position: 'relative' }} onClick={onCartClick}>
          <Icon name="cart" size={22} />
          <div style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, background: 'var(--primary-500)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>3</div>
        </button>
      </header>
    );
  }
  return (
    <header style={{
      height: 68, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--neutral-100)',
      display: 'flex', alignItems: 'center', padding: '0 32px', gap: 28,
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div onClick={() => setCurrentScreen('home')} style={{ cursor: 'pointer' }}><Logo /></div>

      <nav style={{ display: 'flex', gap: 4 }}>
        {[
          { id: 'shop', label: 'Cửa hàng' },
          { id: 'home', label: 'Danh mục' },
          { id: 'home', label: 'Thương hiệu' },
          { id: 'home', label: 'Khuyến mãi' },
          { id: 'home', label: 'Blog' },
        ].map((l, i) => (
          <button key={i} onClick={() => setCurrentScreen(l.id)} style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--neutral-700)',
          }}>{l.label}</button>
        ))}
      </nav>

      <div style={{ flex: 1, maxWidth: 440, position: 'relative' }}>
        <div style={{
          height: 42, borderRadius: 12, background: 'var(--neutral-50)',
          border: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: 10, color: 'var(--neutral-500)',
        }}>
          <Icon name="search" size={16} />
          <input placeholder="Tìm hạt, đồ chơi, cát vệ sinh..." style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--neutral-800)',
          }} />
          <kbd style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px',
            background: 'white', borderRadius: 4, border: '1px solid var(--neutral-200)',
            color: 'var(--neutral-500)',
          }}>⌘K</kbd>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={onChatClick} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px',
          borderRadius: 10, background: 'var(--teal-50)', color: 'var(--teal-700)',
          fontSize: 13, fontWeight: 600, border: '1px solid var(--teal-100)',
        }}>
          <Icon name="sparkles" size={14} /> Trợ lý AI
        </button>
        <button style={{ padding: 10, color: 'var(--neutral-700)', position: 'relative' }} onClick={onCartClick}>
          <Icon name="cart" size={20} />
          <div style={{ position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, background: 'var(--primary-500)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>3</div>
        </button>
        {loginState === 'logged_in' ? (
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 40, border: '1px solid var(--neutral-200)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 15, background: 'oklch(0.9 0.06 85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--neutral-800)' }}>H</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-800)' }}>Hùng</span>
          </button>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm">Đăng nhập</button>
            <button className="btn btn-primary btn-sm">Đăng ký</button>
          </>
        )}
      </div>
    </header>
  );
};

const Footer = () => (
  <footer style={{ background: 'var(--neutral-900)', color: 'var(--neutral-400)', padding: '48px 40px 24px', marginTop: 80 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.3fr', gap: 48, maxWidth: 1200, margin: '0 auto' }}>
      <div>
        <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}><Logo /></div>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 16, maxWidth: 300 }}>Shop thú cưng thông minh — nơi AI hiểu từng chi tiết về bé pet của bạn.</p>
      </div>
      <div>
        <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Danh mục</h4>
        {CATEGORIES.slice(0, 5).map(c => (
          <div key={c.id} style={{ fontSize: 13, padding: '5px 0' }}>{c.name}</div>
        ))}
      </div>
      <div>
        <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Hỗ trợ</h4>
        {['FAQ', 'Liên hệ', 'Đổi trả', 'Vận chuyển'].map(x => (
          <div key={x} style={{ fontSize: 13, padding: '5px 0' }}>{x}</div>
        ))}
      </div>
      <div>
        <h4 style={{ color: 'white', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Nhận tin</h4>
        <div style={{ display: 'flex', gap: 0, background: 'var(--neutral-800)', borderRadius: 10, padding: 4 }}>
          <input placeholder="email@petshop.vn" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '8px 12px', color: 'white', fontSize: 13 }} />
          <button className="btn btn-primary btn-sm">Đăng ký</button>
        </div>
      </div>
    </div>
    <div style={{ borderTop: '1px solid var(--neutral-800)', marginTop: 32, paddingTop: 20, fontSize: 12, textAlign: 'center', color: 'var(--neutral-500)' }}>
      © 2026 ThePawsome · Đồ án tốt nghiệp · Built with love for pets
    </div>
  </footer>
);

// Chat FAB (bottom-right, always present)
const ChatFAB = ({ onClick }) => (
  <button onClick={onClick} style={{
    position: 'absolute', bottom: 24, right: 24, zIndex: 30,
    width: 60, height: 60, borderRadius: 30,
    background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))',
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 10px 30px oklch(0.54 0.12 192 / 0.4), 0 4px 10px rgba(0,0,0,0.1)',
    transition: 'transform 160ms ease',
  }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = ''}
  >
    <Icon name="sparkles" size={24} />
    <div style={{
      position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9,
      background: 'var(--primary-500)', color: 'white', fontSize: 10, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid white',
    }}>1</div>
  </button>
);

Object.assign(window, { PrototypeSidebar, AppHeader, Footer, ChatFAB, Logo });
