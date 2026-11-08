import { spawn } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const token = process.env.BOT_TOKEN?.trim();
const userId = process.env.USER_ID?.trim();
if (!token || !userId) {
  console.error('local.env must define non-empty BOT_TOKEN and USER_ID values.');
  process.exit(1);
}

const varsPath = resolve('.dev.vars');
if (existsSync(varsPath)) {
  console.error('Remove the existing .dev.vars file before using the local.env dev launcher.');
  process.exit(1);
}

writeFileSync(varsPath, `BOT_TOKEN=${JSON.stringify(token)}\nUSER_ID=${JSON.stringify(userId)}\n`, { mode: 0o600 });

const port = process.argv[2] || '4321';
const wrangler = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--port', port, '--ip', '127.0.0.1'], {
  stdio: 'inherit',
});

let cleaned = false;
const cleanUp = () => {
  if (cleaned) return;
  cleaned = true;
  if (existsSync(varsPath)) unlinkSync(varsPath);
};

process.on('SIGINT', () => { cleanUp(); wrangler.kill(); });
process.on('SIGTERM', () => { cleanUp(); wrangler.kill(); });
process.on('exit', cleanUp);
wrangler.on('error', (error) => {
  cleanUp();
  console.error(`Could not start Wrangler: ${error.message}`);
  process.exitCode = 1;
});
wrangler.on('exit', (code, signal) => {
  cleanUp();
  process.exitCode = code ?? (signal ? 1 : 0);
});
