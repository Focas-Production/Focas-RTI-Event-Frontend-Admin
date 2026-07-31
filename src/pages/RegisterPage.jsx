import { useState } from 'react';
import { api } from '../lib/api.js';

const GREEN = '#1D9E75';

const INIT = { name: '', phone: '', email: '', appliedForSep: '', appliedForRTI: '', groupSelection: [], rtiUrls: {} };

// Subject keys must match the backend Attendee schema (group1RtiUrl / group2RtiUrl).
const RTI_SUBJECTS = {
  'Group 1': {
    payloadKey: 'group1RtiUrl',
    subjects: [
      ['advancedAccounting',          'Advanced Accounting'],
      ['corporateLaw',                'Corporate Law'],
      ['incomeTaxLaw',                'Income Tax Law'],
      ['gst',                         'GST'],
    ],
  },
  'Group 2': {
    payloadKey: 'group2RtiUrl',
    subjects: [
      ['costandManagementAccounting', 'Cost & Management Accounting'],
      ['auditingEthics',              'Auditing & Ethics'],
      ['fm',                          'Financial Management'],
      ['sm',                          'Strategic Management'],
    ],
  },
};

export default function RegisterPage() {
  const [form,    setForm]    = useState(INIT);
  const [status,  setStatus]  = useState('idle'); // idle | loading | success
  const [error,   setError]   = useState('');
  const [created, setCreated] = useState(null);

  const toggleGroup = (g) =>
    setForm(f => ({
      ...f,
      groupSelection: f.groupSelection.includes(g)
        ? f.groupSelection.filter(x => x !== g)
        : [...f.groupSelection, g],
    }));

  // Keep in sync with backend PRICES in controllers/attendeeController.js
  const price = form.groupSelection.length === 2 ? '₹999' : '₹499';

  const submit = async () => {
    setError('');
    if (!form.name.trim())             return setError('Full name is required.');
    if (form.phone.length !== 10)      return setError('Enter a valid 10-digit phone number.');
    if (!form.email.trim())            return setError('Email is required.');
    if (!form.appliedForSep)           return setError('Please answer the Sep 2026 question.');
    if (!form.appliedForRTI)           return setError('Please answer the RTI question.');
    if (!form.groupSelection.length)   return setError('Please select at least one group.');

    // Optional RTI links — validate any filled-in URL and group them by payload key.
    const rtiPayload = {};
    for (const g of form.groupSelection) {
      const { payloadKey, subjects } = RTI_SUBJECTS[g];
      for (const [key, title] of subjects) {
        const url = (form.rtiUrls[key] || '').trim();
        if (!url) continue;
        if (!/^https?:\/\/\S+$/i.test(url)) return setError(`Invalid RTI link for ${title} — must start with http:// or https://`);
        (rtiPayload[payloadKey] ??= {})[key] = url;
      }
    }

    const payload = {
      name:           form.name.trim(),
      phone:          `+91${form.phone}`,
      email:          form.email.trim(),
      appliedForSep:  form.appliedForSep,
      appliedForRTI:  form.appliedForRTI,
      groupSelection: form.groupSelection.length === 2 ? 'Both Group' : form.groupSelection[0],
      ...rtiPayload,
    };

    setStatus('loading');
    try {
      const res  = await api.post('/api/attendees/manual-register', payload);
      const data = await res.json();
      if (res.ok && data.success) { setCreated(data.attendee); setStatus('success'); }
      else { setError(data.message || 'Registration failed.'); setStatus('idle'); }
    } catch (_) {
      setError('Network error — check backend connection.'); setStatus('idle');
    }
  };

  const reset = () => { setForm(INIT); setStatus('idle'); setError(''); setCreated(null); };

  /* ── styles ────────────────────────────────────────────────────── */
  const card  = { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '28px 28px' };
  const input = {
    width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px',
    fontSize: 14, outline: 'none', color: '#374151', boxSizing: 'border-box',
    transition: 'border-color .15s',
  };
  const label = { fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7, display: 'block' };
  const field = { display: 'flex', flexDirection: 'column', gap: 0 };

  const toggleBtn = (active) => ({
    flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: active ? `2px solid ${GREEN}` : '2px solid #e2e8f0',
    background: active ? '#f0fdf4' : '#fff',
    color: active ? GREEN : '#64748b', transition: 'all .15s',
  });

  /* ── Success view ─────────────────────────────────────────────── */
  if (status === 'success' && created) {
    return (
      <div style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Manual Registration</h1>
          <p  style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>Admin — direct entry with payment pre-confirmed</p>
        </div>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 56, marginBottom: 10 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>Registered Successfully!</h2>
            <p  style={{ fontSize: 13, color: '#64748b', margin: 0 }}>QR generated. Email &amp; WhatsApp confirmation sent.</p>
          </div>

          {/* Attendee card */}
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a' }}>{created.name}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{created.phone}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{created.email}</div>
              </div>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                ✓ paid
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {[
                { v: created.groupSelection, bg: '#ede9fe', color: '#6d28d9' },
                { v: `₹${((created.amount || 0) / 100).toLocaleString('en-IN')}`, bg: '#f1f5f9', color: '#374151' },
                { v: `Sep: ${created.appliedForSep}`, bg: '#f0fdf4', color: '#166534' },
                { v: `RTI: ${created.appliedForRTI}`, bg: '#f0fdf4', color: '#166534' },
                ...(created.isrtiUrl ? [{ v: '🔗 RTI links added', bg: '#eff6ff', color: '#1d4ed8' }] : []),
              ].map(({ v, bg, color }) => (
                <span key={v} style={{ background: bg, color, padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{v}</span>
              ))}
            </div>
          </div>

          <button
            onClick={reset}
            style={{ width: '100%', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 900, cursor: 'pointer', background: GREEN, color: '#fff', border: 'none' }}
          >
            + Register Another Student
          </button>
        </div>
      </div>
    );
  }

  /* ── Form view ────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Manual Registration</h1>
        <p  style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>Admin — direct entry with payment pre-confirmed</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Name */}
          <div style={field}>
            <label style={label}>Full Name *</label>
            <input
              style={input} type="text" placeholder="e.g. Priya Sharma"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onFocus={e => e.target.style.borderColor = GREEN}
              onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Phone */}
          <div style={field}>
            <label style={label}>WhatsApp Number *</label>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <span style={{
                display: 'flex', alignItems: 'center', padding: '11px 14px',
                border: '1.5px solid #e2e8f0', borderRight: 'none',
                borderRadius: '10px 0 0 10px', background: '#f8fafc',
                fontSize: 14, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap',
              }}>+91</span>
              <input
                style={{ ...input, borderRadius: '0 10px 10px 0' }}
                type="tel" inputMode="numeric" maxLength={10}
                placeholder="98765 43210"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                onFocus={e => e.target.style.borderColor = GREEN}
                onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Email */}
          <div style={field}>
            <label style={label}>Email ID *</label>
            <input
              style={input} type="email" placeholder="student@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onFocus={e => e.target.style.borderColor = GREEN}
              onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Applied for Sep */}
          <div style={field}>
            <label style={label}>Applied for CA Inter Sep 2026? *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Yes', 'No'].map(opt => (
                <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, appliedForSep: opt }))}
                  style={toggleBtn(form.appliedForSep === opt)}>
                  {form.appliedForSep === opt ? '✓ ' : ''}{opt}
                </button>
              ))}
            </div>
          </div>

          {/* Applied for RTI */}
          <div style={field}>
            <label style={label}>Applied for RTI? *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Yes', 'Not yet'].map(opt => (
                <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, appliedForRTI: opt }))}
                  style={toggleBtn(form.appliedForRTI === opt)}>
                  {form.appliedForRTI === opt ? '✓ ' : ''}{opt}
                </button>
              ))}
            </div>
          </div>

          {/* Group selection */}
          <div style={field}>
            <label style={label}>Groups Applying For *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Group 1', 'Group 2'].map(g => (
                <button key={g} type="button" onClick={() => toggleGroup(g)}
                  style={toggleBtn(form.groupSelection.includes(g))}>
                  {form.groupSelection.includes(g) ? '✓ ' : ''}{g}
                </button>
              ))}
            </div>
            {form.groupSelection.length > 0 && (
              <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                {form.groupSelection.length === 2 ? 'Both groups' : form.groupSelection[0]}
                {' — '}
                <strong style={{ color: GREEN }}>{price}</strong>
              </div>
            )}
          </div>

          {/* RTI links (optional) — one URL per subject of the selected group(s) */}
          {form.groupSelection.length > 0 && (
            <div style={field}>
              <label style={label}>RTI Links <span style={{ fontWeight: 500, color: '#94a3b8' }}>(optional)</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...form.groupSelection].sort().map(g => (
                  <div key={g} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, marginBottom: 8 }}>{g}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {RTI_SUBJECTS[g].subjects.map(([key, title]) => (
                        <div key={key}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>{title}</div>
                          <input
                            style={{ ...input, padding: '9px 12px', fontSize: 13 }}
                            type="url" placeholder="https://…"
                            value={form.rtiUrls[key] || ''}
                            onChange={e => setForm(f => ({ ...f, rtiUrls: { ...f.rtiUrls, [key]: e.target.value } }))}
                            onFocus={e => e.target.style.borderColor = GREEN}
                            onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={status === 'loading'}
            style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 900, cursor: status === 'loading' ? 'not-allowed' : 'pointer', background: GREEN, color: '#fff', border: 'none', opacity: status === 'loading' ? 0.75 : 1, transition: 'opacity .15s' }}
          >
            {status === 'loading' ? 'Registering…' : `Register Student — ${price}`}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', margin: 0 }}>
            Payment is marked as paid immediately. QR, email &amp; WhatsApp sent automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
