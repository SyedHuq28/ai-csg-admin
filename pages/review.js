import { useEffect, useState } from 'react';

export default function ReviewPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [pr, setPr] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function refresh(nextToken = token) {
    if (!nextToken) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/pr-status?view=review', {
        headers: { 'x-admin-token': nextToken },
      });
      const data = await response.json();
      if (response.ok) {
        setPr(data.pr);
      } else {
        setError(data.error || 'Could not load pending review.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = sessionStorage.getItem('adminPrToken');
    if (storedToken) {
      setToken(storedToken);
      refresh(storedToken);
    }
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/review-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (response.ok) {
      sessionStorage.setItem('adminPrToken', data.token);
      setToken(data.token);
      setStatus('');
      refresh(data.token);
    } else {
      setError(data.error || 'Login failed.');
    }
  }

  async function postDecision(path, confirmText, successText) {
    if (!token || !pr) return;
    if (!window.confirm(confirmText)) return;
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setStatus(successText(data));
        setPr(null);
      } else {
        setError(data.error || 'Action failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem('adminPrToken');
    setToken(null);
    setPr(null);
    setStatus('');
    setError('');
  }

  if (!token) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 640, margin: '0 auto', padding: '2rem' }}>
        <h1>AI Centre Review</h1>
        <p>Log in to approve or reject pending admin changes.</p>
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1rem' }}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }} />
          </label>
          <button type="submit" style={{ padding: '0.75rem', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Log in
          </button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 860, margin: '0 auto', padding: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1>AI Centre Review</h1>
          <p>Review the pending admin PR and choose whether to publish it.</p>
        </div>
        <button onClick={logout} style={{ padding: '0.75rem 1rem', background: '#eee', border: '1px solid #ccc', borderRadius: 6 }}>
          Log out
        </button>
      </header>

      <section style={{ padding: '1rem 1.25rem', border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Pending changes</h2>
          <button onClick={() => refresh()} disabled={loading} style={{ padding: '0.4rem 0.75rem', background: '#eee', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {!pr && !loading && <p style={{ margin: '0.75rem 0 0', color: '#555' }}>No pending admin PR.</p>}

        {pr && (
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ margin: '0 0 0.5rem' }}>
              <a href={pr.url} target="_blank" rel="noreferrer"><strong>PR #{pr.number}</strong> - {pr.title}</a>
            </p>
            {pr.commits?.length > 0 && (
              <ul style={{ margin: '0.5rem 0 1rem 1.25rem' }}>
                {pr.commits.map((commit) => (
                  <li key={commit.sha}><code>{commit.sha}</code> {commit.message}</li>
                ))}
              </ul>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {pr.previewUrl && (
                <a href="/preview?view=review" style={{ padding: '0.5rem 0.9rem', background: '#0070f3', color: '#fff', borderRadius: 6, textDecoration: 'none' }}>
                  Open preview
                </a>
              )}
              <button
                onClick={() => postDecision('/api/merge', `Approve and publish PR #${pr.number}?`, (data) => `Approved PR #${data.prNumber}. The live site will rebuild shortly.`)}
                disabled={loading}
                style={{ padding: '0.5rem 0.9rem', background: '#1f883d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                Approve & publish
              </button>
              <button
                onClick={() => postDecision('/api/reject', `Reject PR #${pr.number}?`, (data) => `Rejected PR #${data.prNumber}.`)}
                disabled={loading}
                style={{ padding: '0.5rem 0.9rem', background: '#cf222e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                Reject
              </button>
              <a href={pr.url} target="_blank" rel="noreferrer" style={{ padding: '0.5rem 0.9rem', background: '#eee', border: '1px solid #ccc', borderRadius: 6, textDecoration: 'none', color: '#222' }}>
                View on GitHub
              </a>
            </div>
          </div>
        )}
      </section>

      {status && <p style={{ color: 'green' }}>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
