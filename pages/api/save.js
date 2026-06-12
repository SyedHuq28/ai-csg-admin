import yaml from 'js-yaml';
import {
  getConfig,
  ghFetch,
  ensureDraftBranch,
  ensureOpenPr,
  getPreviewUrl,
} from '../../lib/github';

const pathMap = {
  news: '_data/news.yml',
  events: '_data/events.yml',
  talks: '_data/talks.yml',
  grants: '_data/grants.yml',
  publications: '_data/publist.yml',
};

function preserveHeaderComments(content) {
  const lines = content.split('\n');
  const header = [];
  let index = 0;
  while (index < lines.length && lines[index].trim().startsWith('#')) {
    header.push(lines[index]);
    index += 1;
  }
  return {
    header: header.join('\n'),
    body: lines.slice(index).join('\n'),
  };
}

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
  const { githubToken, repo, baseBranch, draftBranch, previewTemplate } = cfg;

  const { section, entry, publication } = req.body;
  const filePath = pathMap[section];
  if (!filePath) {
    return res.status(400).json({ error: 'Invalid section.' });
  }

  try {
    await ensureDraftBranch(githubToken, repo, baseBranch, draftBranch);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const fileRes = await ghFetch(
    githubToken,
    `/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(draftBranch)}`,
  );
  if (!fileRes.ok) {
    const err = await fileRes.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || 'Failed to fetch file from GitHub.' });
  }
  const fileData = await fileRes.json();
  const fileSha = fileData.sha;
  const existingContent = Buffer.from(fileData.content, 'base64').toString('utf8');
  let updatedContent;

  if (section === 'publications') {
    if (!publication || typeof publication !== 'object') {
      return res.status(400).json({ error: 'Invalid publication payload.' });
    }
    const pubDump = yaml.dump(publication, { lineWidth: 150, noRefs: true, sortKeys: false });
    const indented = pubDump.replace(/(^|\n)([^\n])/g, '$1  $2').trim();
    updatedContent = existingContent.trimEnd() + '\n\n- ' + indented.replace(/^\s+/, '') + '\n';
  } else {
    if (!entry || typeof entry !== 'object') {
      return res.status(400).json({ error: 'Invalid entry payload.' });
    }
    const { header, body } = preserveHeaderComments(existingContent);
    const existingData = body.trim() ? yaml.load(body) : [];
    if (!Array.isArray(existingData)) {
      return res.status(500).json({ error: 'Existing data file has unexpected format.' });
    }
    existingData.push(entry);
    const dumped = yaml.dump(existingData, { lineWidth: 150, noRefs: true, sortKeys: false });
    updatedContent = header ? `${header}\n\n${dumped}` : dumped;
  }

  const commitRes = await ghFetch(githubToken, `/repos/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Admin update: add ${section} entry`,
      content: Buffer.from(updatedContent, 'utf8').toString('base64'),
      sha: fileSha,
      branch: draftBranch,
    }),
  });
  if (!commitRes.ok) {
    const err = await commitRes.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || 'Failed to commit file to GitHub.' });
  }

  let pr;
  try {
    pr = await ensureOpenPr(githubToken, repo, baseBranch, draftBranch, section, req.body);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const previewUrl = await getPreviewUrl(githubToken, repo, draftBranch, previewTemplate);

  return res.status(200).json({
    message: 'Saved to draft branch and queued in pull request.',
    prUrl: pr?.html_url || null,
    prNumber: pr?.number || null,
    previewUrl,
  });
}
