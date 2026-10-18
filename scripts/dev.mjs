import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(root, '..', 'backend');
const python = process.platform === 'win32'
  ? path.join(backend, '.venv', 'Scripts', 'python.exe')
  : path.join(backend, '.venv', 'bin', 'python');

if (!existsSync(python)) {
  console.error('Backend virtual environment is missing. Create it with: python3 -m venv backend/.venv');
  process.exit(1);
}

const children = [];
let stopping = false;
let exitCode = 0;
let closedChildren = 0;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  }
}

function onChildExit(code, signal) {
  closedChildren += 1;
  if (!stopping) stop(code ?? (signal ? 1 : 0));
  if (closedChildren === children.length) process.exitCode = exitCode;
}

process.once('SIGINT', () => stop(130));
process.once('SIGTERM', () => stop(143));

async function apiIsAlreadyRunning() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/health', { signal: AbortSignal.timeout(500) });
      if (response.ok) return true;
    } catch {
      // The API may still be starting; retry briefly before launching it ourselves.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function start(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit' });
  children.push(child);
  child.once('error', (error) => {
    console.error(`Could not start a development process: ${error.message}`);
    stop(1);
  });
  child.once('exit', onChildExit);
}

console.log('Starting NeroTech web app and API. Web: http://localhost:3000 · API docs: http://localhost:8000/docs');

if (await apiIsAlreadyRunning()) {
  console.log('A healthy API is already running on port 8000; reusing it.');
} else {
  start(python, ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000'], backend);
}

start(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'dev'], root);
