import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execFileSync } from 'child_process';

// Common paths to scan for the Antigravity IDE directory (cross-distro)
const COMMON_IDE_PATHS = [
  join(homedir(), 'Applications', 'antigravity-ide'),
  join(homedir(), 'antigravity-ide'),
  join(homedir(), '.local', 'lib', 'antigravity-ide'),
  join(homedir(), 'opt', 'antigravity-ide'),
  '/opt/antigravity-ide',
  '/usr/local/antigravity-ide',
  '/usr/local/lib/antigravity-ide',
];

// Common paths to scan for the agy CLI binary (cross-distro)
const COMMON_CLI_PATHS = [
  join(homedir(), '.local', 'bin', 'agy'),
  join(homedir(), 'bin', 'agy'),
  '/usr/local/bin/agy',
  '/usr/bin/agy',
  '/opt/agy',
];

/**
 * Reads the current IDE version from the install directory.
 * Prefers the .version file written by this tool, falls back to product.json.
 * @param {string} dirPath
 * @returns {string}
 */
function readIDEVersion(dirPath) {
  // .version file written by antigravity-updater
  const versionFile = join(dirPath, '.version');
  if (existsSync(versionFile)) {
    const v = readFileSync(versionFile, 'utf8').trim();
    if (v) return v;
  }

  // Fall back to product.json (always present in a valid install)
  const productJson = join(dirPath, 'resources', 'app', 'product.json');
  if (existsSync(productJson)) {
    try {
      const data = JSON.parse(readFileSync(productJson, 'utf8'));
      const commit = data.commit ? ` (${data.commit.slice(0, 7)})` : '';
      const date = data.date ? data.date.slice(0, 10) : null;
      if (date) return `Build ${date}${commit}`;
    } catch { /* malformed json */ }
  }

  return 'version unknown';
}

/**
 * Looks at running processes and returns any Antigravity IDE install paths found.
 * @returns {string[]}
 */
function findRunningIDEPaths() {
  try {
    const out = execFileSync('ps', ['-eo', 'args'], { encoding: 'utf8' });
    const paths = new Set();
    for (const line of out.split('\n')) {
      // Match any path ending in /antigravity-ide/antigravity-ide (the binary)
      const m = line.match(/^(.+)\/antigravity-ide\s/);
      if (m && m[1].endsWith('antigravity-ide')) {
        // m[1] is the directory containing the binary
        paths.add(m[1]);
      }
    }
    return [...paths];
  } catch {
    return [];
  }
}

/**
 * Scans the system for Antigravity IDE and agy CLI installations.
 * @returns {Promise<{ ideInstalls: Array<{path:string, version:string}>, cliPath: string|null, cliVersion: string|null }>}
 */
export async function detectInstallations() {
  const found = new Map(); // path → version

  // 1. Scan known common locations
  for (const dir of COMMON_IDE_PATHS) {
    if (existsSync(join(dir, 'antigravity-ide')) && !found.has(dir)) {
      found.set(dir, readIDEVersion(dir));
    }
  }

  // 2. Infer paths from running processes (catches non-standard install locations)
  for (const dir of findRunningIDEPaths()) {
    if (!found.has(dir)) {
      found.set(dir, readIDEVersion(dir));
    }
  }

  const ideInstalls = [...found.entries()].map(([path, version]) => ({ path, version }));

  // Detect agy CLI
  let cliPath = null;
  let cliVersion = null;

  for (const p of COMMON_CLI_PATHS) {
    if (existsSync(p)) {
      cliPath = p;
      break;
    }
  }

  // Also try `which agy` in case it's somewhere else
  if (!cliPath) {
    try {
      const w = execFileSync('which', ['agy'], { encoding: 'utf8' }).trim();
      if (w) cliPath = w;
    } catch { /* not in PATH */ }
  }

  if (cliPath) {
    try {
      cliVersion = execFileSync(cliPath, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
    } catch { /* binary exists but failed to get version */ }
  }

  return { ideInstalls, cliPath, cliVersion };
}
