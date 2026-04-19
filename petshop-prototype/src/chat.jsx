// AI Chat screen — the star screen

const MarkdownText = ({ text }) => {
  // Very simple markdown: **bold**, paragraphs
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br/>');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

const ChatProductChip = ({ product }) => (
  <div style={{
    display: 'flex', gap: 10, padding: 10, borderRadius: 12,
    background: 'white', border: '1px solid var(--neutral-100)',
    boxShadow: 'var(--shadow-xs)', cursor: 'pointer', minWidth: 210, maxWidth: 240,
    transition: 'all 140ms ease',
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-300)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
  >
    <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
      <ProductImg label={product.label} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.brand}</div>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, color: 'var(--neutral-800)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginTop: 2 }}>{product.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-600)' }}>{formatVND(product.price)}</span>
        <button style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--primary-500)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={12} stroke={2.5} />
        </button>
      </div>
    </div>
  </div>
);

const ToolCallChip = ({ call }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px',
    background: 'var(--neutral-50)', border: '1px solid var(--neutral-100)',
    borderRadius: 999, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--neutral-600)',
    marginRight: 6, marginBottom: 4,
  }}>
    <span style={{ color: 'var(--teal-600)' }}><Icon name="tool" size={12} /></span>
    <span style={{ color: 'var(--neutral-800)', fontWeight: 600 }}>{call.name}</span>
    <span style={{ color: 'var(--neutral-500)' }}>({call.args})</span>
    <span style={{ color: 'var(--success)', marginLeft: 2 }}>✓</span>
  </div>
);

const SourceChip = ({ url }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
    background: 'white', border: '1px solid var(--neutral-200)', borderRadius: 999,
    fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--neutral-600)',
    marginRight: 4,
  }}>
    <Icon name="source" size={10} /> {url}
  </span>
);

const ChatMessage = ({ msg }) => {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{
          maxWidth: '70%', background: 'var(--primary-500)', color: 'white',
          padding: '12px 16px', borderRadius: '18px 18px 4px 18px',
          fontSize: 14, lineHeight: 1.5, fontWeight: 500,
        }}>{msg.content}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 18, flexShrink: 0,
        background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="sparkles" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Trợ lý AI</span>
          <span className="badge badge-ai" style={{ fontSize: 9 }}>GPT-4o</span>
          <span style={{ fontSize: 11, color: 'var(--neutral-500)' }}>· vừa xong</span>
        </div>

        {msg.toolCalls && (
          <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap' }}>
            {msg.toolCalls.map((c, i) => <ToolCallChip key={i} call={c} />)}
          </div>
        )}

        <div style={{
          fontSize: 14, lineHeight: 1.65, color: 'var(--neutral-800)',
          background: 'white', padding: '14px 18px', borderRadius: '4px 18px 18px 18px',
          border: '1px solid var(--neutral-100)', boxShadow: 'var(--shadow-xs)',
        }}>
          <MarkdownText text={msg.content} />
          {msg.streaming && (
            <span style={{
              display: 'inline-block', width: 8, height: 16, background: 'var(--neutral-400)',
              marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 1s infinite',
            }} />
          )}
        </div>

        {msg.products && msg.products.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--neutral-600)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Icon name="box" size={12} /> Sản phẩm gợi ý
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {msg.products.map(pid => {
                const p = PRODUCTS.find(x => x.id === pid);
                return p && <ChatProductChip key={pid} product={p} />;
              })}
            </div>
          </div>
        )}

        {msg.sources && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--neutral-500)', marginRight: 4 }}>Nguồn:</span>
            {msg.sources.map(s => <SourceChip key={s} url={s} />)}
          </div>
        )}

        {!msg.streaming && (
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            {['👍', '👎', '📋', '🔄'].map((e, i) => (
              <button key={i} style={{
                width: 28, height: 28, borderRadius: 8, background: 'transparent',
                border: '1px solid var(--neutral-100)', fontSize: 12, color: 'var(--neutral-500)',
              }}>{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ChatSidebar = ({ sessions, loginState }) => (
  <aside style={{
    width: 280, flexShrink: 0, borderRight: '1px solid var(--neutral-100)',
    background: 'var(--neutral-25)', display: 'flex', flexDirection: 'column',
    maxHeight: 'calc(100vh - 68px)',
  }}>
    <div style={{ padding: 16 }}>
      <button className="btn btn-primary" style={{ width: '100%', padding: '11px 16px', borderRadius: 12 }}>
        <Icon name="plus" size={16} stroke={2.5} /> Cuộc trò chuyện mới
      </button>
    </div>
    <div style={{ padding: '0 16px 12px' }}>
      <div style={{ position: 'relative' }}>
        <input placeholder="Tìm cuộc trò chuyện..." style={{
          width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--neutral-200)',
          borderRadius: 10, fontSize: 13, background: 'white', outline: 'none',
        }} />
        <div style={{ position: 'absolute', left: 10, top: 9, color: 'var(--neutral-400)' }}><Icon name="search" size={14} /></div>
      </div>
    </div>
    <div style={{ padding: '4px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gần đây</div>
    <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px 16px' }}>
      {sessions.map(s => {
        const pet = PETS_DATA.find(p => p.id === s.petId);
        return (
          <button key={s.id} style={{
            width: '100%', padding: '10px 10px', borderRadius: 10,
            background: s.active ? 'white' : 'transparent',
            border: s.active ? '1px solid var(--primary-200)' : '1px solid transparent',
            boxShadow: s.active ? 'var(--shadow-xs)' : 'none',
            textAlign: 'left', display: 'flex', gap: 10, marginBottom: 2,
          }}>
            {pet && <PetAvatar pet={pet} size={28} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
              <div style={{ fontSize: 10, color: 'var(--neutral-500)', marginTop: 2 }}>{s.timestamp}</div>
            </div>
          </button>
        );
      })}
    </div>
    {loginState === 'logged_in' && (
      <div style={{ borderTop: '1px solid var(--neutral-100)', padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: 'oklch(0.9 0.06 85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>H</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Nguyễn Hùng</div>
          <div style={{ fontSize: 10, color: 'var(--neutral-500)' }}>Free · 15/50 tin/ngày</div>
        </div>
      </div>
    )}
  </aside>
);

const ChatScreen = ({ loginState }) => {
  const activePet = PETS_DATA[0];
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, []);

  if (loginState === 'guest') {
    return (
      <div style={{ display: 'flex', height: 'calc(100vh - 68px)' }}>
        <ChatSidebar sessions={[]} loginState="guest" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: 'var(--neutral-25)' }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: 'linear-gradient(135deg, var(--teal-500), var(--teal-700))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Icon name="sparkles" size={36} />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Đăng nhập để chat AI</h2>
          <p style={{ fontSize: 14, color: 'var(--neutral-600)', marginTop: 8, textAlign: 'center', maxWidth: 400 }}>
            AI sẽ hiểu hồ sơ pet của bạn và tư vấn chính xác hơn. Đăng ký chỉ mất 30 giây.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button className="btn btn-primary btn-lg">Đăng ký miễn phí</button>
            <button className="btn btn-outline btn-lg">Đăng nhập</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 68px)', background: 'var(--neutral-25)' }}>
      <ChatSidebar sessions={CHAT_SESSIONS} loginState="logged_in" />

      {/* Main chat column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Chat header */}
        <div style={{
          padding: '14px 28px', borderBottom: '1px solid var(--neutral-100)',
          background: 'white', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <PetAvatar pet={activePet} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>Bé {activePet.name}</div>
            <div style={{ fontSize: 12, color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {activePet.species} · {activePet.breed} · {activePet.age} · {activePet.weight}
              {activePet.allergies.length > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: 'var(--danger)' }}>Dị ứng: {activePet.allergies.join(', ')}</span>
                </>
              )}
            </div>
          </div>
          <button className="btn btn-outline btn-sm">
            <Icon name="paw" size={14} /> Đổi pet
            <Icon name="arrowR" size={12} />
          </button>
          <button style={{ padding: 8, color: 'var(--neutral-500)' }}><Icon name="panel" size={18} /></button>
        </div>

        {/* Messages */}
        <div ref={listRef} style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            {CHAT_MESSAGES.map(m => <ChatMessage key={m.id} msg={m} />)}
          </div>
        </div>

        {/* Composer */}
        <div style={{ padding: '12px 28px 18px', background: 'white', borderTop: '1px solid var(--neutral-100)' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            {/* Quick prompts */}
            <div style={{ display: 'flex', gap: 6, overflow: 'auto', marginBottom: 10, paddingBottom: 4 }}>
              {QUICK_PROMPTS.map((q, i) => (
                <button key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  background: 'var(--neutral-50)', border: '1px solid var(--neutral-100)',
                  borderRadius: 999, fontSize: 12, color: 'var(--neutral-700)', whiteSpace: 'nowrap', flexShrink: 0,
                }}>{q.icon} {q.text}</button>
              ))}
            </div>

            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 10,
              padding: 10, background: 'white', border: '1.5px solid var(--neutral-200)',
              borderRadius: 18, transition: 'border-color 120ms ease',
            }}>
              <button style={{ padding: 8, color: 'var(--neutral-500)' }}><Icon name="plus" size={18} /></button>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Gõ câu hỏi về bé ${activePet.name}...`}
                rows={1}
                style={{
                  flex: 1, border: 'none', outline: 'none', resize: 'none',
                  fontSize: 14, lineHeight: 1.5, padding: '8px 4px', maxHeight: 120,
                }} />
              <button style={{ padding: 8, color: 'var(--neutral-500)' }}><Icon name="mic" size={18} /></button>
              <button style={{
                width: 40, height: 40, borderRadius: 999,
                background: input ? 'var(--primary-500)' : 'var(--neutral-200)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="send" size={16} /></button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--neutral-500)', textAlign: 'center', marginTop: 8 }}>
              AI có thể mắc lỗi — hãy kiểm tra với bác sĩ thú y với các tình huống khẩn cấp
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ChatScreen, ChatMessage });
