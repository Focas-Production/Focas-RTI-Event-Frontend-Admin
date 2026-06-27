import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const GREEN = '#1D9E75';

/* ── badge color map ───────────────────────────────────────────── */
const BADGE_MAP = {
  whatsapp:  { bg: '#dcfce7', color: '#15803d' },
  instagram: { bg: '#fce7f3', color: '#be185d' },
  facebook:  { bg: '#dbeafe', color: '#1d4ed8' },
};

function Badge({ value }) {
  const s = BADGE_MAP[String(value).toLowerCase()] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {value || '—'}
    </span>
  );
}

const DATE = (props) => (
  <input
    type="date"
    {...props}
    style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, padding: '7px 10px', background: '#fff', color: '#374151', outline: 'none' }}
  />
);

const EMPTY = { q: '', startDate: '', endDate: '' };

export default function LeadsPage() {
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState(EMPTY);
  const [inputQ,  setInputQ]  = useState('');

  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const fetchRows = async (p = 1, f = filters) => {
    setLoading(true); setError('');
    const q = new URLSearchParams({ page: p, limit: 50 });
    if (f.q)         q.set('q', f.q);
    if (f.startDate) q.set('startDate', f.startDate);
    if (f.endDate)   q.set('endDate', f.endDate);
    try {
      const d = await api.get(`/api/rti/leads?${q}`).then(r => r.json());
      if (d.success) { setRows(d.leads); setTotal(d.total); setPages(d.pages || 1); setPage(p); }
      else setError('Failed to load leads.');
    } catch (_) { setError('Cannot reach backend — check VITE_BACKEND_URL in .env'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRows(1, EMPTY); }, []);

  const apply = () => { const f = { ...filters, q: inputQ }; setFilters(f); fetchRows(1, f); };
  const clear = () => { setInputQ(''); setFilters(EMPTY); fetchRows(1, EMPTY); };
  const setF  = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const card = { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16 };
  const btn  = (bg, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 8, padding: '8px 18px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  });
  const th = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
               color: '#94a3b8', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase' };
  const td = { padding: '12px 14px', fontSize: 13 };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Campaign Leads</h1>
          <p  style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>Visitors tracked from campaign links</p>
        </div>
        <button onClick={() => fetchRows(page, filters)} style={btn(GREEN)}>↻ Refresh</button>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            style={{ flex: '1 1 240px', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 13, outline: 'none', color: '#374151', minWidth: 0 }}
            placeholder="🔍  Search phone / campaign / source…"
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && apply()}
          />
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>From</label>
          <DATE value={filters.startDate} onChange={e => setF('startDate', e.target.value)} />
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>To</label>
          <DATE value={filters.endDate} onChange={e => setF('endDate', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={apply} style={btn(GREEN)}>Apply Filters</button>
          <button onClick={clear} style={btn('#f1f5f9', '#64748b')}>Clear</button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                {['#','Phone','Source','Campaign','Page','Captured At'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>No leads found.</td></tr>
              )}
              {!loading && rows.map((l, i) => (
                <tr
                  key={l._id}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <td style={{ ...td, color: '#94a3b8', fontSize: 12 }}>{(page - 1) * 50 + i + 1}</td>
                  <td style={{ ...td, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{l.phone}</td>
                  <td style={td}><Badge value={l.source} /></td>
                  <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{l.campaign || '—'}</td>
                  <td style={{ ...td, color: '#64748b' }}>{l.page || '—'}</td>
                  <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDateTime(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1.5px solid #f1f5f9', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Showing <strong style={{ color: '#475569' }}>{rows.length}</strong> of <strong style={{ color: '#475569' }}>{total}</strong> leads
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { label: '← Prev', disabled: page <= 1,     action: () => fetchRows(page - 1, filters) },
              { label: 'Next →', disabled: page >= pages, action: () => fetchRows(page + 1, filters) },
            ].map(({ label, disabled, action }, idx) => (
              <button
                key={idx}
                disabled={disabled}
                onClick={action}
                style={{ border: '1.5px solid #e2e8f0', background: disabled ? '#f8fafc' : '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, color: '#374151' }}
              >
                {label}
              </button>
            ))}
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', padding: '0 4px' }}>
              {page} / {pages}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
