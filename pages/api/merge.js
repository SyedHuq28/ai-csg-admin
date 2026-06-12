import { getConfig, ghFetch, getOpenAdminPr } from '../../lib/github';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let cfg;
  try {
    cfg = getConfig();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  const { githubToken, repo, draftBranch } = cfg;

  const pr = await getOpenAdminPr(githubToken, repo, draftBranch);
  if (!pr) {
    return res.status(404).json({ error: 'No open admin PR to merge.' });
  }

  const mergeRes = await ghFetch(githubToken, `/repos/${repo}/pulls/${pr.number}/merge`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merge_method: 'squash',
      commit_title: pr.title,
    }),
  });
  if (!mergeRes.ok) {
    const err = await mergeRes.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || 'Merge failed.' });
  }

  const delRes = await ghFetch(githubToken, `/repos/${repo}/git/refs/heads/${draftBranch}`, {
    method: 'DELETE',
  });
  const branchDeleted = delRes.ok;

  return res.status(200).json({
    message: 'Pull request merged.',
    prNumber: pr.number,
    branchDeleted,
  });
}
