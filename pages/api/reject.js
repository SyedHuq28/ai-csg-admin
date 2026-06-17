import { getConfig, ghFetch, getOpenAdminPr } from '../../lib/github';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers['x-admin-token'];
  if (!token || (token !== process.env.ADMIN_TOKEN && token !== process.env.ADMIN_PR_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let cfg;
  try {
    cfg = getConfig();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  const { githubToken, writeRepo, targetRepo, draftBranch } = cfg;

  const pr = await getOpenAdminPr(githubToken, targetRepo, writeRepo, draftBranch);
  if (!pr) {
    return res.status(404).json({ error: 'No open admin PR to reject.' });
  }

  const closeRes = await ghFetch(githubToken, `/repos/${targetRepo}/pulls/${pr.number}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed' }),
  });
  if (!closeRes.ok) {
    const err = await closeRes.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || 'Failed to close pull request.' });
  }

  const delRes = await ghFetch(githubToken, `/repos/${writeRepo}/git/refs/heads/${draftBranch}`, {
    method: 'DELETE',
  });

  return res.status(200).json({
    message: 'Pull request rejected.',
    prNumber: pr.number,
    branchDeleted: delRes.ok,
  });
}
