import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

const sectionLabels = {
  news: 'News',
  events: 'Event',
  talks: 'Talk',
  grants: 'Grant',
  publications: 'Publication',
};

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const hasTime = String(value).includes('T');
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    ...(hasTime ? { timeStyle: 'short' } : {}),
  }).format(date);
}

function Field({ label, value, href }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <p style={{ margin: '0.35rem 0', lineHeight: 1.45 }}>
      <strong>{label}:</strong>{' '}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">{value}</a>
      ) : (
        <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
      )}
    </p>
  );
}

function PreviewEntry({ item, index }) {
  const content = item.content || {};
  const label = sectionLabels[item.section] || item.section || 'Entry';
  const title = content.headline || content.title || content.summary || `${label} ${index + 1}`;

  return (
    <article style={{ padding: '1rem 1.25rem', border: '1px solid #d0d7de', borderRadius: 8, background: '#fff', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.6rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{label}</h2>
        {item.fallback && <span style={{ color: '#777', fontSize: '0.85rem' }}>summary only</span>}
      </div>

      {item.section === 'news' && (
        <>
          <Field label="Date" value={formatDate(content.date)} />
          <Field label="Headline" value={content.headline || content.summary} />
        </>
      )}

      {item.section === 'events' && (
        <>
          <Field label="Date" value={formatDate(content.date)} />
          <Field label="Title" value={content.title || content.summary} />
          <Field label="Type" value={content.type} />
          <Field label="Speaker" value={content.speaker} />
          <Field label="Location" value={content.location} />
          <Field label="Description" value={content.description} />
          <Field label="Link" value={content.link} href={content.link} />
        </>
      )}

      {item.section === 'talks' && (
        <>
          <Field label="Date" value={formatDate(content.date)} />
          <Field label="Title" value={content.title || content.summary} />
          <Field label="Speaker" value={content.speaker} />
          <Field label="Affiliation" value={content.affiliation} />
          <Field label="Abstract" value={content.abstract} />
          <Field label="Host" value={content.host} />
          <Field label="Slides" value={content.slides_link} href={content.slides_link} />
          <Field label="Video" value={content.video_link} href={content.video_link} />
        </>
      )}

      {item.section === 'grants' && (
        <>
          <Field label="Title" value={content.title || content.summary} />
          <Field label="Funder" value={content.funder} />
          <Field label="Amount" value={content.amount} />
          <Field label="Principal investigator" value={content.pi} />
          <Field label="Co-investigators" value={content.co_investigators} />
          <Field label="Dates" value={[formatDate(content.start_date), formatDate(content.end_date)].filter(Boolean).join(' - ')} />
          <Field label="Status" value={content.status} />
          <Field label="Description" value={content.description} />
          <Field label="Link" value={content.link} href={content.link} />
        </>
      )}

      {item.section === 'publications' && (
        <>
          <Field label="Title" value={content.title || content.summary} />
          <Field label="Authors" value={content.authors} />
          <Field label="Journal / Venue" value={content.journal} />
          <Field label="Year" value={content.year} />
          <Field label="Volume" value={content.volume} />
          <Field label="Pages" value={content.pages} />
          <Field label="DOI" value={content.doi} />
          <Field label="Link" value={content.link} href={content.link} />
          <Field label="Abstract" value={content.abstract} />
        </>
      )}

      {!['news', 'events', 'talks', 'grants', 'publications'].includes(item.section) && (
        <Field label="Summary" value={title} />
      )}
    </article>
  );
}

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
  const entries = pr?.previewEntries || [];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', background: '#f6f8fa' }}>
      <header style={{ padding: '1rem', borderBottom: '1px solid #d0d7de', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem' }}>Preview</h1>
          {pr && <p style={{ margin: '0.25rem 0 0', color: '#555' }}>PR #{pr.number} - {pr.title}</p>}
        </div>
        <a href={backHref} style={{ padding: '0.5rem 0.8rem', background: '#0070f3', color: '#fff', borderRadius: 6, textDecoration: 'none' }}>
          Back
        </a>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '1rem' }}>
        {loading && <p style={{ margin: 0 }}>Loading preview...</p>}
        {!loading && error && <p style={{ margin: 0, color: '#cf222e' }}>{error}</p>}
        {!loading && pr && entries.length === 0 && (
          <p style={{ margin: 0, color: '#555' }}>No submitted entry details were found for this PR.</p>
        )}
        {!loading && entries.map((item, index) => (
          <PreviewEntry key={`${item.section}-${item.createdAt || index}`} item={item} index={index} />
        ))}
      </main>
    </div>
  );
}
