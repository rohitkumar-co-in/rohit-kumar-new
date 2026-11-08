# Rohit Kumar — Portfolio

A multi-page portfolio for Rohit Kumar, showcasing web development and automation through products built to solve business problems, capture leads, and reduce repetitive work.

## Stack

- Astro 7, generating static pages
- Cloudflare Workers for the contact form API
- Cloudflare Workers Static Assets for the built site
- Node.js built-in test runner for Worker tests

## Local development

Use Node.js 22.23.4 or newer and npm.

1. Install dependencies with `npm install`.
2. If you don’t already have `local.env`, copy `local.env.example` to create it. Add `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to your existing `local.env` without replacing your Telegram credentials. Keep `local.env` private; it is ignored by Git. The public site key is embedded in the contact page at build time; the secret stays in the Worker environment. Register the local development host (`localhost`) and production domain in the Turnstile widget settings.
3. Run `npm run dev` and open `http://localhost:4321`.

The dev script builds the static pages, writes temporary Wrangler variables from `local.env`, and removes the temporary file when the process exits.

## Build and checks

- `npm run build` generates the static site in `dist/`.
- `npm test` runs the Cloudflare Worker contact API tests using Node's built-in test runner.
- `npm audit` checks the dependency tree for known advisories.

## Deployment

Deploy with `npm run deploy`. Configure `BOT_TOKEN`, `USER_ID`, and `TURNSTILE_SECRET_KEY` as Cloudflare Worker secrets before publishing. Set `PUBLIC_TURNSTILE_SITE_KEY` in the build environment so Astro can render the Turnstile widget. Never publish or commit the secret key.

## Project layout

- `src/pages/` — home, services, projects, about, contact, and 404 pages
- `src/components/` — shared page components
- `src/data/site.ts` — portfolio and project content
- `src/styles/global.css` — site-wide styles
- `src/worker.ts` — contact form API and static asset routing
- `public/` — static public assets
- `tests/` — Worker tests
