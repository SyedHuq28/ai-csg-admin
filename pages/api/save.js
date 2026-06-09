import yaml from 'js-yaml';

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

  const githubToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!githubToken || !repo) {
    return res.status(500).json({ error: 'GitHub configuration is incomplete.' });
  }

  const { section, entry, rawEntry, publication } = req.body;
  const filePath = pathMap[section];
  if (!filePath) {
    return res.status(400).json({ error: 'Invalid section.' });
  }

  const fileUrl = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;
  const fileResponse = await fetch(fileUrl, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!fileResponse.ok) {
    const errorData = await fileResponse.json().catch(() => ({}));
    return res.status(500).json({ error: errorData.message || 'Failed to fetch file from GitHub.' });
  }

  const fileData = await fileResponse.json();
  const fileSha = fileData.sha;
  const existingContent = Buffer.from(fileData.content, 'base64').toString('utf8');
  let updatedContent;

  if (section === 'publications') {
    // Accept structured publication object and convert to YAML entry
    if (!publication || typeof publication !== 'object') {
      return res.status(400).json({ error: 'Invalid publication payload.' });
    }

    // Dump the publication object to YAML and indent under a leading dash
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

  const commitUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const commitResponse = await fetch(commitUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Admin update: add ${section} entry`,
      content: Buffer.from(updatedContent, 'utf8').toString('base64'),
      sha: fileSha,
      branch,
    }),
  });

  if (!commitResponse.ok) {
    const commitError = await commitResponse.json().catch(() => ({}));
    return res.status(500).json({ error: commitError.message || 'Failed to commit file to GitHub.' });
  }

  return res.status(200).json({ message: 'File updated successfully.' });
}
