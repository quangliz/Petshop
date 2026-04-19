// Pet Profile Management screen

const ProfileNav = ({ active = 'pets', setCurrentScreen }) => (
  <aside style={{ width: 240, flexShrink: 0 }}>
    <div className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 24, background: 'oklch(0.9 0.06 85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>H</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Nguyễn Hùng</div>
        <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>hung@petshop.vn</div>
      </div>
    </div>
    <nav className="card" style={{ padding: 8 }}>
      {[
        { id: 'account', l: 'Hồ sơ của tôi', i: 'user' },
        { id: 'pets', l: 'Thú cưng', i: 'paw', count: 3 },
        { id: 'orders', l: 'Đơn hàng', i: 'box', count: 12 },
        { id: 'address', l: 'Địa chỉ', i: 'home' },
        { id: 'chat', l: 'Lịch sử chat', i: 'chat' },
        { id: 'password', l: 'Đổi mật khẩu', i: 'shield' },
      ].map(item => (
        <button key={item.id} style={{
          width: '100%', padding: '10px 12px', borderRadius: 8, textAlign: 'left',
          background: active === item.id ? 'var(--primary-50)' : 'transparent',
          color: active === item.id ? 'var(--primary-700)' : 'var(--neutral-700)',
          fontSize: 13, fontWeight: active === item.id ? 600 : 500,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon name={item.i} size={16} />
          <span style={{ flex: 1 }}>{item.l}</span>
          {item.count != null && <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--neutral-500)',
            background: 'var(--neutral-50)', padding: '1px 7px', borderRadius: 999,
          }}>{item.count}</span>}
        </button>
      ))}
    </nav>
  </aside>
);

const PetCard = ({ pet, onChat, onEdit, onDelete }) => (
  <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <div style={{ height: 120, background: pet.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, position: 'relative' }}>
      {pet.emoji}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
        <button onClick={onEdit} style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-700)' }}><Icon name="edit" size={14} /></button>
        <button onClick={onDelete} style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}><Icon name="trash" size={14} /></button>
      </div>
    </div>
    <div style={{ padding: '16px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{pet.name}</h3>
        <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>· {pet.gender}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--neutral-600)', marginBottom: 12 }}>{pet.species} · {pet.breed}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'var(--neutral-50)', padding: '8px 10px', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--neutral-500)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>Tuổi</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{pet.age}</div>
        </div>
        <div style={{ background: 'var(--neutral-50)', padding: '8px 10px', borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--neutral-500)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>Cân nặng</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{pet.weight}</div>
        </div>
      </div>
      {pet.allergies.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 12 }}>
          <span style={{ color: 'var(--neutral-500)' }}>Dị ứng:</span>
          {pet.allergies.map(a => (
            <span key={a} style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{a}</span>
          ))}
        </div>
      )}
      <button onClick={onChat} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
        <Icon name="sparkles" size={14} /> Chat AI về bé {pet.name}
      </button>
    </div>
  </div>
);

const AddPetCard = ({ onClick }) => (
  <button onClick={onClick} style={{
    borderRadius: 16, padding: 0, cursor: 'pointer',
    background: 'transparent', border: '2px dashed var(--neutral-300)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: 380, gap: 12, color: 'var(--neutral-500)',
    transition: 'all 160ms ease',
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-400)'; e.currentTarget.style.background = 'var(--primary-50)'; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; }}
  >
    <div style={{ width: 64, height: 64, borderRadius: 32, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
      <Icon name="plus" size={28} stroke={2} />
    </div>
    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--neutral-700)' }}>Thêm thú cưng mới</div>
    <div style={{ fontSize: 12, color: 'var(--neutral-500)', maxWidth: 200, textAlign: 'center' }}>Tạo hồ sơ để AI tư vấn chính xác</div>
  </button>
);

const AddPetModal = ({ onClose, onChatClick }) => {
  const [step, setStep] = useState(1);
  const [formSpecies, setFormSpecies] = useState('cat');
  const [formGender, setFormGender] = useState('F');

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(26, 24, 20, 0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, maxHeight: '90%', overflow: 'auto',
        background: 'white', borderRadius: 20, boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--neutral-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)' }}>
            <Icon name="paw" size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Thêm thú cưng mới</div>
            <div style={{ fontSize: 12, color: 'var(--neutral-500)' }}>Bước {step} / 3 — thông tin càng chi tiết, AI càng tư vấn chính xác</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2 2 12"/></svg>
          </button>
        </div>

        {/* Steps indicator */}
        <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= step ? 'var(--primary-500)' : 'var(--neutral-100)' }} />
          ))}
        </div>

        {/* Form content */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {step === 1 && (
            <>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tên bé <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input defaultValue="Miu" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--neutral-200)', borderRadius: 10, fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Loài <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                  {SPECIES.map(s => (
                    <button key={s.id} onClick={() => setFormSpecies(s.id)} style={{
                      padding: '10px 6px', borderRadius: 10, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4,
                      background: formSpecies === s.id ? 'var(--primary-50)' : 'white',
                      border: formSpecies === s.id ? '1.5px solid var(--primary-500)' : '1.5px solid var(--neutral-200)',
                      color: formSpecies === s.id ? 'var(--primary-700)' : 'var(--neutral-700)',
                    }}>
                      <span style={{ fontSize: 22 }}>{s.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Giống</label>
                  <input placeholder="Anh lông ngắn" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--neutral-200)', borderRadius: 10, fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Giới tính</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ id: 'M', l: 'Đực ♂' }, { id: 'F', l: 'Cái ♀' }].map(g => (
                      <button key={g.id} onClick={() => setFormGender(g.id)} style={{
                        flex: 1, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: formGender === g.id ? 'var(--primary-50)' : 'white',
                        border: formGender === g.id ? '1.5px solid var(--primary-500)' : '1.5px solid var(--neutral-200)',
                        color: formGender === g.id ? 'var(--primary-700)' : 'var(--neutral-700)',
                      }}>{g.l}</button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tuổi (năm)</label>
                  <input type="number" placeholder="0" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--neutral-200)', borderRadius: 10, fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tháng</label>
                  <input type="number" placeholder="3" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--neutral-200)', borderRadius: 10, fontSize: 14, outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Cân nặng (kg)</label>
                <input type="number" placeholder="2.1" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--neutral-200)', borderRadius: 10, fontSize: 14, outline: 'none' }} />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Avatar</label>
                <div style={{ padding: '20px 16px', border: '1.5px dashed var(--neutral-300)', borderRadius: 12, textAlign: 'center', color: 'var(--neutral-500)' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📷</div>
                  <div style={{ fontSize: 13 }}>Kéo-thả ảnh hoặc <b style={{ color: 'var(--primary-600)' }}>chọn từ máy</b></div>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Ghi chú sức khoẻ</label>
                <textarea rows={2} placeholder="Ví dụ: Đã tiêm vaccine, tẩy giun gần đây..." style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--neutral-200)', borderRadius: 10, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Dị ứng</label>
                <textarea rows={2} placeholder="Ví dụ: gà, hải sản, sữa bò..." style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--neutral-200)', borderRadius: 10, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--neutral-100)', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="btn btn-outline">
            {step > 1 ? 'Quay lại' : 'Huỷ'}
          </button>
          <button onClick={() => step < 3 ? setStep(step + 1) : onClose()} className="btn btn-primary">
            {step < 3 ? 'Tiếp theo' : 'Lưu hồ sơ'} <Icon name="arrowR" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const PetsScreen = ({ loginState, setCurrentScreen }) => {
  const [showAdd, setShowAdd] = useState(false);

  if (loginState === 'guest') {
    return (
      <div style={{ padding: '60px 32px', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🐾</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Đăng nhập để quản lý thú cưng</h1>
        <p style={{ fontSize: 15, color: 'var(--neutral-600)', margin: '12px 0 24px', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
          Tạo hồ sơ cho bé pet để AI có thể tư vấn chính xác về thức ăn, sức khoẻ và sản phẩm phù hợp.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-primary btn-lg">Đăng ký miễn phí</button>
          <button className="btn btn-outline btn-lg">Đăng nhập</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <ProfileNav active="pets" setCurrentScreen={setCurrentScreen} />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>Thú cưng của tôi</h1>
              <p style={{ fontSize: 14, color: 'var(--neutral-600)', margin: '4px 0 0' }}>Quản lý {PETS_DATA.length} bé pet — hồ sơ càng đầy đủ, AI tư vấn càng chính xác.</p>
            </div>
            <button onClick={() => setShowAdd(true)} className="btn btn-primary">
              <Icon name="plus" size={14} stroke={2.5} /> Thêm thú cưng
            </button>
          </div>

          {/* Insights strip */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(90deg, var(--teal-50), white)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal-600)' }}>
              <Icon name="sparkles" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>AI nhận xét: <span style={{ color: 'var(--teal-700)' }}>Miu sắp chuyển giai đoạn sang mèo junior</span></div>
              <div style={{ fontSize: 12, color: 'var(--neutral-600)', marginTop: 2 }}>Bé đã 3 tháng — 1-2 tháng nữa nên chuyển sang hạt Kitten giai đoạn 2. Xem gợi ý →</div>
            </div>
            <button className="btn btn-teal btn-sm">Xem chi tiết</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {PETS_DATA.map(p => (
              <PetCard key={p.id} pet={p}
                onChat={() => setCurrentScreen('chat')}
                onEdit={() => setShowAdd(true)}
                onDelete={() => {}}
              />
            ))}
            <AddPetCard onClick={() => setShowAdd(true)} />
          </div>
        </div>
      </div>

      {showAdd && <AddPetModal onClose={() => setShowAdd(false)} />}
    </div>
  );
};

Object.assign(window, { PetsScreen });
