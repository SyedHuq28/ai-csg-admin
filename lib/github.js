const API = 'https://api.github.com';
const REVIEW_STATUS_PENDING = 'pending';
const REVIEW_STATUS_CONFIRMED = 'confirmed';
const REVIEW_STATUS_RE = /<!--\s*admin-review-status:\s*(pending|confirmed)\s*-->/i;

const previewPathBySection = {
  news: '/allnews.html',
  events: '/events.html',
  talks: '/talks.html',
  grants: '/grants.html',
  publications: '/publications2/',
};

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export function getConfig() {
  const githubToken = process.env.GITHUB_TOKEN;
  const legacyRepo = process.env.GITHUB_REPO;
  const writeRepo = process.env.GITHUB_WRITE_REPO || legacyRepo;
  const targetRepo = process.env.GITHUB_TARGET_REPO || legacyRepo;
  const previewRepo = process.env.GITHUB_PREVIEW_REPO || writeRepo;
  const baseBranch = process.env.GITHUB_BRANCH || 'main';
  const draftBranch = process.env.GITHUB_DRAFT_BRANCH || 'admin-drafts';
  const previewTemplate = process.env.VERCEL_PREVIEW_URL_TEMPLATE || '';
  if (!githubToken || !writeRepo || !targetRepo) {
    throw new Error('GitHub configuration is incomplete.');
  }
  return { githubToken, repo: writeRepo, writeRepo, targetRepo, previewRepo, baseBranch, draftBranch, previewTemplate };
}

export async function ghFetch(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...ghHeaders(token), ...(init.headers || {}) },
  });
  return res;
}

export async function ensureDraftBranch(token, repo, baseBranch, draftBranch) {
  const refRes = await ghFetch(token, `/repos/${repo}/git/ref/heads/${draftBranch}`);
  if (refRes.ok) return;
  if (refRes.status !== 404) {
    const err = await refRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to read draft branch ref.');
  }
  const baseRefRes = await ghFetch(token, `/repos/${repo}/git/ref/heads/${baseBranch}`);
  if (!baseRefRes.ok) {
    const err = await baseRefRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to read base branch ref.');
  }
  const baseRef = await baseRefRes.json();
  const createRes = await ghFetch(token, `/repos/${repo}/git/refs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${draftBranch}`, sha: baseRef.object.sha }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create draft branch.');
  }
}

function ownerOf(repo) {
  return repo.split('/')[0];
}

export function getPrHead(writeRepo, targetRepo, draftBranch) {
  return `${ownerOf(writeRepo)}:${draftBranch}`;
}

export function getCompareHead(writeRepo, targetRepo, draftBranch) {
  return writeRepo === targetRepo ? draftBranch : getPrHead(writeRepo, targetRepo, draftBranch);
}

export { REVIEW_STATUS_PENDING, REVIEW_STATUS_CONFIRMED };

export function getReviewStatus(prOrBody) {
  const body = typeof prOrBody === 'string' ? prOrBody : prOrBody?.body;
  const match = String(body || '').match(REVIEW_STATUS_RE);
  return match ? match[1].toLowerCase() : REVIEW_STATUS_PENDING;
}

function withReviewStatus(body, status) {
  const cleanBody = String(body || '').replace(REVIEW_STATUS_RE, '').trim();
  return [`<!-- admin-review-status:${status} -->`, cleanBody].filter(Boolean).join('\n\n');
}

export async function updatePrReviewStatus(token, targetRepo, prNumber, status) {
  const prRes = await ghFetch(token, `/repos/${targetRepo}/pulls/${prNumber}`);
  if (!prRes.ok) {
    const err = await prRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to read pull request.');
  }
  const pr = await prRes.json();
  const patchRes = await ghFetch(token, `/repos/${targetRepo}/pulls/${prNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: withReviewStatus(pr.body || '', status) }),
  });
  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update pull request review status.');
  }
  return await patchRes.json();
}

export function getLatestQueuedSection(body) {
  const matches = [...String(body || '').matchAll(/-\s+`([^`]+)`/g)];
  return matches.length ? matches[matches.length - 1][1] : null;
}

export function getSectionPreviewUrl(previewUrl, section) {
  if (!previewUrl) return null;
  const path = previewPathBySection[section];
  if (!path) return previewUrl;
  try {
    const url = new URL(previewUrl);
    url.pathname = path;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return previewUrl;
  }
}

export async function getOpenAdminPr(token, targetRepo, writeRepo, draftBranch) {
  const head = getPrHead(writeRepo, targetRepo, draftBranch);
  const res = await ghFetch(
    token,
    `/repos/${targetRepo}/pulls?head=${encodeURIComponent(head)}&state=open`,
  );
  if (!res.ok) return null;
  const list = await res.json();
  return Array.isArray(list) && list.length > 0 ? list[0] : null;
}

function bulletFor(section, payload) {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  if (section === 'publications') {
    const p = payload.publication || {};
    return `- \`${section}\` - ${p.title || '(untitled)'} (${stamp} UTC)`;
  }
  const e = payload.entry || {};
  const label = e.headline || e.title || e.date || '(no title)';
  return `- \`${section}\` - ${String(label).slice(0, 120)} (${stamp} UTC)`;
}

export async function ensureOpenPr(token, targetRepo, writeRepo, baseBranch, draftBranch, section, payload) {
  const existing = await getOpenAdminPr(token, targetRepo, writeRepo, draftBranch);
  const bullet = bulletFor(section, payload);
  if (existing) {
    const newBody = withReviewStatus(`${existing.body || ''}\n${bullet}`.trim(), REVIEW_STATUS_PENDING);
    await ghFetch(token, `/repos/${targetRepo}/pulls/${existing.number}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: newBody }),
    });
    return existing;
  }
  const body = withReviewStatus([
    'Pending admin edits queued by the admin app. Review the Vercel preview, then merge to publish.',
    '',
    '### Queued edits',
    bullet,
  ].join('\n'), REVIEW_STATUS_PENDING);
  const createRes = await ghFetch(token, `/repos/${targetRepo}/pulls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Admin drafts - queued changes',
      head: getPrHead(writeRepo, targetRepo, draftBranch),
      base: baseBranch,
      body,
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to open pull request.');
  }
  return await createRes.json();
}

export async function getPreviewUrl(token, repo, draftBranch, previewTemplate) {
  const depRes = await ghFetch(
    token,
    `/repos/${repo}/deployments?ref=${encodeURIComponent(draftBranch)}&per_page=5`,
  );
  if (depRes.ok) {
    const deployments = await depRes.json();
    for (const dep of deployments) {
      const stRes = await ghFetch(token, `/repos/${repo}/deployments/${dep.id}/statuses?per_page=10`);
      if (!stRes.ok) continue;
      const statuses = await stRes.json();
      const hit = statuses.find((s) => s.target_url && (s.state === 'success' || s.state === 'in_progress'));
      if (hit) return hit.target_url;
    }
  }
  return previewTemplate || null;
}
