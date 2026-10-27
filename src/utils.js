import { execFileSync } from 'child_process';
import { arch } from 'os';

/**
 * Checks if a system command is available in PATH.
 * @param {string} cmd
 * @returns {boolean}
 */
export function checkCommand(cmd) {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Promise-based sleep.
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Format a byte count into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Count running processes matching a pattern.
 * Returns 0 if pgrep is unavailable or no matches.
 * @param {string} pattern
 * @returns {number}
 */
export function getRunningCount(pattern) {
  try {
    const out = execFileSync('pgrep', ['-c', '-f', pattern], { encoding: 'utf8' });
    return parseInt(out.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Gracefully terminate processes matching a pattern (SIGTERM).
 * @param {string} pattern
 */
export function killProcess(pattern) {
  try {
    execFileSync('pkill', ['-TERM', '-f', pattern], { stdio: 'ignore' });
  } catch { /* no matching processes is fine */ }
}

/**
 * Force-kill processes matching a pattern (SIGKILL).
 * @param {string} pattern
 */
export function forceKillProcess(pattern) {
  try {
    execFileSync('pkill', ['-9', '-f', pattern], { stdio: 'ignore' });
  } catch { /* no matching processes is fine */ }
}

/**
 * Returns the download architecture string for the current machine.
 * @returns {'linux-x64' | 'linux-arm'}
 */
export function getLinuxArch() {
  const a = arch();
  if (a === 'arm64' || a === 'arm') return 'linux-arm';
  return 'linux-x64';
}
