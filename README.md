# Rohit Kumar — Software & Automation

A multi-page portfolio for Rohit Kumar, founder of Leadomi. It presents custom websites, software and SaaS, APIs, and automations built to solve business problems, bring in leads, and reduce repetitive work.

## Stack

- Astro 7 generates the static pages.
- Cloudflare Workers Static Assets serves the site and the contact API.
- Cloudflare Turnstile protects project enquiries from spam.
- The contact Worker sends verified enquiries to Rohit’s Telegram inbox. Visitors can also email `contact@rohitkumar.co.in` directly.
- Node.js built-in test runner covers the Worker API.

## Local development

Use Node.js 22.23.4 or newer and npm.

1. Install dependencies with `npm install`.
2. Copy `local.env.example` to `local.env` and add your values for `BOT_TOKEN`, `USER_ID`, `PUBLIC_TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY`. Keep this file private; Git ignores it.
3. Add `localhost` and `127.0.0.1` to the Turnstile widget’s allowed hostnames for local testing. Add `rohitkumar.co.in` for production.
4. Run `npm run dev` and open `http://localhost:4321`.

The development launcher writes the Telegram and Turnstile secrets to a temporary `.dev.vars` file and passes the public Turnstile site key to Wrangler as a Worker variable. It removes `.dev.vars` when the process exits. The contact page fetches the public key from `/api/turnstile-config`; the secret is never sent to the browser.

## Build and checks

- `npm run build` generates the static site in `dist/`.
- `npm test` runs Worker contact API tests with Node’s built-in test runner.
- `npm audit` checks dependencies for known security advisories.

## Deploy to Cloudflare Workers

Production deploys use Cloudflare Workers Builds, connected to this GitHub repository on the `main` branch. On each push, Workers Builds runs `npm run build`, then deploys with `npx wrangler deploy`. Wrangler reads the Worker entry point and static asset directory from `wrangler.jsonc`.

Set production values in the Worker’s **Settings → Variables and Secrets** in Cloudflare:

- `PUBLIC_TURNSTILE_SITE_KEY` — a regular Worker variable used to load the public Turnstile widget.
- `BOT_TOKEN`, `USER_ID`, and `TURNSTILE_SECRET_KEY` — Worker secrets used to verify and deliver contact enquiries.

Workers Builds handles deployment authorization in Cloudflare. This project does not use a GitHub Actions deployment workflow or GitHub Cloudflare secrets. Check the Worker’s **Builds** page in Cloudflare for deploy status. Add `rohitkumar.co.in` as a custom domain if it is not already attached, and allow that hostname in the Turnstile widget settings.

For local development, keep the four values in the ignored `local.env` file. `npm run deploy` is available for an intentional manual deploy from a machine authenticated with Wrangler. Never commit `local.env`, `.dev.vars`, or any file containing secrets.

## Pages

- `/` — portfolio homepage
- `/projects/` — product projects and case studies
- `/services/` — websites, custom software and SaaS, APIs, automation, and pricing
- `/about/` — founder story and products
- `/contact/` — project enquiry form and direct email
- `/privacy/`, `/terms/`, `/cookies/` — privacy, terms of use, and cookie information
- `/404.html` — not-found page

## Project layout

- `src/pages/` — Astro pages
- `src/components/` — shared site components
- `src/data/site.ts` — navigation, service, and project content
- `src/styles/global.css` — site-wide styles
- `src/worker.ts` — Turnstile verification, contact delivery, and asset routing
- `scripts/dev-worker.mjs` — local Worker launcher
- `scripts/deploy-worker.mjs` — secure Worker deployment wrapper
- `public/` — public assets, `robots.txt`, and `sitemap.xml`
- `tests/` — Worker API tests
