import { spawn } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const token = process.env.BOT_TOKEN?.trim();
const userId = process.env.USER_ID?.trim();
if (!token || !userId) {
  console.error('local.env must define non-empty BOT_TOKEN and USER_ID values.');
  process.exit(1);
}

const varsPath = resolve('.dev.vars');
try {
  await writeFile(varsPath, `BOT_TOKEN=${JSON.stringify(token)}\nUSER_ID=${JSON.stringify(userId)}\n`, { mode: 0o600, flag: 'wx' });
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error('Remove the existing .dev.vars file before using the local.env dev launcher.');
  } else {
    console.error(`Could not create temporary Worker secrets: ${error.message}`);
  }
  process.exit(1);
}

const port = process.argv[2] || '4321';
const wrangler = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--port', port, '--ip', '127.0.0.1'], {
  stdio: 'inherit',
});

let cleaned = false;
const cleanUp = async () => {
  if (cleaned) return;
  cleaned = true;
  try {
    await unlink(varsPath);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(`Could not remove temporary Worker secrets: ${error.message}`);
  }
};

process.on('SIGINT', () => { wrangler.kill('SIGINT'); void cleanUp(); });
process.on('SIGTERM', () => { wrangler.kill('SIGTERM'); void cleanUp(); });
wrangler.on('error', (error) => {
  void cleanUp();
  console.error(`Could not start Wrangler: ${error.message}`);
  process.exitCode = 1;
});
wrangler.on('exit', async (code, signal) => {
  await cleanUp();
  process.exitCode = code ?? (signal ? 1 : 0);
});
