# AI Centre Admin App

This folder contains a small Vercel-ready admin app for editing site data.

## Purpose

The app lets authorized users add entries to:
- `_data/news.yml`
- `_data/events.yml`
- `_data/talks.yml`
- `_data/grants.yml`
- `_data/publist.yml` (publications, raw YAML input)

Updates are committed to a shared draft branch and queued in a single open pull request. A Vercel preview shows the rendered site before merge; the admin dashboard exposes the PR, the preview link, and a Merge button.

The app supports two repository layouts:
- Single-repo mode: write edits and open PRs in the same repo.
- Workspace-preview mode: write edits, open PRs, and generate previews in a separate repo you control.

## Setup

1. Install dependencies:

```bash
cd admin
npm install
```

2. Create environment variables in Vercel or a local `.env` file:

- `ADMIN_USERNAME` - admin username for login
- `ADMIN_PASSWORD` - admin password for login
- `ADMIN_TOKEN` - secret token used by serverless APIs
- `ADMIN_PR_USERNAME` - reviewer username for `/review`
- `ADMIN_PR_PASSWORD` - reviewer password for `/review`
- `ADMIN_PR_TOKEN` - secret token used by reviewer APIs
- `GITHUB_TOKEN` - GitHub personal access token used by the admin APIs
- `GITHUB_REPO` - legacy single-repo mode, e.g. `aicentre-csg/aicentre-csg.github.io`
- `GITHUB_WRITE_REPO` - repo where admin edits are committed, e.g. `SyedHuq28/ai-csg-admin-pr`
- `GITHUB_TARGET_REPO` - repo where PRs are opened, e.g. `SyedHuq28/ai-csg-admin-pr`
- `GITHUB_PREVIEW_REPO` - optional repo to read Vercel deployment statuses from (defaults to `GITHUB_WRITE_REPO`)
- `GITHUB_BRANCH` - base branch for PRs (default `main`)
- `GITHUB_DRAFT_BRANCH` - shared draft branch for queued edits (default `admin-drafts`)
- `VERCEL_PREVIEW_URL_TEMPLATE` - optional fallback preview URL shown before Vercel posts its deployment status

For the independent workspace-preview workflow:

```env
GITHUB_WRITE_REPO=SyedHuq28/ai-csg-admin-pr
GITHUB_TARGET_REPO=SyedHuq28/ai-csg-admin-pr
GITHUB_PREVIEW_REPO=SyedHuq28/ai-csg-admin-pr
GITHUB_BRANCH=main
GITHUB_DRAFT_BRANCH=admin-drafts
```

3. Run locally for testing:

```bash
npm run dev
```

4. Deploy to Vercel by connecting the admin repo and setting the same environment variables.

## URLs

- Content admin: `/` and `/dashboard`
- PR review: `/review`

## Notes

- Publications entries should be submitted as raw YAML.
- News, events, talks, and grants use the existing repo data formats.
- This app is intentionally simple for shared access with a username/password.

## PR + Preview Workflow

1. Each save commits to the `GITHUB_DRAFT_BRANCH` branch (default `admin-drafts`) of `GITHUB_WRITE_REPO`.
2. The first save opens a single PR against `GITHUB_TARGET_REPO`; subsequent saves append commits and a bullet to that PR body.
3. Reviewers visit the Vercel preview URL shown in the dashboard's Pending changes panel to verify the rendered site.
4. Click Merge & publish in the dashboard, or merge on GitHub, to merge the approved draft into the workspace repo's `main` branch.

## Vercel Preview Project

For workspace-preview mode, connect a separate Vercel project to `GITHUB_WRITE_REPO`:

- Framework preset: Other
- Install command: `bundle install`
- Build command: `bundle exec jekyll build`
- Output directory: `_site`

The live site can continue to publish via GitHub Pages from `aicentre-csg/aicentre-csg.github.io`. The workspace repo is an independent staging area for admin edits and previews.

## GitHub Token Scope

For workspace-preview mode, `GITHUB_TOKEN` needs:

- `contents:write` on `GITHUB_WRITE_REPO`
- `pull_requests:write` on `GITHUB_TARGET_REPO`

If `GITHUB_WRITE_REPO` and `GITHUB_TARGET_REPO` are the same repo, these permissions only need to apply to that independent workspace repo.
