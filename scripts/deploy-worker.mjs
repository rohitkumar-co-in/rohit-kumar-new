import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const secretNames = ['BOT_TOKEN', 'USER_ID', 'TURNSTILE_SECRET_KEY'];
const secrets = Object.fromEntries(secretNames.map((name) => [name, process.env[name]?.trim()]));
const missingSecrets = secretNames.filter((name) => !secrets[name]);
const siteKey = process.env.PUBLIC_TURNSTILE_SITE_KEY?.trim();

if (missingSecrets.length || !siteKey) {
  const missing = [...missingSecrets, ...(!siteKey ? ['PUBLIC_TURNSTILE_SITE_KEY'] : [])];
  console.error(`Set these variables in local.env or the deployment environment: ${missing.join(', ')}`);
  process.exit(1);
}

const secretDirectory = await mkdtemp(join(tmpdir(), 'rohitkumar-worker-'));
const secretFile = join(secretDirectory, 'secrets.json');
try {
  await writeFile(secretFile, JSON.stringify(secrets), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  const args = [
    'node_modules/wrangler/bin/wrangler.js',
    'deploy',
    '--secrets-file', secretFile,
    '--var', `PUBLIC_TURNSTILE_SITE_KEY:${siteKey}`,
  ];
  const wrangler = spawn(process.execPath, args, { stdio: 'inherit' });
  let requestedSignal;
  const forwardSignal = (signal) => {
    requestedSignal = signal;
    wrangler.kill(signal);
  };
  process.once('SIGINT', () => forwardSignal('SIGINT'));
  process.once('SIGTERM', () => forwardSignal('SIGTERM'));

  const code = await new Promise((resolve, reject) => {
    wrangler.once('error', reject);
    wrangler.once('exit', (exitCode) => resolve(exitCode ?? (requestedSignal ? 1 : 0)));
  });
  process.exitCode = code;
} catch (error) {
  console.error(`Could not start Wrangler: ${error.message}`);
  process.exitCode = 1;
} finally {
  await rm(secretDirectory, { recursive: true, force: true });
}
