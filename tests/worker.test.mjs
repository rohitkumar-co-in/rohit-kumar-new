import assert from 'node:assert/strict';
import { afterEach, test, mock } from 'node:test';
import worker from '../src/worker.ts';

const env = {
  BOT_TOKEN: 'test-bot-token',
  USER_ID: 'test-user-id',
  PUBLIC_TURNSTILE_SITE_KEY: 'test-public-turnstile-key',
  TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
  ASSETS: { fetch: async () => new Response('static asset') },
};

function request(path, { method = 'POST', body, origin = 'https://rohitkumar.co.in' } = {}) {
  return new Request(`https://rohitkumar.co.in${path}`, {
    method,
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  });
}

const validLead = {
  name: 'Rohit Kumar',
  email: 'client@example.com',
  projectType: 'Custom website',
  budget: '$599–$1,500',
  message: 'I need a website that helps my business capture qualified leads.',
  'cf-turnstile-response': 'valid-test-token',
};

afterEach(() => mock.restoreAll());

test('contact route rejects methods other than POST', async () => {
  const response = await worker.fetch(request('/api/contact', { method: 'GET' }), env);
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { ok: false, error: 'Method not allowed.' });
});

test('Turnstile config returns only the public site key to the contact page', async () => {
  const response = await worker.fetch(request('/api/turnstile-config', { method: 'GET' }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { siteKey: env.PUBLIC_TURNSTILE_SITE_KEY });

  const wrongMethod = await worker.fetch(request('/api/turnstile-config'), env);
  assert.equal(wrongMethod.status, 405);

  const wrongOrigin = await worker.fetch(request('/api/turnstile-config', {
    method: 'GET',
    origin: 'https://attacker.example',
  }), env);
  assert.equal(wrongOrigin.status, 403);
});

test('contact route rejects missing and mismatched origins', async () => {
  for (const origin of [null, 'https://attacker.example']) {
    const response = await worker.fetch(request('/api/contact', { body: validLead, origin }), env);
    assert.equal(response.status, 403);
  }
});

test('contact route rejects malformed, oversized, and invalid submissions', async () => {
  const malformed = await worker.fetch(request('/api/contact', { body: '{' }), env);
  assert.equal(malformed.status, 400);

  const oversized = await worker.fetch(request('/api/contact', { body: 'x'.repeat(12_001) }), env);
  assert.equal(oversized.status, 413);

  const invalid = await worker.fetch(request('/api/contact', { body: { ...validLead, email: 'not-an-email' } }), env);
  assert.equal(invalid.status, 400);
});

test('contact route refuses to deliver when Telegram credentials are missing', async () => {
  const response = await worker.fetch(request('/api/contact', { body: validLead }), { ...env, BOT_TOKEN: '' });
  assert.equal(response.status, 503);
});

test('honeypot submissions are accepted without contacting Telegram', async () => {
  const telegram = mock.method(globalThis, 'fetch', async () => {
    throw new Error('Telegram should not be called for a honeypot submission');
  });
  const response = await worker.fetch(request('/api/contact', { body: { ...validLead, _honey: 'filled in' } }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(telegram.mock.callCount(), 0);
});

test('contact submissions require a valid Turnstile token before delivery', async () => {
  const requests = mock.method(globalThis, 'fetch', async () => Response.json({
    success: false,
    hostname: 'rohitkumar.co.in',
    action: 'contact',
  }));
  const missingToken = await worker.fetch(request('/api/contact', {
    body: { ...validLead, 'cf-turnstile-response': '' },
  }), env);
  assert.equal(missingToken.status, 400);

  const invalidToken = await worker.fetch(request('/api/contact', { body: validLead }), env);
  assert.equal(invalidToken.status, 400);
  assert.equal(requests.mock.callCount(), 1);
  assert.equal(String(requests.mock.calls[0].arguments[0]), 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
});

test('contact submissions stay closed when the Turnstile secret is missing', async () => {
  const requestCount = mock.method(globalThis, 'fetch', async () => {
    throw new Error('No external request should be made without the secret');
  });
  const response = await worker.fetch(request('/api/contact', { body: validLead }), { ...env, TURNSTILE_SECRET_KEY: '' });
  assert.equal(response.status, 503);
  assert.equal(requestCount.mock.callCount(), 0);
});

test('valid contact submissions are sent to Telegram', async () => {
  const telegram = mock.method(globalThis, 'fetch', async (url) => String(url).includes('/siteverify')
    ? Response.json({ success: true, hostname: 'rohitkumar.co.in', action: 'contact' })
    : Response.json({ ok: true }));
  const response = await worker.fetch(request('/api/contact', { body: validLead }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(telegram.mock.callCount(), 2);
  assert.equal(telegram.mock.calls[0].arguments[0], 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(telegram.mock.calls[1].arguments[0], `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`);
  const payload = JSON.parse(telegram.mock.calls[1].arguments[1].body);
  assert.equal(payload.chat_id, env.USER_ID);
  assert.match(payload.text, /client@example\.com/);
  assert.match(payload.text, /qualified leads/);
});

test('contact fields strip control characters before delivery', async () => {
  const telegram = mock.method(globalThis, 'fetch', async (url) => String(url).includes('/siteverify')
    ? Response.json({ success: true, hostname: 'rohitkumar.co.in', action: 'contact' })
    : Response.json({ ok: true }));
  const response = await worker.fetch(request('/api/contact', {
    body: { ...validLead, name: 'Rohit\u0000 Kumar', message: 'Please build\u0007 a useful lead capture website.' },
  }), env);
  assert.equal(response.status, 200);
  const payload = JSON.parse(telegram.mock.calls[1].arguments[1].body);
  assert.match(payload.text, /Name: Rohit Kumar/);
  assert.equal(payload.text.includes('\u0000'), false);
  assert.equal(payload.text.includes('\u0007'), false);
});

test('delivery failures return a safe email fallback', async () => {
  mock.method(globalThis, 'fetch', async (url) => String(url).includes('/siteverify')
    ? Response.json({ success: true, hostname: 'rohitkumar.co.in', action: 'contact' })
    : Response.json({ ok: false }, { status: 500 }));
  const response = await worker.fetch(request('/api/contact', { body: validLead }), env);
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /email me instead/);
});

test('non-API requests are delegated to static assets', async () => {
  const response = await worker.fetch(request('/about/', { method: 'GET', body: undefined }), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'static asset');
});
