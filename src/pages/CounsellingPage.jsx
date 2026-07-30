import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import CopyButton from '../components/CopyButton.jsx';

const GREEN = '#1D9E75';

// Mirror the option sets enforced by the backend (counsellingController.js).
const SLOT_STATUSES = ['pending', 'confirmed', 'attended', 'no_show'];
const ATTEMPTS      = ['Sep 2026', 'Jan 2027', 'May 2027'];
const STUDENT_TYPES = ['Full Time CA Student', 'College Goer', 'Working Professional'];
const ROUTES        = ['Direct Entry', 'Foundation Entry'];

const STATUS_COLORS = {
  pending:   { bg: '#fef9c3', fg: '#a16207' },
  confirmed: { bg: '#dbeafe', fg: '#1d4ed8' },
  attended:  { bg: '#dcfce7', fg: '#15803d' },
  no_show:   { bg: '#fee2e2', fg: '#dc2626' },
};

const EMPTY_FILTERS = { slotStatus: '', attempt: '', studentType: '', route: '', startDate: '', endDate: '' };

export default function CounsellingPage() {
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [inputQ,  setInputQ]  = useState('');
  const [query,   setQuery]   = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [limit,   setLimit]   = useState(50);
  const [savingId,  setSavingId]  = useState(null);
  const [exporting, setExporting] = useState(false);
  const [mobile,  setMobile]  = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const fmtDate     = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const waLink  = (p) => `https://wa.me/${String(p).replace(/\D/g, '')}`;
  const telLink = (p) => `tel:+${String(p).replace(/\D/g, '')}`;

  const buildParams = (p, q, f, lim) => {
    const params = new URLSearchParams({ page: p, limit: lim });
    if (q) params.set('q', q);
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
    return params;
  };

  const fetchRows = async (p = 1, q = query, f = applied, lim = limit) => {
    setLoading(true); setError('');
    try {
      const d = await api.get(`/api/counselling?${buildParams(p, q, f, lim)}`).then(r => r.json());
      if (d.success) { setRows(d.leads); setTotal(d.total); setPages(d.pages || 1); setPage(p); }
      else setError('Failed to load counselling leads.');
    } catch (_) { setError('Cannot reach backend — check VITE_BACKEND_URL in .env'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRows(1, '', EMPTY_FILTERS); }, []);

  const apply = () => { setQuery(inputQ); setApplied(filters); fetchRows(1, inputQ, filters); };
  const clear = () => {
    setInputQ(''); setQuery('');
    setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS);
    fetchRows(1, '', EMPTY_FILTERS);
  };

  /* ── inline ops updates (PATCH /api/counselling/:id) ───────────── */
  const patchLead = async (id, body) => {
    setSavingId(id);
    try {
      const d = await api.patch(`/api/counselling/${id}`, body).then(r => r.json());
      if (d.success) setRows(rs => rs.map(r => r._id === id ? d.lead : r));
      else alert(d.message || 'Update failed');
    } catch (_) { alert('Cannot reach backend'); }
    finally { setSavingId(null); }
  };

  const editSlotTime = (l) => {
    const v = window.prompt('Slot time (e.g. "10:20 AM"):', l.slotTime || '');
    if (v !== null) patchLead(l._id, { slotTime: v });
  };

  const editNotes = (l) => {
    const v = window.prompt('Notes:', l.notes || '');
    if (v !== null) patchLead(l._id, { notes: v });
  };

  const editSlotDate = (l) => {
    const current = l.counsellingDate ? new Date(l.counsellingDate).toISOString().slice(0, 10) : '';
    const v = window.prompt('Counselling date (YYYY-MM-DD):', current);
    if (v === null) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) { alert('Please enter the date as YYYY-MM-DD'); return; }
    patchLead(l._id, { counsellingDate: v.trim() });
  };

  const editSlotWindow = (l) => {
    const v = window.prompt('Slot window (e.g. "10:00 AM - 12:00 PM"):', l.slotWindow || '');
    if (v !== null) patchLead(l._id, { slotWindow: v });
  };

  /* ── export to CSV (backend caps limit at 100/page) ────────────── */
  const csvEscape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = [];
      let p = 1, totalPages = 1;
      do {
        const d = await api.get(`/api/counselling?${buildParams(p, query, applied, 100)}`).then(r => r.json());
        if (!d.success) throw new Error('Backend returned an error');
        all.push(...(d.leads || []));
        totalPages = d.pages || 1;
        p++;
      } while (p <= totalPages);

      const headers = ['#', 'Name', 'Phone', 'CA Level', 'Route', 'Last Exam', 'Student Type', 'Attempt',
                       'Slot Date', 'Slot Window', 'Slot Status', 'Slot Time', 'Notes', 'Source', 'Campaign', 'Submissions', 'Registered'];
      const lines = [headers.join(',')];
      all.forEach((l, i) => {
        lines.push([
          i + 1, l.name || '', l.phone, l.caStatus || '', l.route || '', l.lastExam || '',
          l.studentType || '', l.attempt || '',
          l.counsellingDate ? fmtDate(l.counsellingDate) : '', l.slotWindow || '',
          l.slotStatus || '', l.slotTime || '', l.notes || '',
          l.source || '', l.campaign || '', l.submissionCount ?? 1,
          l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN') : '',
        ].map(csvEscape).join(','));
      });

      const csv  = '﻿' + lines.join('\r\n'); // BOM so Excel reads UTF-8
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `counselling-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + (e.message || 'unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const card = { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16 };
  const btn  = (bg, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 8, padding: '8px 18px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  });
  const th = { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
               color: '#94a3b8', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase' };
  const td = { padding: '12px 14px', fontSize: 13 };
  const selectStyle = { border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, padding: '8px 10px',
                        background: '#fff', color: '#374151', cursor: 'pointer', outline: 'none' };
  const setF = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }));

  const StatusSelect = ({ l }) => {
    const c = STATUS_COLORS[l.slotStatus] || STATUS_COLORS.pending;
    return (
      <select
        value={l.slotStatus || 'pending'}
        disabled={savingId === l._id}
        onChange={e => patchLead(l._id, { slotStatus: e.target.value })}
        style={{ background: c.bg, color: c.fg, border: 'none', borderRadius: 999, padding: '4px 10px',
                 fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none',
                 opacity: savingId === l._id ? 0.5 : 1 }}
      >
        {SLOT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
    );
  };

  const filterConfigs = [
    { key: 'slotStatus',  label: 'All Statuses',      options: SLOT_STATUSES.map(s => [s, s.replace('_', ' ')]) },
    { key: 'attempt',     label: 'All Attempts',      options: ATTEMPTS.map(v => [v, v]) },
    { key: 'studentType', label: 'All Student Types', options: STUDENT_TYPES.map(v => [v, v]) },
    { key: 'route',       label: 'All Routes',        options: ROUTES.map(v => [v, v]) },
  ];

  return (
    <div style={{ padding: mobile ? '16px 12px' : '24px 20px', maxWidth: 1500, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: mobile ? 19 : 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Counselling Bookings</h1>
          <p  style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>Free 1:1 mentor counselling slot requests — team calls back to confirm timing</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: mobile ? '100%' : 'auto' }}>
          <button
            onClick={exportCsv}
            disabled={exporting}
            style={{ ...btn('#2563eb'), flex: mobile ? 1 : 'none', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.7 : 1 }}
          >
            {exporting ? 'Exporting…' : '⤓ Export CSV'}
          </button>
          <button onClick={() => fetchRows(page)} style={{ ...btn(GREEN), flex: mobile ? 1 : 'none' }}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Search + filters ────────────────────────────────────────── */}
      <div style={{ ...card, padding: mobile ? '14px' : '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            style={{ flex: '1 1 220px', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 14px', fontSize: 13, outline: 'none', color: '#374151', minWidth: 0 }}
            placeholder="🔍  Search name / phone…"
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && apply()}
          />
          {filterConfigs.map(fc => (
            <select key={fc.key} value={filters[fc.key]} onChange={setF(fc.key)} style={selectStyle}>
              <option value="">{fc.label}</option>
              {fc.options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          ))}
          <input type="date" value={filters.startDate} onChange={setF('startDate')} style={selectStyle} title="From date" />
          <input type="date" value={filters.endDate}   onChange={setF('endDate')}   style={selectStyle} title="To date" />
          <div style={{ display: 'flex', gap: 8, width: mobile ? '100%' : 'auto' }}>
            <button onClick={apply} style={{ ...btn(GREEN), flex: mobile ? 1 : 'none' }}>Apply Filters</button>
            <button onClick={clear} style={{ ...btn('#f1f5f9', '#64748b'), flex: mobile ? 1 : 'none' }}>Clear</button>
          </div>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── MOBILE: card list ───────────────────────────────────────── */}
      {mobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>
          )}
          {!loading && rows.length === 0 && (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No counselling bookings yet.</div>
          )}
          {!loading && rows.map((l, i) => (
            <div key={l._id} style={{ ...card, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 15 }}>
                  <span style={{ color: '#cbd5e1', fontSize: 12, marginRight: 6 }}>#{(page - 1) * limit + i + 1}</span>
                  {l.name || 'Unknown'}
                </div>
                <StatusSelect l={l} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
                <a href={telLink(l.phone)} style={{ color: '#0f172a', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                  📞 {l.phone}
                </a>
                <CopyButton value={l.phone} size={15} />
                <a href={waLink(l.phone)} target="_blank" rel="noreferrer" style={{ color: '#15803d', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                  💬 WhatsApp
                </a>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {[l.caStatus, l.route, l.studentType, l.attempt].filter(Boolean).map((tag, k) => (
                  <span key={k} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                🗓 <strong style={{ fontWeight: 700, color: '#0f172a' }}>{fmtDate(l.counsellingDate)}</strong>
                <button onClick={() => editSlotDate(l)} style={{ ...btn('transparent', '#2563eb'), padding: '0 4px', fontSize: 12 }}>✎</button>
                {' · '}<strong style={{ fontWeight: 600 }}>{l.slotWindow || '—'}</strong>
                <button onClick={() => editSlotWindow(l)} style={{ ...btn('transparent', '#2563eb'), padding: '0 4px', fontSize: 12 }}>✎</button>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                Last exam: <strong style={{ fontWeight: 600 }}>{l.lastExam || '—'}</strong>
                {' · '}Slot: <strong style={{ fontWeight: 600 }}>{l.slotTime || '—'}</strong>
                <button onClick={() => editSlotTime(l)} style={{ ...btn('transparent', '#2563eb'), padding: '0 4px', fontSize: 12 }}>✎</button>
              </div>
              {l.notes && <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>📝 {l.notes}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
                <span>Registered: <strong style={{ color: '#64748b', fontWeight: 600 }}>{fmtDateTime(l.createdAt)}</strong></span>
                <button onClick={() => editNotes(l)} style={{ ...btn('#f1f5f9', '#64748b'), padding: '4px 10px', fontSize: 11 }}>📝 Notes</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── DESKTOP: table ────────────────────────────────────────── */
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                  {['#','Name','Phone','CA Level','Route','Last Exam','Student Type','Attempt','Slot Date','Window','Slot Status','Slot Time','Notes','Subs','Registered'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={15} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>Loading…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={15} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>No counselling bookings yet.</td></tr>
                )}
                {!loading && rows.map((l, i) => (
                  <tr
                    key={l._id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <td style={{ ...td, color: '#94a3b8', fontSize: 12 }}>{(page - 1) * limit + i + 1}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{l.name || '—'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <a href={telLink(l.phone)} title="Call — open dialer" style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>
                          📞 {l.phone}
                        </a>
                        <CopyButton value={l.phone} size={14} />
                        <a href={waLink(l.phone)} target="_blank" rel="noreferrer" title="Open in WhatsApp" style={{ textDecoration: 'none', fontSize: 15 }}>
                          💬
                        </a>
                      </span>
                    </td>
                    <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{l.caStatus || '—'}</td>
                    <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{l.route || '—'}</td>
                    <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{l.lastExam || '—'}</td>
                    <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{l.studentType || '—'}</td>
                    <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{l.attempt || '—'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{fmtDate(l.counsellingDate)}</span>
                      <button onClick={() => editSlotDate(l)} title="Edit counselling date" style={{ ...btn('transparent', '#2563eb'), padding: '0 6px', fontSize: 12 }}>✎</button>
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#475569' }}>{l.slotWindow || '—'}</span>
                      <button onClick={() => editSlotWindow(l)} title="Edit slot window" style={{ ...btn('transparent', '#2563eb'), padding: '0 6px', fontSize: 12 }}>✎</button>
                    </td>
                    <td style={td}><StatusSelect l={l} /></td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#475569' }}>{l.slotTime || '—'}</span>
                      <button onClick={() => editSlotTime(l)} title="Edit slot time" style={{ ...btn('transparent', '#2563eb'), padding: '0 6px', fontSize: 12 }}>✎</button>
                    </td>
                    <td style={{ ...td, maxWidth: 180 }}>
                      <span style={{ color: '#475569', display: 'inline-block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title={l.notes || ''}>
                        {l.notes || '—'}
                      </span>
                      <button onClick={() => editNotes(l)} title="Edit notes" style={{ ...btn('transparent', '#2563eb'), padding: '0 6px', fontSize: 12 }}>✎</button>
                    </td>
                    <td style={td}>
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                        {l.submissionCount ?? 1}×
                      </span>
                    </td>
                    <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDateTime(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination (shared) ─────────────────────────────────────── */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ color: '#475569' }}>{rows.length}</strong> of <strong style={{ color: '#475569' }}>{total}</strong>
          <select
            value={limit}
            onChange={e => { const lim = Number(e.target.value); setLimit(lim); fetchRows(1, query, applied, lim); }}
            style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, padding: '5px 8px', background: '#fff', color: '#374151', cursor: 'pointer', outline: 'none' }}
          >
            {[20, 50, 100].map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { label: '← Prev', disabled: page <= 1,     action: () => fetchRows(page - 1) },
            { label: 'Next →', disabled: page >= pages, action: () => fetchRows(page + 1) },
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
  );
}
