import {
  REVIEW_STATUS_CONFIRMED,
  getConfig,
  getOpenAdminPr,
  updatePrReviewStatus,
} from '../../lib/github';

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
  const { githubToken, writeRepo, targetRepo, draftBranch } = cfg;

  const pr = await getOpenAdminPr(githubToken, targetRepo, writeRepo, draftBranch);
  if (!pr) {
    return res.status(404).json({ error: 'No pending admin PR to confirm.' });
  }

  try {
    await updatePrReviewStatus(githubToken, targetRepo, pr.number, REVIEW_STATUS_CONFIRMED);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({
    message: 'Pending changes confirmed for review.',
    prNumber: pr.number,
    prUrl: pr.html_url,
  });
}
