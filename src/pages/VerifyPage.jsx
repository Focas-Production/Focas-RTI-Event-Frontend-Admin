import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

const GREEN = '#1D9E75';

const RESULT = {
  success:  { bg: '#f0fdf4', border: '#86efac', icon: '✅', title: 'Attendance Marked!',    color: '#15803d' },
  already:  { bg: '#fffbeb', border: '#fcd34d', icon: '⚠️', title: 'Already Verified',      color: '#92400e' },
  notPaid:  { bg: '#fef2f2', border: '#fca5a5', icon: '❌', title: 'Payment Not Completed', color: '#b91c1c' },
  notFound: { bg: '#f8fafc', border: '#cbd5e1', icon: '🔍', title: 'Attendee Not Found',    color: '#475569' },
  error:    { bg: '#fef2f2', border: '#fca5a5', icon: '⚠️', title: 'Error',                 color: '#b91c1c' },
};

function ResultCard({ result, onReset, resetLabel = 'Verify Another →' }) {
  if (!result) return null;
  const c = RESULT[result.type];
  return (
    <div style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 16, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 32 }}>{c.icon}</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: c.color }}>{c.title}</span>
      </div>
      {result.attendee && (
        <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Name: </span><strong style={{ color: '#0f172a', fontSize: 15 }}>{result.attendee.name}</strong></div>
          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Phone: </span>{result.attendee.phone}</div>
          <div><span style={{ color: '#64748b', fontWeight: 600 }}>Group: </span><strong style={{ color: GREEN }}>{result.attendee.groupSelection}</strong></div>
          {result.attendee.scanTime && (
            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Time: </span>{new Date(result.attendee.scanTime).toLocaleString('en-IN')}</div>
          )}
        </div>
      )}
      {result.message && <div style={{ fontSize: 13, color: c.color, marginBottom: 10 }}>{result.message}</div>}
      <button onClick={onReset} style={{ width: '100%', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#fff', color: c.color, border: `2px solid ${c.border}` }}>
        {resetLabel}
      </button>
    </div>
  );
}

export default function VerifyPage() {
  const [mainTab,       setMainTab]       = useState('qr');
  const [qrTab,         setQrTab]         = useState('camera');
  const [cameraOn,      setCameraOn]      = useState(false);
  const [cameraError,   setCameraError]   = useState('');
  const [result,        setResult]        = useState(null);
  const [processing,    setProcessing]    = useState(false);
  const [searchQ,       setSearchQ]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr,     setSearchErr]     = useState('');

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const activeRef = useRef(false);

  /* ── verify API ─────────────────────────────────────────────────── */
  const callVerify = useCallback(async (qrData) => {
    setProcessing(true); setResult(null);
    try {
      const res  = await api.post('/api/attendees/verify', { qrData });
      const data = await res.json();
      if      (res.status === 200 && data.success)  setResult({ type: 'success',  attendee: data.attendee });
      else if (res.status === 200 && !data.success) setResult({ type: 'already',  attendee: data.attendee });
      else if (res.status === 403)                  setResult({ type: 'notPaid',  attendee: data.attendee });
      else if (res.status === 404)                  setResult({ type: 'notFound' });
      else                                          setResult({ type: 'error',    message: data.message || 'Verification failed' });
    } catch (_) {
      setResult({ type: 'error', message: 'Network error — check backend connection.' });
    } finally { setProcessing(false); }
  }, []);

  /* ── scan loop ──────────────────────────────────────────────────── */
  const scanFrame = useCallback(() => {
    if (!activeRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) { rafRef.current = requestAnimationFrame(scanFrame); return; }
    if (v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) {
      rafRef.current = requestAnimationFrame(scanFrame); return;
    }
    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    const code = window.jsQR?.(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
    if (code?.data) { stopCamera(); callVerify(code.data); return; }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [callVerify]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(''); setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        setTimeout(reject, 8000);
      });
      await video.play();
      activeRef.current = true;
      setCameraOn(true);
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      const msg = err?.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access in browser settings.'
                : err?.name === 'NotFoundError'   ? 'No camera found on this device.'
                : `Camera error: ${err?.message || 'Unknown'}`;
      setCameraError(msg);
    }
  }, [scanFrame]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── file upload ────────────────────────────────────────────────── */
  const handleUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setResult(null);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      const id   = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      const code = window.jsQR?.(id.data, id.width, id.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) callVerify(code.data);
      else setResult({ type: 'error', message: 'No valid QR code found in this image.' });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  /* ── manual search ──────────────────────────────────────────────── */
  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setSearchLoading(true); setSearchErr(''); setResult(null);
    try {
      const d = await api.get(`/api/attendees/search?q=${encodeURIComponent(searchQ.trim())}&limit=10`).then(r => r.json());
      if (d.success) { setSearchResults(d.attendees); if (!d.attendees.length) setSearchErr('No attendees found.'); }
      else setSearchErr('Search failed.');
    } catch (_) { setSearchErr('Network error.'); }
    finally { setSearchLoading(false); }
  };

  const markFromSearch = async (id) => { await callVerify(id); if (searchQ.trim()) doSearch(); };
  const switchMain = (t) => { stopCamera(); setResult(null); setSearchResults([]); setSearchQ(''); setMainTab(t); };
  const switchQr   = (t) => { if (t !== 'camera') stopCamera(); setResult(null); setQrTab(t); };

  /* ── badge ──────────────────────────────────────────────────────── */
  const BADGE = {
    paid: '#dcfce7:#15803d', pending: '#fee2e2:#b91c1c',
    'Group 1': '#ede9fe:#6d28d9', 'Group 2': '#dbeafe:#1d4ed8', 'Both Group': '#fef9c3:#92400e',
  };
  const SmBadge = ({ v }) => {
    const [bg, color] = (BADGE[v] || '#f1f5f9:#64748b').split(':');
    return <span style={{ background: bg, color, padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{v}</span>;
  };

  const card    = { background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: '20px' };
  const mainBtn = (a) => ({ padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: a ? GREEN : '#f1f5f9', color: a ? '#fff' : '#64748b' });
  const subBtn  = (a) => ({ padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: a ? `2px solid ${GREEN}` : '2px solid #e2e8f0', background: a ? '#f0fdf4' : '#fff', color: a ? GREEN : '#64748b' });

  /* ── whether to show scanner UI ─────────────────────────────────── */
  const showScanner = !result && !processing;

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>Attendance Verification</h1>
        <p  style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>Scan QR code or search manually</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => switchMain('qr')}     style={mainBtn(mainTab === 'qr')}>📷 QR Scanner</button>
        <button onClick={() => switchMain('manual')} style={mainBtn(mainTab === 'manual')}>🔍 Manual Lookup</button>
      </div>

      {/* ── QR section ─────────────────────────────────────────────── */}
      {mainTab === 'qr' && (
        <div style={card}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button onClick={() => switchQr('camera')} style={subBtn(qrTab === 'camera')}>📸 Camera</button>
            <button onClick={() => switchQr('upload')} style={subBtn(qrTab === 'upload')}>🖼️ Upload Image</button>
          </div>

          {/* Hidden canvas — always in DOM */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* ── RESULT shown at top (camera hidden) ─────────────────── */}
          {processing && (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 15, color: '#94a3b8', fontWeight: 700 }}>
              🔄&nbsp; Verifying…
            </div>
          )}

          {result && !processing && (
            <div style={{ marginBottom: 0 }}>
              <ResultCard
                result={result}
                resetLabel="📷 Scan Another"
                onReset={() => setResult(null)}
              />
            </div>
          )}

          {/* ── CAMERA TAB — hidden when result / processing ─────────── */}
          {/* Video element always stays in DOM; only the wrapper hides   */}
          <div style={{ display: qrTab === 'camera' && showScanner ? 'block' : 'none' }}>

            {/* Viewport — square for maximum size on mobile */}
            <div style={{
              position:       'relative',
              width:          '100%',
              aspectRatio:    '1 / 1',
              background:     '#111',
              borderRadius:   18,
              overflow:       'hidden',
              border:         cameraOn ? `3px solid ${GREEN}` : '2px solid #e2e8f0',
              marginBottom:   14,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}>
              {/* Idle placeholder */}
              {!cameraOn && !cameraError && (
                <div style={{ textAlign: 'center', color: '#6b7280', zIndex: 1 }}>
                  <div style={{ fontSize: 52, marginBottom: 10 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Tap below to start camera</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: '#94a3b8' }}>Hold QR code in frame to scan</div>
                </div>
              )}

              {/* Video — ALWAYS in DOM, toggled by display only */}
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  position:   'absolute',
                  inset:      0,
                  width:      '100%',
                  height:     '100%',
                  objectFit:  'cover',
                  display:    cameraOn ? 'block' : 'none',
                }}
              />

              {/* Scan overlay */}
              {cameraOn && (
                <>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', pointerEvents: 'none' }} />
                  <div style={{
                    position:     'absolute',
                    width:        '78%',
                    aspectRatio:  '1',
                    border:       '3px solid rgba(255,255,255,0.8)',
                    borderRadius: 20,
                    boxShadow:    '0 0 0 2000px rgba(0,0,0,0.4)',
                    zIndex:       2,
                  }}>
                    {[
                      { top: -3, left: -3, borderRight: 'none', borderBottom: 'none' },
                      { top: -3, right: -3, borderLeft: 'none', borderBottom: 'none' },
                      { bottom: -3, left: -3, borderRight: 'none', borderTop: 'none' },
                      { bottom: -3, right: -3, borderLeft: 'none', borderTop: 'none' },
                    ].map((s, i) => (
                      <div key={i} style={{ position: 'absolute', width: 32, height: 32, border: `4px solid ${GREEN}`, borderRadius: 6, ...s }} />
                    ))}
                  </div>
                  <div style={{ position: 'absolute', bottom: 16, zIndex: 3, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '6px 18px', borderRadius: 99, letterSpacing: '0.01em' }}>
                    Point QR code inside the frame
                  </div>
                </>
              )}
            </div>

            {/* Camera controls */}
            {!cameraOn ? (
              <button onClick={startCamera}
                style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, fontWeight: 900, cursor: 'pointer', background: GREEN, color: '#fff', border: 'none' }}>
                📷 Start Camera
              </button>
            ) : (
              <button onClick={stopCamera}
                style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fca5a5' }}>
                ⏹ Stop Camera
              </button>
            )}

            {cameraError && (
              <div style={{ marginTop: 12, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                ⚠️ {cameraError}
              </div>
            )}
          </div>

          {/* ── UPLOAD TAB ───────────────────────────────────────────── */}
          {qrTab === 'upload' && showScanner && (
            <label
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, border: '2px dashed #cbd5e1', borderRadius: 14, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.background = '#f0fdf4'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = ''; }}
            >
              <span style={{ fontSize: 40, marginBottom: 10 }}>🖼️</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>Click to upload QR image</span>
              <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>PNG, JPG, WEBP</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            </label>
          )}
        </div>
      )}

      {/* ── Manual lookup ───────────────────────────────────────────── */}
      {mainTab === 'manual' && (
        <div style={card}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', color: '#374151' }}
              placeholder="Name, phone or email…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
            />
            <button onClick={doSearch}
              style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Search
            </button>
          </div>

          {searchLoading && <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>Searching…</div>}
          {searchErr     && <div style={{ color: '#d97706', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{searchErr}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {searchResults.map(a => (
              <div key={a._id} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', margin: '3px 0 8px' }}>{a.phone} · {a.email}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <SmBadge v={a.groupSelection} />
                      <SmBadge v={a.paymentStatus} />
                      {a.attended && <span style={{ background: '#cffafe', color: '#0e7490', padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>✓ Attended</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {a.paymentStatus === 'paid' && !a.attended && (
                      <button onClick={() => markFromSearch(a._id)} disabled={processing}
                        style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: processing ? 0.7 : 1 }}>
                        Mark Attended
                      </button>
                    )}
                    {a.attended        && <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 13 }}>✓ Verified</span>}
                    {!a.attended && a.paymentStatus !== 'paid' && <span style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>Unpaid</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {processing && <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '16px 0', fontWeight: 600 }}>🔄 Verifying…</div>}
          {result && !processing && (
            <div style={{ marginTop: 14 }}>
              <ResultCard result={result} onReset={() => { setResult(null); setSearchResults([]); setSearchQ(''); }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
