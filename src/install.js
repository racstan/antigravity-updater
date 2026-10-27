import https from 'https';
import http from 'http';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  rmSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { homedir, tmpdir } from 'os';
import { execFileSync, spawn } from 'child_process';
import { formatBytes } from './utils.js';

/**
 * Performs an HTTPS GET request, following up to 5 redirects.
 * Resolves with the IncomingMessage response stream.
 * @param {string} url
 * @param {number} [redirects=5]
 * @returns {Promise<import('http').IncomingMessage>}
 */
function get(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 30000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        if (redirects <= 0) return reject(new Error('Too many redirects'));
        return resolve(get(res.headers.location, redirects - 1));
      }
      resolve(res);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Connection timed out: ${url}`)); });
  });
}

/**
 * Downloads a URL to a local file, reporting progress via a callback.
 * @param {string} url
 * @param {string} destPath
 * @param {(downloaded: number, total: number) => void} [onProgress]
 * @returns {Promise<{downloaded: number, total: number}>}
 */
export async function downloadWithProgress(url, destPath, onProgress) {
  const res = await get(url);

  if (res.statusCode !== 200) {
    throw new Error(`Unexpected HTTP ${res.statusCode} when downloading`);
  }

  const total = parseInt(res.headers['content-length'] || '0', 10);
  let downloaded = 0;

  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);

    res.on('data', (chunk) => {
      downloaded += chunk.length;
      onProgress?.(downloaded, total);
    });

    res.pipe(file);

    file.on('finish', () => {
      file.close();
      resolve({ downloaded, total: total || downloaded });
    });

    file.on('error', (err) => {
      rmSync(destPath, { force: true });
      reject(err);
    });

    res.on('error', reject);
  });
}

/**
 * Downloads, verifies, and installs a new Antigravity IDE version.
 *
 * @param {{
 *   installPath: string,
 *   release: { version: string, downloadUrl: string },
 *   noBackup: boolean,
 *   onProgress?: (downloaded: number, total: number) => void,
 *   onStatus?: (msg: string) => void,
 * }} opts
 * @returns {Promise<{ backupPath: string | null }>}
 */
export async function installIDE({ installPath, release, noBackup, onProgress, onStatus }) {
  const tempDir = join(tmpdir(), `antigravity-updater-${Date.now()}`);
  const archivePath = join(tempDir, 'Antigravity_IDE.tar.gz');
  const stagingDir = join(tempDir, 'staged');
  const backupPath = `${installPath}.bak`;

  mkdirSync(tempDir, { recursive: true });
  mkdirSync(stagingDir, { recursive: true });

  try {
    // 1. Download
    onStatus?.('Downloading...');
    await downloadWithProgress(release.downloadUrl, archivePath, onProgress);

    // 2. Verify archive integrity
    onStatus?.('Verifying archive integrity...');
    execFileSync('tar', ['-tzf', archivePath], { stdio: 'ignore' });

    // 3. Extract to staging directory
    onStatus?.('Extracting...');
    execFileSync('tar', ['-xzf', archivePath, '-C', stagingDir, '--strip-components=1'], {
      stdio: 'ignore',
    });

    // Sanity check: make sure the main binary is present
    if (!existsSync(join(stagingDir, 'antigravity-ide'))) {
      throw new Error("Archive extracted but 'antigravity-ide' binary is missing — the tarball structure may have changed.");
    }

    // 4. Backup or delete old installation
    mkdirSync(dirname(installPath), { recursive: true });

    if (existsSync(installPath)) {
      if (noBackup) {
        onStatus?.('Removing old installation...');
        rmSync(installPath, { recursive: true, force: true });
      } else {
        onStatus?.('Creating backup...');
        if (existsSync(backupPath)) rmSync(backupPath, { recursive: true, force: true });
        renameSync(installPath, backupPath);
      }
    }

    // 5. Move staged files to final location
    //    renameSync works only within the same filesystem; fall back to cp for cross-fs moves.
    onStatus?.('Installing...');
    try {
      renameSync(stagingDir, installPath);
    } catch (err) {
      if (err.code === 'EXDEV') {
        // Cross-filesystem: copy then delete
        execFileSync('cp', ['-r', stagingDir, installPath]);
        rmSync(stagingDir, { recursive: true, force: true });
      } else {
        // Restore backup on failure
        if (!noBackup && existsSync(backupPath)) {
          renameSync(backupPath, installPath);
        }
        throw err;
      }
    }

    // 6. Fix executable permissions
    onStatus?.('Setting permissions...');
    const topLevelBinaries = [
      'antigravity-ide',
      'chrome_crashpad_handler',
      'chrome-sandbox',
    ];
    for (const f of topLevelBinaries) {
      const p = join(installPath, f);
      if (existsSync(p)) {
        try { execFileSync('chmod', ['+x', p], { stdio: 'ignore' }); } catch { /* skip */ }
      }
    }
    // Also fix everything in bin/
    const binDir = join(installPath, 'bin');
    if (existsSync(binDir)) {
      try {
        execFileSync('find', [binDir, '-type', 'f', '-exec', 'chmod', '+x', '{}', '+'], {
          stdio: 'ignore',
        });
      } catch { /* best-effort */ }
    }

    // 7. Record installed version so future runs can compare accurately
    writeFileSync(join(installPath, '.version'), release.version, 'utf8');

    return { backupPath: noBackup ? null : (existsSync(backupPath) ? backupPath : null) };

  } finally {
    // Always clean up the temp directory
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

/**
 * Installs/updates the agy CLI via the official Google install script.
 *
 * @param {{
 *   cliInstallDir?: string,
 *   onStatus?: (msg: string) => void,
 * }} opts
 */
export async function installCLI({ cliInstallDir, onStatus }) {
  const installDir = cliInstallDir ?? join(homedir(), '.local', 'bin');
  mkdirSync(installDir, { recursive: true });

  // Download the official install.sh
  onStatus?.('Fetching CLI installer script...');
  const scriptRes = await get('https://antigravity.google/cli/install.sh');
  const scriptContent = await new Promise((resolve, reject) => {
    let data = '';
    scriptRes.setEncoding('utf8');
    scriptRes.on('data', (chunk) => { data += chunk; });
    scriptRes.on('end', () => resolve(data));
    scriptRes.on('error', reject);
  });

  // Execute through bash, piping the script content to stdin
  onStatus?.('Running installer...');
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', ['-s', '--', '-d', installDir], {
      stdio: ['pipe', 'inherit', 'pipe'],
    });

    let stderr = '';
    proc.stderr?.on('data', (d) => { stderr += d; });

    proc.stdin.write(scriptContent);
    proc.stdin.end();

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`CLI installer exited with code ${code}. ${stderr.trim()}`));
    });

    proc.on('error', reject);
  });
}
