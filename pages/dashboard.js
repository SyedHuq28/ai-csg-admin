import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

const sectionOptions = [
  { value: 'news', label: 'News' },
  { value: 'events', label: 'Events' },
  { value: 'talks', label: 'Talks' },
  { value: 'grants', label: 'Grants' },
  { value: 'publications', label: 'Publications (raw YAML)' },
];

const fieldDefinitions = {
  news: [
    { name: 'date', label: 'Date', placeholder: '3 November, 2025', required: true },
    { name: 'headline', label: 'Headline', placeholder: 'News headline with markdown support', required: true, type: 'textarea' },
  ],
  events: [
    { name: 'date', label: 'Date', placeholder: '20 May, 2026', required: true },
    { name: 'title', label: 'Title', placeholder: 'Event title', required: true },
    { name: 'type', label: 'Type', placeholder: 'seminar, workshop, conference, colloquium, other', required: true },
    { name: 'speaker', label: 'Speaker', placeholder: 'Speaker name(s)' },
    { name: 'location', label: 'Location', placeholder: 'Room or venue' },
    { name: 'link', label: 'Link', placeholder: 'https://example.com' },
    { name: 'description', label: 'Description', placeholder: 'Short event description', type: 'textarea' },
  ],
  talks: [
    { name: 'date', label: 'Date', placeholder: '28 April, 2026', required: true },
    { name: 'title', label: 'Title', placeholder: 'Talk title', required: true },
    { name: 'speaker', label: 'Speaker', placeholder: 'Speaker name', required: true },
    { name: 'affiliation', label: 'Affiliation', placeholder: 'Institution or company' },
    { name: 'abstract', label: 'Abstract', placeholder: 'Short abstract', type: 'textarea' },
    { name: 'slides_link', label: 'Slides link', placeholder: 'https://example.com/slides' },
    { name: 'video_link', label: 'Video link', placeholder: 'https://example.com/video' },
    { name: 'host', label: 'Host', placeholder: 'Host faculty member' },
  ],
  grants: [
    { name: 'title', label: 'Title', placeholder: 'Grant/project title', required: true },
    { name: 'funder', label: 'Funder', placeholder: 'Funding body', required: true },
    { name: 'amount', label: 'Amount', placeholder: '£520,000' },
    { name: 'pi', label: 'Principal investigator', placeholder: 'Prof. Tweyde', required: true },
    { name: 'co_investigators', label: 'Co-investigators', placeholder: 'Dr. Smith, Dr. Jones' },
    { name: 'start_date', label: 'Start date', placeholder: '2024/01/01', required: true },
    { name: 'end_date', label: 'End date', placeholder: '2027/03/31', required: true },
    { name: 'status', label: 'Status', placeholder: 'active or completed', required: true },
    { name: 'description', label: 'Description', placeholder: 'Short project description', type: 'textarea' },
    { name: 'link', label: 'Link', placeholder: 'https://example.com' },
  ],
  publications: [
    { name: 'title', label: 'Title', placeholder: 'Example Publication', required: true },
    { name: 'authors', label: 'Authors', placeholder: 'A. Author, B. Author', required: true },
    { name: 'journal', label: 'Journal / Venue', placeholder: 'Journal Name or Conference' },
    { name: 'year', label: 'Year', placeholder: '2025' },
    { name: 'volume', label: 'Volume', placeholder: 'e.g. 12' },
    { name: 'pages', label: 'Pages', placeholder: 'e.g. 12-24' },
    { name: 'doi', label: 'DOI', placeholder: '10.1000/xyz123' },
    { name: 'link', label: 'Link', placeholder: 'https://example.com' },
    { name: 'abstract', label: 'Abstract', placeholder: 'Short abstract (optional)', type: 'textarea' },
  ],
};

export default function Dashboard() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [section, setSection] = useState('news');
  const [values, setValues] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pr, setPr] = useState(null);
  const [prLoading, setPrLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  async function refreshPr(tok) {
    const useToken = tok || token;
    if (!useToken) return;
    setPrLoading(true);
    try {
      const r = await fetch('/api/pr-status', { headers: { 'x-admin-token': useToken } });
      const d = await r.json();
      if (r.ok) setPr(d.pr);
    } finally {
      setPrLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = sessionStorage.getItem('adminToken');
    if (!storedToken) {
      router.replace('/');
      return;
    }
    setToken(storedToken);
    refreshPr(storedToken);
  }, [router]);

  useEffect(() => {
    const initialValues = {};
    (fieldDefinitions[section] || []).forEach((field) => {
      initialValues[field.name] = '';
    });
    setValues(initialValues);
    setStatus('');
    setError('');
  }, [section]);

  const sectionTitle = useMemo(() => sectionOptions.find((item) => item.value === section)?.label, [section]);

  function handleInputChange(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setStatus('Saving...');

    const payload = { section };
    if (section === 'publications') {
      payload.publication = {};
      Object.entries(values).forEach(([key, value]) => {
        if (value !== '') payload.publication[key] = value;
      });
    } else {
      payload.entry = {};
      Object.entries(values).forEach(([key, value]) => {
        if (value !== '') {
          payload.entry[key] = value;
        }
      });
    }

    const response = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (response.ok) {
      const prBit = data.prUrl ? ` Queued in PR #${data.prNumber}.` : '';
      setStatus(`Saved to draft branch.${prBit}`);
      setValues((current) => Object.fromEntries(Object.keys(current).map((key) => [key, ''])));
      refreshPr();
    } else {
      setStatus('');
      setError(data.error || 'An error occurred while saving.');
    }
  }

  async function handleMerge() {
    if (!pr) return;
    if (!window.confirm(`Merge PR #${pr.number} into main? This publishes the queued edits.`)) return;
    setMerging(true);
    setError('');
    try {
      const r = await fetch('/api/merge', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const d = await r.json();
      if (r.ok) {
        setStatus(`Merged PR #${d.prNumber}. GitHub Pages will rebuild shortly.`);
        setPr(null);
      } else {
        setError(d.error || 'Merge failed.');
      }
    } finally {
      setMerging(false);
    }
  }

  function handleLogout() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('adminToken');
      router.replace('/');
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 860, margin: '0 auto', padding: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1>AI Centre Admin Dashboard</h1>
          <p>Choose a section, complete the form, and submit to update the repo.</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.75rem 1rem', background: '#eee', border: '1px solid #ccc', borderRadius: 6 }}>
          Log out
        </button>
      </header>

      <section style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Pending changes</h2>
          <button
            onClick={() => refreshPr()}
            disabled={prLoading}
            style={{ padding: '0.4rem 0.75rem', background: '#eee', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer' }}
          >
            {prLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {!pr && !prLoading && (
          <p style={{ margin: '0.75rem 0 0', color: '#555' }}>No pending changes. Saved edits will appear here as a pull request.</p>
        )}
        {pr && (
          <div style={{ marginTop: '0.75rem' }}>
            <p style={{ margin: '0 0 0.5rem' }}>
              <a href={pr.url} target="_blank" rel="noreferrer"><strong>PR #{pr.number}</strong> — {pr.title}</a>
            </p>
            {pr.commits && pr.commits.length > 0 && (
              <details style={{ marginBottom: '0.5rem' }}>
                <summary>{pr.commits.length} queued commit{pr.commits.length === 1 ? '' : 's'}</summary>
                <ul style={{ margin: '0.5rem 0 0 1.25rem' }}>
                  {pr.commits.map((c) => (
                    <li key={c.sha}><code>{c.sha}</code> {c.message}</li>
                  ))}
                </ul>
              </details>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {pr.previewUrl ? (
                <a
                  href={pr.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: '0.5rem 0.9rem', background: '#0070f3', color: '#fff', borderRadius: 6, textDecoration: 'none' }}
                >
                  Open preview
                </a>
              ) : (
                <span style={{ color: '#777', alignSelf: 'center' }}>Preview not ready yet.</span>
              )}
              <button
                onClick={handleMerge}
                disabled={merging}
                style={{ padding: '0.5rem 0.9rem', background: '#1f883d', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                {merging ? 'Merging…' : 'Merge & publish'}
              </button>
              <a
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '0.5rem 0.9rem', background: '#eee', border: '1px solid #ccc', borderRadius: 6, textDecoration: 'none', color: '#222' }}
              >
                View on GitHub
              </a>
            </div>
          </div>
        )}
      </section>

      <label style={{ display: 'block', marginBottom: '1rem' }}>
        Select section
        <select value={section} onChange={(event) => setSection(event.target.value)} style={{ display: 'block', width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}>
          {sectionOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        {fieldDefinitions[section].map((field) => (
          <label key={field.name} style={{ display: 'block' }}>
            {field.label}
            {field.type === 'textarea' ? (
              <textarea
                value={values[field.name] || ''}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(event) => handleInputChange(field.name, event.target.value)}
                rows={field.type === 'textarea' ? 5 : 1}
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', fontFamily: 'inherit' }}
              />
            ) : (
              <input
                type="text"
                value={values[field.name] || ''}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(event) => handleInputChange(field.name, event.target.value)}
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }}
              />
            )}
          </label>
        ))}

        <button type="submit" style={{ padding: '0.75rem', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Save to GitHub
        </button>
      </form>

      {status && <p style={{ color: 'green' }}>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9fb', borderRadius: 8 }}>
        <h2>Notes</h2>
        <ul>
          <li>Edits commit to a shared draft branch and are queued in a single open pull request.</li>
          <li>Use the <strong>Open preview</strong> link to view the rendered Vercel preview of the PR before publishing.</li>
          <li>Click <strong>Merge &amp; publish</strong> to merge the PR into <code>main</code>; GitHub Pages then rebuilds the live site.</li>
          <li>Publication fields are provided and will be converted to a YAML entry automatically—no raw YAML required.</li>
        </ul>
        <div style={{ marginTop: '1rem' }}>
          <h3>Format instructions</h3>
          <p><strong>News:</strong> provide a <em>date</em> like "3 November, 2025" and a <em>headline</em> (Markdown allowed).</p>
          <p><strong>Events:</strong> use <em>date</em> "DD Month, YYYY", <em>type</em> (seminar/workshop/colloquium/etc.), optional speaker/location/link/description.</p>
          <p><strong>Talks:</strong> use <em>date</em>, <em>title</em>, <em>speaker</em>, optional affiliation, abstract, slides_link, video_link, host.</p>
          <p><strong>Grants:</strong> use ISO dates for start/end (YYYY/MM/DD), include <em>title</em>, <em>funder</em>, <em>pi</em>, and <em>status</em> (active/completed).</p>
          <p><strong>Publications:</strong> fill the form fields (title, authors, journal, year, volume, pages, doi, link, abstract); the app creates the YAML entry automatically.</p>
        </div>
      </section>
    </div>
  );
}
