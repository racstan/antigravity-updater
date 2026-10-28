# antigravity-updater

> Update **Google Antigravity IDE** and the **`agy` CLI** on Linux with one command.

[![npm version](https://img.shields.io/npm/v/antigravity-updater.svg?style=flat-square&color=cb3837)](https://www.npmjs.com/package/antigravity-updater)
[![npm downloads](https://img.shields.io/npm/dm/antigravity-updater.svg?style=flat-square)](https://www.npmjs.com/package/antigravity-updater)
[![Linux](https://img.shields.io/badge/os-Linux-blue?style=flat-square&logo=linux&logoColor=white)](https://github.com/racstan/antigravity-updater)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Telemetry: none](https://img.shields.io/badge/telemetry-none-brightgreen?style=flat-square)](#privacy)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm%20Noncommercial-purple?style=flat-square)](https://polyformproject.org/licenses/noncommercial/1.0.0)

```bash
npx antigravity-updater
```

<p align="center">
  <img src="https://raw.githubusercontent.com/racstan/antigravity-updater/main/docs/screenshot.png" alt="antigravity-updater running in a terminal: it finds the installed IDE and agy CLI, shows the latest releases, and asks which installation to update" width="760">
</p>

---

## Why

Antigravity has no built-in updater on Linux. Updating by hand means checking which version is out, downloading a large tarball, closing every running Antigravity process, unpacking it over your install without breaking permissions, and then updating the `agy` CLI separately.

`antigravity-updater` does all of that from one interactive prompt.

## Quick start

Run it without installing anything:

```bash
npx antigravity-updater
```

Or install it globally:

```bash
npm install -g antigravity-updater
antigravity-updater     # or the short alias: agy-update
```

## How it works

1. **Finds your installs.** Looks in the usual places (`~/Applications/antigravity-ide`, `~/.local/lib`, `/opt` and others) and at running processes. Installed somewhere else? Type the path.
2. **Checks for updates.** Fetches the latest IDE and CLI versions from Google's release endpoints and shows them next to what you have.
3. **Lets you choose.** Update the IDE, the `agy` CLI, or both.
4. **Backs up first.** Copies your current IDE to `<install path>.bak` before changing anything, so you can roll back.
5. **Closes Antigravity safely.** Stops running IDE processes so no files are locked mid-update.
6. **Installs the update.** Downloads the official tarball with a progress bar, extracts it, and sets the right permissions.
7. **Updates the CLI.** Runs Google's official `agy` install script.

## Usage

```bash
antigravity-updater            # Interactive update (recommended)
antigravity-updater --check    # Only check for updates; nothing is downloaded or installed
antigravity-updater --version  # Show this tool's version
antigravity-updater --help     # Show help
```

## Requirements

- Linux on **x64** or **arm64**: Ubuntu, Debian, Mint, Pop!_OS, Fedora, RHEL, Arch, Manjaro, openSUSE and others
- **Node.js 18** or later
- Standard `tar` and `bash`

## Privacy

- **No telemetry.** No analytics, tracking or identifiers of any kind.
- **Only Google is contacted.** Network requests go to Google's release and download servers, nowhere else.
- **Runs locally.** Everything happens on your machine.

## Support

If this saved you some time, a coffee is much appreciated.

[![Buy Me A Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=rachitasthana&button_colour=FFDD00&font_colour=000000&font_family=Inter&outline_colour=000000&coffee_colour=ffffff)](https://buymeacoffee.com/rachitasthana)

Found a bug or have an idea? [Open an issue](https://github.com/racstan/antigravity-updater/issues).

## License

[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0). Copyright (c) 2026 Rachit Asthana.

Free for personal and other non-commercial use. You may **not** sell, resell, monetize, sublicense, bundle or distribute this software, or modified versions of it, for commercial advantage without prior written permission from the copyright holder. See [`LICENSE`](./LICENSE) for the full text.

---

<sub>This is an independent, unofficial tool. It is not affiliated with or endorsed by Google.</sub>
