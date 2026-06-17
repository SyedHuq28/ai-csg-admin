export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;
  const expectedUsername = process.env.ADMIN_PR_USERNAME;
  const expectedPassword = process.env.ADMIN_PR_PASSWORD;
  const token = process.env.ADMIN_PR_TOKEN;

  if (!expectedUsername || !expectedPassword || !token) {
    return res.status(500).json({ error: 'Admin PR review configuration is incomplete.' });
  }

  if (username === expectedUsername && password === expectedPassword) {
    return res.status(200).json({ token });
  }

  return res.status(401).json({ error: 'Invalid username or password.' });
}
