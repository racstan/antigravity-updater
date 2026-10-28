#!/usr/bin/env node
/**
 * antigravity-updater — Interactive CLI entry point
 *
 * Usage:
 *   antigravity-updater
 *   npx antigravity-updater
 */

import * as clack from '@clack/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

import { detectInstallations } from '../src/detect.js';
import { fetchLatestReleases } from '../src/releases.js';
import { installIDE, installCLI } from '../src/install.js';
import {
  formatBytes,
  sleep,
  getRunningCount,
  killProcess,
  forceKillProcess,
  checkCommand,
} from '../src/utils.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const PKG_VERSION = '1.0.3';
const DOCS_URL = 'https://antigravity.google/docs/getting-started';
const GITHUB_URL = 'https://github.com/racstan/antigravity-updater';
const DONATE_URL = 'https://buymeacoffee.com/rachitasthana';

// ─── Graceful cancel on Ctrl+C ───────────────────────────────────────────────
process.on('SIGINT', () => {
  clack.cancel(chalk.yellow('Update cancelled.'));
  process.exit(0);
});

// ─── Simple --help / --version flags (before interactive prompts) ─────────────
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(`antigravity-updater v${PKG_VERSION}`);
  process.exit(0);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${chalk.bold('antigravity-updater')} v${PKG_VERSION}
Interactive auto-updater for Google Antigravity IDE and agy CLI on Linux.

${chalk.bold('Usage:')}
  antigravity-updater          Launch the interactive updater
  antigravity-updater --check  Check for updates without installing
  antigravity-updater --help   Show this help
  antigravity-updater --version Show version

${chalk.bold('GitHub:')}  ${GITHUB_URL}
${chalk.bold('Support:')} ${DONATE_URL}
`);
  process.exit(0);
}

const CHECK_ONLY = process.argv.includes('--check') || process.argv.includes('-c');

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.clear();

  // Header banner
  const line = '══════════════════════════════════════════════════════';
  console.log(chalk.cyan.bold(`\n  ╔${line}╗`));
  console.log(chalk.cyan.bold(`  ║`) + chalk.white.bold('          Google Antigravity Updater') + chalk.dim(`  v${PKG_VERSION}           `) + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold(`  ║`) + chalk.dim('    Unofficial interactive updater for Linux            ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold(`  ╚${line}╝\n`));

  // ── Prerequisites check ──────────────────────────────────────────────────
  const requiredCmds = ['tar'];
  const missingCmds = requiredCmds.filter((c) => !checkCommand(c));
  if (missingCmds.length > 0) {
    clack.cancel(
      `Missing required system tools: ${chalk.bold(missingCmds.join(', '))}.\n` +
      `  Install them with your package manager and try again.`
    );
    process.exit(1);
  }

  // ── Step 1: Detect installations ─────────────────────────────────────────
  const detectSpinner = ora({ text: 'Scanning for Antigravity installations...', color: 'cyan' }).start();

  let ideInstalls, cliPath, cliVersion;
  try {
    ({ ideInstalls, cliPath, cliVersion } = await detectInstallations());
  } catch (err) {
    detectSpinner.fail('Detection failed: ' + err.message);
    process.exit(1);
  }

  const cliInfo = cliPath
    ? `CLI found at ${chalk.dim(cliPath.replace(homedir(), '~'))}`
    : `CLI ${chalk.dim('not found in common locations')}`;

  detectSpinner.succeed(
    ideInstalls.length > 0
      ? `Found ${chalk.bold(ideInstalls.length)} IDE installation(s). ${cliInfo}.`
      : `No IDE installations detected automatically. ${cliInfo}.`
  );

  console.log('');

  // ── Step 2: Fetch latest releases from Google ────────────────────────────
  const releaseSpinner = ora({ text: 'Fetching latest release info from Google...', color: 'cyan' }).start();

  let releases;
  try {
    releases = await fetchLatestReleases();
    releaseSpinner.succeed(
      `Latest releases: IDE ${chalk.green.bold('v' + releases.ide.version)} | CLI ${chalk.green.bold('v' + releases.cli.version)}`
    );
  } catch (err) {
    releaseSpinner.fail(`Could not reach Google's release API: ${err.message}`);
    clack.log.warn('Check your internet connection and try again.');
    process.exit(1);
  }

  // ── Check-Only Mode: Display report and exit ──────────────────────────────
  if (CHECK_ONLY) {
    console.log('');
    const pad = (s, n) => String(s ?? '').padEnd(n);
    const notes = [];

    if (ideInstalls.length > 0) {
      for (const inst of ideInstalls) {
        const isUpToDate = inst.version === releases.ide.version;
        notes.push(
          `IDE  ${chalk.white(inst.path.replace(homedir(), '~'))}\n     Installed: ${chalk.dim(pad(inst.version, 15))} → Latest: ${chalk.green.bold('v' + releases.ide.version)}  ${isUpToDate ? chalk.green('✓ up to date') : chalk.yellow('⬆ update available')}`
        );
      }
    } else {
      notes.push(`IDE  ${chalk.dim('No local IDE found')} → Latest: ${chalk.green.bold('v' + releases.ide.version)}`);
    }

    const cliUpToDate = cliVersion === releases.cli.version;
    notes.push(
      `CLI  ${chalk.white(cliPath ? cliPath.replace(homedir(), '~') : 'agy')}\n     Installed: ${chalk.dim(pad(cliVersion ?? 'not installed', 15))} → Latest: ${chalk.green.bold('v' + releases.cli.version)}  ${cliUpToDate ? chalk.green('✓ up to date') : chalk.yellow('⬆ update available')}`
    );

    clack.note(notes.join('\n\n'), 'Update Check Summary');
    clack.outro(
      chalk.dim('--check mode: no changes made.\n\n') +
      chalk.cyan('  ★ Star on GitHub: ') + chalk.underline(GITHUB_URL) + '\n' +
      chalk.yellow('  ☕ Buy me a coffee: ') + chalk.underline(DONATE_URL)
    );
    process.exit(0);
  }

  // ── Step 3: Select IDE installation (Interactive) ────────────────────────
  const ideOptions = [
    ...ideInstalls.map((i) => {
      const up = i.version === releases.ide.version;
      return {
        value: i.path,
        label: chalk.white(i.path.replace(homedir(), '~')),
        hint: `${i.version} ${up ? '(up to date)' : '(update available)'}`,
      };
    }),
    {
      value: '__custom__',
      label: chalk.white('Enter a custom path'),
      hint: 'if installed elsewhere or custom directory',
    },
    {
      value: '__skip__',
      label: chalk.dim('Skip IDE — only update CLI (agy)'),
      hint: '',
    },
  ];

  const ideChoice = await clack.select({
    message: 'Select Antigravity IDE installation to update',
    options: ideOptions,
    initialValue: ideInstalls[0]?.path ?? '__custom__',
  });
  if (clack.isCancel(ideChoice)) { clack.cancel('Update cancelled.'); process.exit(0); }

  let selectedIDEPath = null;
  let selectedIDEVersion = null;

  if (ideChoice === '__custom__') {
    const customPath = await clack.text({
      message: 'Enter the full path to your Antigravity IDE directory:',
      placeholder: `${homedir()}/Applications/antigravity-ide`,
      validate: (v) => {
        if (!v?.trim()) return 'Path cannot be empty.';
        const bin = join(v.trim(), 'antigravity-ide');
        if (!existsSync(bin)) {
          return `No 'antigravity-ide' binary found at:\n  ${bin}\n  Make sure the path points to the IDE directory, not the binary itself.`;
        }
      },
    });
    if (clack.isCancel(customPath)) { clack.cancel('Update cancelled.'); process.exit(0); }
    selectedIDEPath = customPath.trim();
  } else if (ideChoice !== '__skip__') {
    selectedIDEPath = ideChoice;
    selectedIDEVersion = ideInstalls.find((i) => i.path === ideChoice)?.version ?? null;
  }

  // ── Step 4: Show version comparison for selected components ──────────────
  console.log('');

  const ideUpToDate = selectedIDEVersion === releases.ide.version;
  const cliUpToDate = cliVersion === releases.cli.version;

  const pad = (s, n) => String(s ?? '').padEnd(n);

  const ideRow = selectedIDEPath
    ? `IDE  ${chalk.dim(pad(selectedIDEVersion ?? 'unknown', 28))} → ${chalk.green.bold('v' + releases.ide.version)}  ${ideUpToDate ? chalk.green('✓ up to date') : chalk.yellow('⬆ update available')}`
    : `IDE  ${chalk.dim('(skipped)')}`;

  const cliRow =
    `CLI  ${chalk.dim(pad(cliVersion ?? 'not installed', 28))} → ${chalk.green.bold('v' + releases.cli.version)}  ${cliUpToDate ? chalk.green('✓ up to date') : chalk.yellow('⬆ update available')}`;

  clack.note([ideRow, cliRow].join('\n'), 'Selected Version Status');

  // ── Step 5: Select what to update ────────────────────────────────────────
  const updateOptions = [
    selectedIDEPath
      ? {
          value: 'ide',
          label: 'Antigravity IDE',
          hint: ideUpToDate ? `v${releases.ide.version} — already up to date` : `v${releases.ide.version} available`,
        }
      : null,
    {
      value: 'cli',
      label: 'Antigravity CLI  (agy)',
      hint: cliUpToDate ? `v${releases.cli.version} — already up to date` : `v${releases.cli.version} available`,
    },
  ].filter(Boolean);

  const toUpdate = await clack.multiselect({
    message: 'What would you like to update?',
    options: updateOptions,
    initialValues: [
      ...(selectedIDEPath && !ideUpToDate ? ['ide'] : []),
      ...(!cliUpToDate ? ['cli'] : []),
    ],
    required: false,
  });
  if (clack.isCancel(toUpdate)) { clack.cancel('Update cancelled.'); process.exit(0); }
  if (!toUpdate || toUpdate.length === 0) {
    clack.outro('Nothing selected — exiting.');
    process.exit(0);
  }

  // ── Step 6: IDE installation mode (backup or direct) ─────────────────────
  let noBackup = false;

  if (toUpdate.includes('ide') && selectedIDEPath) {
    const backupMode = await clack.select({
      message: 'Installation mode for IDE',
      options: [
        {
          value: 'backup',
          label: 'Create a backup first',
          hint: 'safer — the old version is kept in case something goes wrong',
        },
        {
          value: 'direct',
          label: 'Direct install  (no backup)',
          hint: 'faster — old version is deleted immediately, less disk space used',
        },
      ],
      initialValue: 'backup',
    });
    if (clack.isCancel(backupMode)) { clack.cancel('Update cancelled.'); process.exit(0); }
    noBackup = backupMode === 'direct';
  }

  // ── Step 7: Handle running Antigravity processes ──────────────────────────
  if (toUpdate.includes('ide') && selectedIDEPath) {
    const running = getRunningCount('antigravity-ide');

    if (running > 0) {
      const label = `${running} process${running !== 1 ? 'es' : ''}`;
      const closeIt = await clack.confirm({
        message: `Antigravity IDE is currently running (${label}). Close it automatically now?`,
        initialValue: true,
      });
      if (clack.isCancel(closeIt)) { clack.cancel('Update cancelled.'); process.exit(0); }

      if (!closeIt) {
        clack.cancel(
          'Please close Antigravity IDE manually, then run this updater again.\n' +
          '  Tip: do not close from the integrated terminal inside Antigravity itself.'
        );
        process.exit(1);
      }

      const closeSpinner = ora({ text: 'Closing Antigravity IDE...', color: 'yellow' }).start();
      killProcess('antigravity-ide');
      await sleep(2000);

      if (getRunningCount('antigravity-ide') > 0) {
        closeSpinner.text = 'Waiting for processes to exit (force-killing)...';
        forceKillProcess('antigravity-ide');
        await sleep(700);
      }

      closeSpinner.succeed('Antigravity IDE closed.');
    }
  }

  console.log('');

  // ── Step 8: Install IDE ───────────────────────────────────────────────────
  if (toUpdate.includes('ide') && selectedIDEPath) {
    const spin = ora({ text: 'Preparing download...', color: 'cyan' }).start();

    try {
      const result = await installIDE({
        installPath: selectedIDEPath,
        release: releases.ide,
        noBackup,
        onProgress: (downloaded, total) => {
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100);
            const barLen = 20;
            const filled = Math.round((pct / 100) * barLen);
            const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(barLen - filled));
            spin.text = `Downloading IDE v${releases.ide.version}  ${bar}  ${pct}%  ${chalk.dim(formatBytes(downloaded) + ' / ' + formatBytes(total))}`;
          } else {
            spin.text = `Downloading IDE v${releases.ide.version}...  ${chalk.dim(formatBytes(downloaded))}`;
          }
        },
        onStatus: (msg) => { spin.text = msg; },
      });

      spin.succeed(chalk.green.bold(`Antigravity IDE v${releases.ide.version} installed.`));

      if (result.backupPath) {
        clack.log.info(chalk.dim(`  Backup: ${result.backupPath.replace(homedir(), '~')}`));
      }
    } catch (err) {
      spin.fail(`IDE update failed: ${err.message}`);
      process.exit(1);
    }
  }

  // ── Step 9: Install CLI ───────────────────────────────────────────────────
  if (toUpdate.includes('cli')) {
    const cliInstallDir = cliPath
      ? cliPath.replace(/\/agy$/, '')
      : `${homedir()}/.local/bin`;

    const spin = ora({ text: 'Installing Antigravity CLI (agy)...', color: 'cyan' }).start();

    try {
      await installCLI({
        cliInstallDir,
        onStatus: (msg) => { spin.text = msg; },
      });
      spin.succeed(chalk.green.bold(`Antigravity CLI v${releases.cli.version} installed.`));
    } catch (err) {
      spin.fail(`CLI update failed: ${err.message}`);
      clack.log.warn(
        `You can install the CLI manually:\n  curl -fsSL https://antigravity.google/cli/install.sh | bash`
      );
    }
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('');
  clack.outro(
    chalk.green.bold('✓ Update complete!') + '\n\n' +
    chalk.dim('  → Launch Antigravity from your Desktop or application menu.\n') +
    chalk.dim(`  → Run ${chalk.cyan('antigravity-updater')} anytime to check for updates.\n\n`) +
    chalk.cyan('  ★ Star on GitHub: ') + chalk.underline(GITHUB_URL) + '\n' +
    chalk.yellow('  ☕ Buy me a coffee: ') + chalk.underline(DONATE_URL)
  );
}

main().catch((err) => {
  console.error(chalk.red('\nFatal error:'), err.message || err);
  process.exit(1);
});
