import https from 'https';
import { getLinuxArch } from './utils.js';

const IDE_RELEASES_API =
  'https://antigravity-ide-auto-updater-974169037036.us-central1.run.app/releases';
const CLI_RELEASES_API =
  'https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/releases';

/**
 * Fetch a JSON response from a URL (follows up to 5 redirects).
 * @param {string} url
 * @param {number} [redirects=5]
 * @returns {Promise<unknown>}
 */
function fetchJSON(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 12000 }, (res) => {
      // Handle redirects
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        if (redirects <= 0) return reject(new Error('Too many redirects'));
        return resolve(fetchJSON(res.headers.location, redirects - 1));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }

      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error(`Invalid JSON response from ${url}`));
        }
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out (${url})`));
    });
  });
}

/**
 * Builds the direct CDN download URL for the Antigravity IDE tarball.
 * @param {string} version
 * @param {string} executionId
 * @returns {string}
 */
function buildIDEDownloadUrl(version, executionId) {
  const arch = getLinuxArch();
  // The space in "Antigravity IDE" must be percent-encoded
  return `https://edgedl.me.gvt1.com/edgedl/release2/j0qc3/antigravity/stable/${version}-${executionId}/${arch}/Antigravity%20IDE.tar.gz`;
}

/**
 * Fetches the latest release metadata from Google's APIs for both products.
 * @returns {Promise<{
 *   ide: { version: string, executionId: string, downloadUrl: string },
 *   cli: { version: string, installScriptUrl: string }
 * }>}
 */
export async function fetchLatestReleases() {
  const [ideData, cliData] = await Promise.all([
    fetchJSON(IDE_RELEASES_API),
    fetchJSON(CLI_RELEASES_API),
  ]);

  if (!Array.isArray(ideData) || ideData.length === 0) {
    throw new Error('Unexpected response from IDE releases API');
  }
  if (!Array.isArray(cliData) || cliData.length === 0) {
    throw new Error('Unexpected response from CLI releases API');
  }

  const ide = ideData[0];
  const cli = cliData[0];

  return {
    ide: {
      version: ide.version,
      executionId: ide.execution_id,
      downloadUrl: buildIDEDownloadUrl(ide.version, ide.execution_id),
    },
    cli: {
      version: cli.version,
      installScriptUrl: 'https://antigravity.google/cli/install.sh',
    },
  };
}
