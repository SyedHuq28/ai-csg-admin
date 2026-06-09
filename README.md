# AI Centre Admin App

This folder contains a small Vercel-ready admin app for editing site data.

## Purpose

The app lets authorized users add entries to:
- `_data/news.yml`
- `_data/events.yml`
- `_data/talks.yml`
- `_data/grants.yml`
- `_data/publist.yml` (publications, raw YAML input)

Updates are committed directly to the GitHub repository and trigger the site rebuild.

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
- `GITHUB_BRANCH` — `main`

3. Run locally for testing:

```bash
npm run dev
```

4. Deploy to Vercel by connecting the repo and setting the same environment variables.

## Notes

- Publications entries should be submitted as raw YAML.
- News, events, talks, and grants use the existing repo data formats.
- This app is intentionally simple for shared access with a username/password.
