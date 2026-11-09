interface Env {
  BOT_TOKEN?: string;
  USER_ID?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  projectType?: unknown;
  budget?: unknown;
  message?: unknown;
  _honey?: unknown;
  'cf-turnstile-response'?: unknown;
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

const text = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return '';

  let cleaned = '';
  for (const character of value) {
    const code = character.charCodeAt(0);
    const isDisallowedControl = code === 0x7f || (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d);
    if (!isDisallowedControl) cleaned += character;
  }

  return cleaned.trim().slice(0, maxLength);
};

async function handleContact(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ ok: false, error: 'Request origin is not allowed.' }, 403);

  let payload: ContactPayload;
  try {
    const contentLength = Number(request.headers.get('Content-Length'));
    if (contentLength > 12_000) return json({ ok: false, error: 'The enquiry is too large.' }, 413);
    const rawBody = await request.text();
    if (rawBody.length > 12_000) return json({ ok: false, error: 'The enquiry is too large.' }, 413);
    payload = JSON.parse(rawBody) as ContactPayload;
  } catch {
    return json({ ok: false, error: 'Please check the form and try again.' }, 400);
  }

  if (!env.BOT_TOKEN || !env.USER_ID) return json({ ok: false, error: 'The contact form is not configured yet.' }, 503);
  if (text(payload._honey, 200)) return json({ ok: true });

  const turnstileToken = text(payload['cf-turnstile-response'], 2_048);
  if (!env.TURNSTILE_SECRET_KEY) return json({ ok: false, error: 'The contact form is not configured yet.' }, 503);
  if (!turnstileToken) return json({ ok: false, error: 'Please complete the bot check and try again.' }, 400);

  try {
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: request.headers.get('CF-Connecting-IP') || undefined,
        idempotency_key: crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(6_000),
    });
    const result = await verification.json() as { success?: boolean; hostname?: string; action?: string };
    if (!verification.ok || !result.success || result.hostname !== new URL(request.url).hostname || result.action !== 'contact') {
      return json({ ok: false, error: 'The bot check expired or could not be verified. Please try again.' }, 400);
    }
  } catch {
    return json({ ok: false, error: 'The bot check could not be verified. Please try again.' }, 502);
  }

  const name = text(payload.name, 100);
  const email = text(payload.email, 254);
  const projectType = text(payload.projectType, 100) || 'Not specified';
  const budget = text(payload.budget, 100) || 'Not specified';
  const message = text(payload.message, 2_500);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 15) {
    return json({ ok: false, error: 'Please provide a valid name, email, and project description.' }, 400);
  }

  const lead = [
    '📩 New portfolio enquiry',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Project: ${projectType}`,
    `Budget: ${budget}`,
    '',
    'Project details:',
    message,
  ].join('\n');

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.USER_ID, text: lead, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await telegramResponse.json() as { ok?: boolean };
    if (!telegramResponse.ok || !result.ok) return json({ ok: false, error: 'The enquiry could not be delivered. Please email me instead.' }, 502);
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'The enquiry could not be delivered. Please email me instead.' }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/work' || url.pathname.startsWith('/work/')) {
      url.pathname = url.pathname.replace(/^\/work(?=\/|$)/, '/projects');
      return Response.redirect(url.toString(), 308);
    }
    if (url.pathname === '/api/turnstile-config') {
      if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405);
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return json({ ok: false, error: 'Request origin is not allowed.' }, 403);
      return json({ siteKey: text(env.PUBLIC_TURNSTILE_SITE_KEY, 200) });
    }
    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
