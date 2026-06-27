import { useState, useEffect } from 'react';
import Dashboard    from './pages/Dashboard';
import VerifyPage   from './pages/VerifyPage';
import RegisterPage from './pages/RegisterPage';
import LeadsPage    from './pages/LeadsPage';

const GREEN = '#1D9E75';
const DARK  = '#0f172a';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦'  },
  { id: 'leads',     label: 'Leads',     icon: '☎'  },
  { id: 'verify',    label: 'Verify',    icon: '✓'  },
  { id: 'register',  label: 'Register',  icon: '+'  },
];

export default function App() {
  const [tab,     setTab]     = useState('dashboard');
  const [mobile,  setMobile]  = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const Page = tab === 'dashboard' ? Dashboard
             : tab === 'leads'     ? LeadsPage
             : tab === 'verify'    ? VerifyPage
             : RegisterPage;

  /* ── shared nav item styles ──────────────────────────────────── */
  const sideItem = (id) => ({
    display:        'flex',
    alignItems:     'center',
    gap:            10,
    padding:        '11px 16px',
    borderRadius:   10,
    fontSize:       14,
    fontWeight:     600,
    cursor:         'pointer',
    border:         'none',
    width:          '100%',
    textAlign:      'left',
    transition:     'all .15s',
    background:     tab === id ? GREEN : 'transparent',
    color:          tab === id ? '#fff' : '#94a3b8',
  });

  /* ── mobile top-bar + bottom tabs ──────────────────────────────── */
  if (mobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f1f5f9' }}>

        {/* Top bar */}
        <div style={{ background: DARK, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <span style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>FOCAS Edu</span>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 14, lineHeight: 1.1 }}>RTI Day 2026 Admin</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
          <Page />
        </div>

        {/* Bottom tab bar */}
        <div style={{
          position:        'fixed', bottom: 0, left: 0, right: 0,
          background:      DARK, borderTop: '1px solid #1e293b',
          display:         'flex', height: 60, zIndex: 50,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 3, border: 'none', cursor: 'pointer',
                background: 'transparent',
                borderTop: tab === t.id ? `2px solid ${GREEN}` : '2px solid transparent',
                color: tab === t.id ? GREEN : '#475569',
                transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}>{t.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Desktop: sidebar + main ────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#f1f5f9', overflow: 'hidden' }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: DARK, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ color: '#475569', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            FOCAS Edu
          </div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>RTI Day 2026</div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Admin Panel</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={sideItem(t.id)}>
              <span style={{ fontSize: 16, fontWeight: 900, width: 22, textAlign: 'center' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b' }}>
          <div style={{ color: '#334155', fontSize: 11 }}>© 2026 FOCAS Edu</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Page />
      </main>
    </div>
  );
}
