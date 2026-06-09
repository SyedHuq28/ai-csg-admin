import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('adminToken');
      if (token) {
        router.replace('/dashboard');
      }
    }
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok) {
      sessionStorage.setItem('adminToken', data.token);
      router.push('/dashboard');
    } else {
      setError(data.error || 'Login failed.');
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 640, margin: '0 auto', padding: '2rem' }}>
      <h1>AI Centre Admin</h1>
      <p>Log in with the shared username and password to create or update content.</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }}
          />
        </label>
        <button type="submit" style={{ padding: '0.75rem', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Log in
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fb', borderRadius: 8 }}>
        <h2>Supported content</h2>
        <p>This admin app can create or append new entries for:</p>
        <ul>
          <li>News</li>
          <li>Events</li>
          <li>Talks</li>
          <li>Grants</li>
          <li>Publications (raw YAML entry)</li>
        </ul>
      </div>
    </div>
  );
}
