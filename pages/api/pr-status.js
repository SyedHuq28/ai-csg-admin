import { getConfig, ghFetch, getOpenAdminPr, getPreviewUrl } from '../../lib/github';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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
  const { githubToken, repo, baseBranch, draftBranch, previewTemplate } = cfg;

  const pr = await getOpenAdminPr(githubToken, repo, draftBranch);
  if (!pr) {
    return res.status(200).json({ pr: null });
  }

  const cmpRes = await ghFetch(
    githubToken,
    `/repos/${repo}/compare/${encodeURIComponent(baseBranch)}...${encodeURIComponent(draftBranch)}`,
  );
  let commits = [];
  let mergeable = pr.mergeable;
  if (cmpRes.ok) {
    const cmp = await cmpRes.json();
    commits = (cmp.commits || []).map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0],
    }));
  }

  const previewUrl = await getPreviewUrl(githubToken, repo, draftBranch, previewTemplate);

  return res.status(200).json({
    pr: {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      body: pr.body || '',
      mergeable,
      commits,
      previewUrl,
    },
  });
}
