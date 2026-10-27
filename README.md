# antigravity-updater

> A clean, interactive updater for **Google Antigravity IDE** and the **`agy` CLI** on Linux — built because updating on Linux shouldn't be a chore.

[![npm version](https://img.shields.io/npm/v/antigravity-updater.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/antigravity-updater)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-purple?style=flat-square)](https://polyformproject.org/licenses/noncommercial/1.0.0)
[![Linux Support](https://img.shields.io/badge/os-Linux-blue?style=flat-square&logo=linux)](https://github.com/racstan/antigravity-updater)
[![Telemetry](https://img.shields.io/badge/telemetry-zero%20%2F%20100%25%20private-brightgreen?style=flat-square)](https://github.com/racstan/antigravity-updater#privacy--zero-data-collection)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-rachitasthana-yellow?style=flat-square&logo=buy-me-a-coffee)](https://buymeacoffee.com/rachitasthana)

---

## Why this exists

If you're using Google Antigravity on Linux, you already know the frustration: **there is no native one-click updater**.

Every time a new release drops, the manual routine is painful:
1. Figuring out what the latest version is and whether you're behind.
2. Manually downloading large tarball archives.
3. Hunting down and killing running background processes so files aren't locked.
4. Extracting and overwriting folders into `~/Applications` or `/opt` while praying permissions don't break.
5. Updating the `agy` CLI separately using its shell script.

I got tired of repeating these manual steps, so I created **`antigravity-updater`** to automate the whole process into a simple, beautiful terminal prompt. Run one command, choose what to update, and get right back to coding.

---

## Quick Start

You don't even need to install anything permanently. Just run it via `npx`:

```bash
npx antigravity-updater
```

Or install it globally if you want it always available as a command:

```bash
npm install -g antigravity-updater
antigravity-updater
```

---

## What it does

When you launch `antigravity-updater`, it guides you through an interactive terminal interface:

1. **Auto-Detects Installations** — Scans common directories (like `~/Applications/antigravity-ide`, `~/.local/lib`, `/opt`, etc.) and active processes. If you installed it somewhere custom, you can type your path directly.
2. **Checks Google's Official Release APIs** — Fetches the latest published versions directly from Google release endpoints and displays a side-by-side comparison of what you have vs. what's available.
3. **Selective Updates** — Choose to update just the IDE, just the `agy` CLI, or both.
4. **Safety Rollback Backup** — Before touching any files, creates an automatic backup (`~/Applications/antigravity-ide.bak`) so you can roll back instantly if anything goes wrong.
5. **Clean Process Shutdown** — Safely closes running Antigravity IDE and helper instances before overwriting files to prevent corruption.
6. **Live Progress & Atomic Extraction** — Downloads the official tarball with a live progress bar, extracts cleanly, sets proper executable permissions, and links binaries.
7. **Official CLI Updates** — Keeps the `agy` command-line tool updated using Google's official install pipeline.

---

## Commands & Flags

```bash
antigravity-updater           # Full interactive update flow (recommended)
antigravity-updater --check   # Check for updates without downloading or installing
antigravity-updater --version # Show current version
antigravity-updater --help    # Show help and usage details
```

---

## 🔒 Privacy & Zero Data Collection

Your privacy matters. This tool is built strictly for utility:

- **Zero telemetry or tracking:** No analytics, pingbacks, machine identifiers, IP tracking, or user data collection of any kind.
- **Direct connections only:** Network requests are made solely to Google's official release endpoints and download servers to fetch version information and release archives.
- **100% local:** Everything runs locally on your machine. What you do in your terminal stays on your machine.

---

## Compatibility

Works out of the box on any modern Linux distribution:
- Ubuntu / Debian / Linux Mint / Pop!_OS
- Fedora / RHEL / CentOS
- Arch Linux / Manjaro
- openSUSE
- Any other distribution with Node.js ≥ 18 and standard `tar` / `bash` tools.
- Architecture: **x64 (amd64)** and **arm64**.

---

## ☕ Support the Project

If this tool saved you time and made your Linux Antigravity experience a little smoother, buying me a coffee is deeply appreciated!

[![Buy Me A Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=rachitasthana&button_colour=FFDD00&font_colour=000000&font_family=Inter&outline_colour=000000&coffee_colour=ffffff)](https://buymeacoffee.com/rachitasthana)

👉 **[https://buymeacoffee.com/rachitasthana](https://buymeacoffee.com/rachitasthana)**

---

## 📄 License & Restrictions

Licensed under the **[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)**.

Copyright (c) 2026 Rachit Asthana. All rights reserved.

This software is provided for personal, internal, and non-commercial use only. **You may NOT sell, resell, monetize, sublicense, bundle, or distribute this software or modified versions thereof for commercial advantage or monetary compensation without prior express written permission from the copyright holder (Rachit Asthana).**

By downloading, installing, copying, or using this software in any form, you explicitly agree to these terms. See the [`LICENSE`](./LICENSE) file for the complete legal text.

---

*Disclaimer: This is an independent open utility and is not affiliated with or endorsed by Google.*
