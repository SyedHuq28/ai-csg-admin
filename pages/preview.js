import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

export default function PreviewPage() {
  const router = useRouter();
  const view = useMemo(() => (router.query.view === 'review' ? 'review' : 'dashboard'), [router.query.view]);
  const [pr, setPr] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return;

    const tokenKey = view === 'review' ? 'adminPrToken' : 'adminToken';
    const fallbackTokenKey = view === 'review' ? 'adminToken' : 'adminPrToken';
    const token = sessionStorage.getItem(tokenKey) || sessionStorage.getItem(fallbackTokenKey);
    if (!token) {
      router.replace(view === 'review' ? '/review' : '/');
      return;
    }

    let ignore = false;
    async function loadPreview() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/pr-status?view=${view}`, {
          headers: { 'x-admin-token': token },
        });
        const data = await response.json();
        if (ignore) return;
        if (response.ok) {
          setPr(data.pr);
          if (!data.pr) setError('No preview is available for this queue.');
        } else {
          setError(data.error || 'Could not load preview.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadPreview();
    return () => {
      ignore = true;
    };
  }, [router, view]);

  const backHref = view === 'review' ? '/review' : '/dashboard';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f6f8fa' }}>
      <header style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #d0d7de', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem' }}>Preview</h1>
          {pr && <p style={{ margin: '0.25rem 0 0', color: '#555' }}>PR #{pr.number} - {pr.title}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {pr?.rawPreviewUrl && (
            <a href={pr.rawPreviewUrl} target="_blank" rel="noreferrer" style={{ padding: '0.5rem 0.8rem', background: '#eee', border: '1px solid #ccc', borderRadius: 6, textDecoration: 'none', color: '#222' }}>
              Open external
            </a>
          )}
          <a href={backHref} style={{ padding: '0.5rem 0.8rem', background: '#0070f3', color: '#fff', borderRadius: 6, textDecoration: 'none' }}>
            Back
          </a>
        </div>
      </header>

      <main style={{ flex: 1, minHeight: 0 }}>
        {loading && <p style={{ padding: '1rem', margin: 0 }}>Loading preview...</p>}
        {!loading && error && <p style={{ padding: '1rem', margin: 0, color: '#cf222e' }}>{error}</p>}
        {!loading && pr?.previewUrl && (
          <iframe
            title={`Preview for PR ${pr.number}`}
            src={pr.previewUrl}
            style={{ width: '100%', height: 'calc(100vh - 73px)', border: 0, background: '#fff' }}
          />
        )}
      </main>
    </div>
  );
}
