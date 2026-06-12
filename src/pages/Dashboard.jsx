import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const GREEN = '#1D9E75';

/* ── stat card definitions ─────────────────────────────────────── */
const STATS = [
  { key: 'total',     label: 'Total',      color: '#2563eb', bg: '#eff6ff' },
  { key: 'paid',      label: 'Paid',       color: '#16a34a', bg: '#f0fdf4' },
  { key: 'pending',   label: 'Pending',    color: '#d97706', bg: '#fffbeb' },
  { key: 'attended',  label: 'Attended',   color: '#0891b2', bg: '#ecfeff' },
  { key: 'absent',    label: 'Absent',     color: '#dc2626', bg: '#fef2f2' },
  { key: 'group1',    label: 'Group 1',    color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'group2',    label: 'Group 2',    color: '#0369a1', bg: '#f0f9ff' },
  { key: 'bothGroup', label: 'Both Group', color: '#b45309', bg: '#fefce8' },
];

/* ── badge color map ───────────────────────────────────────────── */
const BADGE_MAP = {
  paid:         { bg: '#dcfce7', color: '#15803d' },
  pending:      { bg: '#fee2e2', color: '#b91c1c' },
  'true':       { bg: '#cffafe', color: '#0e7490' },
  'false':      { bg: '#f1f5f9', color: '#64748b' },
  'Group 1':    { bg: '#ede9fe', color: '#6d28d9' },
  'Group 2':    { bg: '#dbeafe', color: '#1d4ed8' },
  'Both Group': { bg: '#fef9c3', color: '#92400e' },
  'Yes':        { bg: '#dcfce7', color: '#15803d' },
  'Not yet':    { bg: '#fef3c7', color: '#92400e' },
  'No':         { bg: '#fee2e2', color: '#b91c1c' },
};

function Badge({ value }) {
  const s   = BADGE_MAP[String(value)] || { bg: '#f1f5f9', color: '#64748b' };
  const txt = value === true || value === 'true' ? '✓ Yes'
            : value === false || value === 'false' ? 'No'
            : value;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {txt}
    </span>
  );
}

const SEL = (props) => (
  <select
    {...props}
    style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, padding: '8px 10px', background: '#fff', color: '#374151', cursor: 'pointer', outline: 'none', minWidth: 120 }}
  />
);

const EMPTY = { q: '', paymentStatus: '', attended: '', groupSelection: '', appliedForSep: '', appliedForRTI: '', isrtiUrl: '' };

export default function Dashboard() {
  const [stats,     setStats]     = useState({});
  const [rows,      setRows]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [filters,   setFilters]   = useState(EMPTY);
  const [inputQ,    setInputQ]    = useState('');

  /* ── data fetchers ─────────────────────────────────────────────── */
  const fetchStats = async () => {
    try {
      const d = await api.get('/api/attendees/stats').then(r => r.json());
      if (d.success) setStats(d.stats);
    } catch (_) {}
  };

  const fetchRows = async (p = 1, f = filters) => {
    setLoading(true); setError('');
    const q = new URLSearchParams({ page: p, limit: 20 });
    if (f.q)               q.set('q', f.q);
    if (f.paymentStatus)   q.set('paymentStatus', f.paymentStatus);
    if (f.attended !== '') q.set('attended', f.attended);
    if (f.groupSelection)  q.set('groupSelection', f.groupSelection);
    if (f.appliedForSep)   q.set('appliedForSep', f.appliedForSep);
    if (f.appliedForRTI)   q.set('appliedForRTI', f.appliedForRTI);
    if (f.isrtiUrl !== '')  q.set('isrtiUrl', f.isrtiUrl);
    try {
      const d = await api.get(`/api/attendees/search?${q}`).then(r => r.json());
      if (d.success) { setRows(d.attendees); setTotal(d.total); setPages(d.pages || 1); setPage(p); }
      else setError('Failed to load data.');
    } catch (_) { setError('Cannot reach backend — check VITE_BACKEND_URL in .env'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); fetchRows(1, EMPTY); }, []);

  const apply = () => { const f = { ...filters, q: inputQ }; setFilters(f); fetchRows(1, f); fetchStats(); };
  const clear = () => { setInputQ(''); setFilters(EMPTY); fetchRows(1, EMPTY); fetchStats(); };
  const setF  = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  /* ── mark attended ─────────────────────────────────────────────── */
  const markAttended = async (id) => {
    const d = await api.post('/api/attendees/verify', { qrData: id })
      .then(r => r.json()).catch(() => null);
    if (!d) return alert('Network error');
    if (d.success || d.message === 'Already scanned') {
      setRows(prev => prev.map(a => a._id === id ? { ...a, attended: true, scanTime: d.attendee?.scanTime || new Date() } : a));
      fetchStats();
    } else {
      alert(d.message || 'Could not mark attendance');
    }
  };

  /* ── common style tokens ───────────────────────────────────────── */
  const card = { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16 };
  const btn  = (bg, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 8, padding: '8px 18px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  });
  const th   = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                 color: '#94a3b8', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase' };
  const td   = { padding: '12px 14px', fontSize: 13 };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1600, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Registrations</h1>
          <p  style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>RTI Day 2026 — live attendance tracking</p>
        </div>
        <button onClick={() => { fetchStats(); fetchRows(page, filters); }} style={btn(GREEN)}>
          ↻ Refresh
        </button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12, marginBottom: 20 }}>
        {STATS.map(s => (
          <div key={s.key} style={{ background: s.bg, border: `1.5px solid ${s.color}28`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>{stats[s.key] ?? '—'}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            style={{ flex: '1 1 200px', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 13, outline: 'none', color: '#374151', minWidth: 0 }}
            placeholder="🔍  Search name / phone / email…"
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && apply()}
          />
          <SEL value={filters.paymentStatus} onChange={e => setF('paymentStatus', e.target.value)}>
            <option value="">All Payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </SEL>
          <SEL value={filters.attended} onChange={e => setF('attended', e.target.value)}>
            <option value="">All Attendance</option>
            <option value="true">Attended</option>
            <option value="false">Not Attended</option>
          </SEL>
          <SEL value={filters.groupSelection} onChange={e => setF('groupSelection', e.target.value)}>
            <option value="">All Groups</option>
            <option value="Group 1">Group 1</option>
            <option value="Group 2">Group 2</option>
            <option value="Both Group">Both Group</option>
          </SEL>
          <SEL value={filters.appliedForSep} onChange={e => setF('appliedForSep', e.target.value)}>
            <option value="">Sep Applied?</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </SEL>
          <SEL value={filters.appliedForRTI} onChange={e => setF('appliedForRTI', e.target.value)}>
            <option value="">RTI Applied?</option>
            <option value="Yes">Yes</option>
            <option value="Not yet">Not yet</option>
          </SEL>
          <SEL value={filters.isrtiUrl} onChange={e => setF('isrtiUrl', e.target.value)}>
            <option value="">RTI Link?</option>
            <option value="true">Has Link</option>
            <option value="false">No Link</option>
          </SEL>
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
                {['#','Name','Phone','Email','Sep?','RTI?','Group','Amount','Payment','Attended','Scan Time','RTI Link','Action'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={13} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={13} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>No registrations found.</td></tr>
              )}
              {!loading && rows.map((a, i) => (
                <tr
                  key={a._id}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <td style={{ ...td, color: '#94a3b8', fontSize: 12 }}>{(page - 1) * 20 + i + 1}</td>
                  <td style={{ ...td, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{a.name}</td>
                  <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{a.phone}</td>
                  <td style={{ ...td, color: '#64748b', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</td>
                  <td style={td}><Badge value={a.appliedForSep} /></td>
                  <td style={td}><Badge value={a.appliedForRTI} /></td>
                  <td style={td}><Badge value={a.groupSelection} /></td>
                  <td style={{ ...td, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    ₹{((a.amount || 0) / 100).toLocaleString('en-IN')}
                  </td>
                  <td style={td}><Badge value={a.paymentStatus} /></td>
                  <td style={td}><Badge value={String(a.attended)} /></td>
                  <td style={{ ...td, color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {a.scanTime ? new Date(a.scanTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td style={td}>
                    {a.isrtiUrl && a.rtiUrl
                      ? <a
                          href={a.rtiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', background: '#eef2ff', color: '#4338ca', border: '1.5px solid #c7d2fe', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          🔗 RTI Link
                        </a>
                      : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={td}>
                    {a.paymentStatus === 'paid' && !a.attended && (
                      <button
                        onClick={() => markAttended(a._id)}
                        style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Mark Attended
                      </button>
                    )}
                    {a.attended && <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 12 }}>✓ Done</span>}
                    {!a.attended && a.paymentStatus !== 'paid' && <span style={{ color: '#94a3b8', fontSize: 12 }}>Unpaid</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1.5px solid #f1f5f9', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Showing <strong style={{ color: '#475569' }}>{rows.length}</strong> of <strong style={{ color: '#475569' }}>{total}</strong> registrations
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { label: '← Prev', disabled: page <= 1,  action: () => fetchRows(page - 1, filters) },
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
