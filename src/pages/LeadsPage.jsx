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

/* ── lead status options + colors ──────────────────────────────── */
const STATUSES = ['PENDING', 'PROCESSING', 'CONVERTED', 'CLOSE WITHOUT SALE', 'CLOSED'];
const STATUS_MAP = {
  PENDING:              { bg: '#fef9c3', color: '#92400e' },
  PROCESSING:           { bg: '#dbeafe', color: '#1d4ed8' },
  CONVERTED:            { bg: '#dcfce7', color: '#15803d' },
  'CLOSE WITHOUT SALE': { bg: '#fee2e2', color: '#b91c1c' },
  CLOSED:               { bg: '#f1f5f9', color: '#64748b' },
};


const DATE = (props) => (
  <input
    type="date"
    {...props}
    style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, padding: '7px 10px', background: '#fff', color: '#374151', outline: 'none' }}
  />
);

const EMPTY = { q: '', status: '', startDate: '', endDate: '' };

export default function LeadsPage() {
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState(EMPTY);
  const [inputQ,  setInputQ]  = useState('');
  const [editing, setEditing] = useState(null); // lead being edited in the modal

  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  // Persist status/notes for one lead, then patch it into the local rows.
  const saveLead = async (id, { status, notes }) => {
    const res = await api.patch(`/api/rti/leads/${id}`, { status, notes });
    const d = await res.json();
    if (!d.success) throw new Error(d.message || 'Update failed');
    setRows(prev => prev.map(r => r._id === id ? { ...r, status: d.lead.status, notes: d.lead.notes } : r));
  };

  const fetchRows = async (p = 1, f = filters) => {
    setLoading(true); setError('');
    const q = new URLSearchParams({ page: p, limit: 50 });
    if (f.q)         q.set('q', f.q);
    if (f.status)    q.set('status', f.status);
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
          <select
            value={filters.status}
            onChange={e => setF('status', e.target.value)}
            style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, padding: '8px 10px', background: '#fff', color: '#374151', cursor: 'pointer', outline: 'none', minWidth: 140 }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
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
                {['#','Phone','Source','Campaign','Status','Notes','Captured At','Action'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>No leads found.</td></tr>
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
                  <td style={td}>
                    {(() => {
                      const s = STATUS_MAP[l.status] || { bg: '#f1f5f9', color: '#64748b' };
                      return (
                        <select
                          value={l.status || 'PENDING'}
                          onChange={async (e) => {
                            try { await saveLead(l._id, { status: e.target.value }); }
                            catch (err) { alert(err.message || 'Failed to update status'); }
                          }}
                          style={{ background: s.bg, color: s.color, border: 'none', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer', outline: 'none' }}
                        >
                          {STATUSES.map(opt => (
                            <option key={opt} value={opt} style={{ background: '#fff', color: '#374151' }}>{opt}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </td>
                  <td style={{ ...td, color: '#64748b', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.notes || ''}>{l.notes || '—'}</td>
                  <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDateTime(l.createdAt)}</td>
                  <td style={td}>
                    <button
                      onClick={() => setEditing(l)}
                      style={{ background: '#eef2ff', color: '#4338ca', border: '1.5px solid #c7d2fe', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ✎ Notes
                    </button>
                  </td>
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

      {/* ── Edit status / notes modal ───────────────────────────────── */}
      {editing && (
        <LeadEditModal
          lead={editing}
          onClose={() => setEditing(null)}
          onSave={saveLead}
        />
      )}
    </div>
  );
}

/* ── Edit notes popup ────────────────────────────────────────────── */
function LeadEditModal({ lead, onClose, onSave }) {
  const [notes,  setNotes]  = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      await onSave(lead._id, { notes });
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 110 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: 440, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1.5px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Edit Notes</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{lead.phone}</div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 17, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7, display: 'block' }}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Add a note about this lead…"
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', color: '#374151', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />

          {error && <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, marginTop: 12 }}>⚠️ {error}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ background: saving ? '#94d3be' : GREEN, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
