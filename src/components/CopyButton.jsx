import { useState } from 'react';

/* Small inline "copy to clipboard" button — used next to phone numbers. */
export default function CopyButton({ value, size = 13, title = 'Copy phone number' }) {
  const [copied, setCopied] = useState(false);

  const copy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = String(value ?? '');
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback for non-HTTPS / older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (_) {
      alert('Copy failed — please copy manually: ' + text);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied!' : title}
      aria-label={copied ? 'Copied' : title}
      style={{
        background: copied ? '#dcfce7' : 'transparent',
        border: 'none',
        borderRadius: 6,
        padding: '2px 4px',
        fontSize: size,
        lineHeight: 1,
        cursor: 'pointer',
        color: copied ? '#15803d' : '#94a3b8',
        flexShrink: 0,
      }}
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}
