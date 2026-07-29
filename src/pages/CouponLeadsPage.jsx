import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import CopyButton from '../components/CopyButton.jsx';

const GREEN = '#1D9E75';

export default function CouponLeadsPage() {
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [inputQ,  setInputQ]  = useState('');
  const [query,   setQuery]   = useState('');
  const [limit,   setLimit]   = useState(50);
  const [exporting, setExporting] = useState(false);
  const [mobile,  setMobile]  = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const waLink  = (p) => `https://wa.me/${String(p).replace(/\D/g, '')}`;
  const telLink = (p) => `tel:+${String(p).replace(/\D/g, '')}`;

  const fetchRows = async (p = 1, q = query, lim = limit) => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ page: p, limit: lim });
    if (q) params.set('q', q);
    try {
      const d = await api.get(`/api/rti/coupon/leads?${params}`).then(r => r.json());
      if (d.success) { setRows(d.leads); setTotal(d.total); setPages(d.pages || 1); setPage(p); }
      else setError('Failed to load coupon leads.');
    } catch (_) { setError('Cannot reach backend — check VITE_BACKEND_URL in .env'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRows(1, ''); }, []);

  const apply = () => { setQuery(inputQ); fetchRows(1, inputQ); };
  const clear = () => { setInputQ(''); setQuery(''); fetchRows(1, ''); };

  /* ── export all coupon leads to CSV (frontend-only) ────────────── */
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
        const params = new URLSearchParams({ page: p, limit: 3000 });
        if (query) params.set('q', query);
        const d = await api.get(`/api/rti/coupon/leads?${params}`).then(r => r.json());
        if (!d.success) throw new Error('Backend returned an error');
        all.push(...(d.leads || []));
        totalPages = d.pages || 1;
        p++;
      } while (p <= totalPages);

      const headers = ['#', 'Name', 'Phone', 'Clicks', 'Campaign', 'First Requested', 'Last Requested'];
      const lines = [headers.join(',')];
      all.forEach((l, i) => {
        lines.push([
          i + 1,
          l.name || '',
          l.phone,
          l.clickCount ?? 1,
          l.campaign || '',
          l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN') : '',
          l.updatedAt ? new Date(l.updatedAt).toLocaleString('en-IN') : '',
        ].map(csvEscape).join(','));
      });

      const csv  = '﻿' + lines.join('\r\n'); // BOM so Excel reads UTF-8
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `coupon-leads-${new Date().toISOString().slice(0, 10)}.csv`;
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

  const ClicksBadge = ({ n }) => (
    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
      {n ?? 1}×
    </span>
  );

  return (
    <div style={{ padding: mobile ? '16px 12px' : '24px 20px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: mobile ? 19 : 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Coupon Requests</h1>
          <p  style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>Contacts who clicked “Get Coupon” on WhatsApp — duplicates merged, paid registrations hidden</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: mobile ? '100%' : 'auto' }}>
          <button
            onClick={exportCsv}
            disabled={exporting}
            style={{ ...btn('#2563eb'), flex: mobile ? 1 : 'none', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.7 : 1 }}
          >
            {exporting ? 'Exporting…' : '⤓ Export CSV'}
          </button>
          <button onClick={() => fetchRows(page, query)} style={{ ...btn(GREEN), flex: mobile ? 1 : 'none' }}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────── */}
      <div style={{ ...card, padding: mobile ? '14px' : '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            style={{ flex: '1 1 240px', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 14px', fontSize: 13, outline: 'none', color: '#374151', minWidth: 0 }}
            placeholder="🔍  Search name / phone…"
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && apply()}
          />
          <div style={{ display: 'flex', gap: 8, width: mobile ? '100%' : 'auto' }}>
            <button onClick={apply} style={{ ...btn(GREEN), flex: mobile ? 1 : 'none' }}>Search</button>
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
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No coupon requests yet.</div>
          )}
          {!loading && rows.map((l, i) => (
            <div key={l._id} style={{ ...card, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 15 }}>
                  <span style={{ color: '#cbd5e1', fontSize: 12, marginRight: 6 }}>#{(page - 1) * limit + i + 1}</span>
                  {l.name || 'Unknown'}
                </div>
                <ClicksBadge n={l.clickCount} />
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
                <span>First: <strong style={{ color: '#64748b', fontWeight: 600 }}>{fmtDateTime(l.createdAt)}</strong></span>
                <span>Last: <strong style={{ color: '#64748b', fontWeight: 600 }}>{fmtDateTime(l.updatedAt)}</strong></span>
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
                  {['#','Name','Phone','Clicks','Campaign','First Requested','Last Requested'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>Loading…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, textAlign: 'center', padding: 56, color: '#94a3b8' }}>No coupon requests yet.</td></tr>
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
                    <td style={td}><ClicksBadge n={l.clickCount} /></td>
                    <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{l.campaign || '—'}</td>
                    <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDateTime(l.createdAt)}</td>
                    <td style={{ ...td, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDateTime(l.updatedAt)}</td>
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
            onChange={e => { const lim = Number(e.target.value); setLimit(lim); fetchRows(1, query, lim); }}
            style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, padding: '5px 8px', background: '#fff', color: '#374151', cursor: 'pointer', outline: 'none' }}
          >
            {[50, 100, 250, 500, 1000, 2000, 3000].map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { label: '← Prev', disabled: page <= 1,     action: () => fetchRows(page - 1, query) },
            { label: 'Next →', disabled: page >= pages, action: () => fetchRows(page + 1, query) },
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
