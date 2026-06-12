# AI Centre Admin App

This folder contains a small Vercel-ready admin app for editing site data.

## Purpose

The app lets authorized users add entries to:
- `_data/news.yml`
- `_data/events.yml`
- `_data/talks.yml`
- `_data/grants.yml`
- `_data/publist.yml` (publications, raw YAML input)

Updates are committed to a shared draft branch in the site repo and queued in a single open pull request. A Vercel preview of that PR shows the rendered site before merge; the admin dashboard exposes the PR, the preview link, and a Merge button.

## Setup

1. Install dependencies:

```bash
cd admin
npm install
```

2. Create environment variables in Vercel or a local `.env` file:

- `ADMIN_USERNAME` — admin username for login
- `ADMIN_PASSWORD` — admin password for login
- `ADMIN_TOKEN` — secret token used by serverless APIs
- `GITHUB_TOKEN` — GitHub personal access token with repo scope
- `GITHUB_REPO` — `aicentre-csg/aicentre-csg.github.io`
- `GITHUB_BRANCH` — base branch for PRs (default `main`)
- `GITHUB_DRAFT_BRANCH` — shared draft branch for queued edits (default `admin-drafts`)
- `VERCEL_PREVIEW_URL_TEMPLATE` — optional fallback preview URL shown before Vercel posts its deployment status (e.g. `https://aicentre-git-admin-drafts-<team>.vercel.app`)

3. Run locally for testing:

```bash
npm run dev
```

4. Deploy to Vercel by connecting the repo and setting the same environment variables.

## Notes

- Publications entries should be submitted as raw YAML.
- News, events, talks, and grants use the existing repo data formats.
- This app is intentionally simple for shared access with a username/password.

## PR + preview workflow

1. Each save commits to the `GITHUB_DRAFT_BRANCH` branch (default `admin-drafts`) of the site repo. The first save on an empty draft branch opens a single PR titled "Admin drafts — pending review"; subsequent saves append commits and a bullet to that PR's body.
2. Reviewers visit the Vercel preview URL shown in the dashboard's **Pending changes** panel (and in the PR's checks) to verify the rendered site.
3. Click **Merge & publish** in the dashboard (or merge on GitHub) to squash-merge the PR. The draft branch is deleted; the next save starts a fresh PR on top of `main`.

### Vercel preview for the site repo

The live site at `aicentre-csg.github.io` builds via **GitHub Pages**, which only builds `main` — it gives no per-PR preview. To get PR previews, connect a **separate** Vercel project to the `aicentre-csg/aicentre-csg.github.io` repo (distinct from this admin-app project):

- Framework preset: Other
- Build command: `bundle exec jekyll build`
- Output directory: `_site`
- The repo uses the `github-pages` gem, which pins the Jekyll version GitHub Pages runs, so the preview matches production. The lone custom plugin (`_plugins/markdown.rb`) is currently unused, so safe-mode (GH Pages) and full builds produce identical output.

Vercel's GitHub integration automatically posts a preview deployment per PR (as a GitHub Deployment with a `target_url`); the admin app reads that URL from the GitHub Deployments API for the draft branch and exposes it on the dashboard. Until that status posts, the dashboard falls back to `VERCEL_PREVIEW_URL_TEMPLATE` if set.

### GitHub token scope

`GITHUB_TOKEN` needs `contents:write` and `pull_requests:write` on the site repo (classic `repo` scope, or a fine-grained PAT with those permissions).
