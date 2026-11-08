# Rohit Kumar — Portfolio

A multi-page developer and product-building portfolio for Rohit Kumar. It presents custom websites, software, APIs, automation, and business-focused project work.

## Stack

- Astro 7, generating static pages
- Cloudflare Workers for the contact form API
- Cloudflare Workers Static Assets for the built site
- Node.js built-in test runner for Worker tests

## Local development

Use Node.js 22.23.4 or newer and npm.

1. Install dependencies with `npm install`.
2. Create `local.env` in the project root with `BOT_TOKEN` and `USER_ID` for the Telegram lead destination. Keep this file private; it is ignored by Git.
3. Run `npm run dev` and open `http://localhost:4321`.

The dev script builds the static pages, writes temporary Wrangler variables from `local.env`, and removes the temporary file when the process exits.

## Build and checks

- `npm run build` generates the static site in `dist/`.
- `npm test` runs the Cloudflare Worker contact API tests using Node's built-in test runner.
- `npm audit` checks the dependency tree for known advisories.

## Deployment

Deploy with `npm run deploy`. Configure `BOT_TOKEN` and `USER_ID` as Cloudflare Worker secrets before publishing; do not commit local credentials or add them to public build assets.

## Project layout

- `src/pages/` — home, services, work, about, contact, and 404 pages
- `src/components/` — shared page components
- `src/data/site.ts` — portfolio and project content
- `src/styles/global.css` — site-wide styles
- `src/worker.ts` — contact form API and static asset routing
- `public/` — static public assets
- `tests/` — Worker tests
