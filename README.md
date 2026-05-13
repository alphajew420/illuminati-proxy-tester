<div align="center">
  <img src="./public/brand/logo-icon-text-long.png" alt="Illuminati Proxy Tester" width="320">
  <h1 align="center">Illuminati Proxy Tester</h1>
  <p align="center">
    Fast, open-source desktop app for testing and analyzing proxy lists.<br>
    HTTP / HTTPS / SOCKS4 / SOCKS5 — geo, anonymity, DNS-leak, stickiness, rotation, multi-target, and more.
  </p>
</div>

<p align="center">
  <a href="https://github.com/alphajew420/illuminati-proxy-tester/releases/latest">
    <img src="https://img.shields.io/github/v/release/alphajew420/illuminati-proxy-tester?style=for-the-badge&label=Download%20Latest&color=facc15" alt="Download latest release">
  </a>
  <a href="https://github.com/alphajew420/illuminati-proxy-tester/actions/workflows/release.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/alphajew420/illuminati-proxy-tester/release.yml?style=for-the-badge&label=Build" alt="Build status">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/github/license/alphajew420/illuminati-proxy-tester?style=for-the-badge" alt="License">
  </a>
</p>

<p align="center">
  <a href="#installation">Install</a>
  ·
  <a href="#features">Features</a>
  ·
  <a href="#development">Development</a>
  ·
  <a href="https://github.com/alphajew420/illuminati-proxy-tester/issues">Issues</a>
  ·
  <a href="https://github.com/alphajew420/illuminati-proxy-tester/releases">Releases</a>
</p>

---

## About

A modern proxy testing tool built on Next.js 16 + Tauri 2. The app spawns a sidecar Node.js server that runs probes against each proxy in parallel — paste a list, get a real-time table of working/failing proxies with latency, geo, ISP, and (optionally) a battery of advanced diagnostics.

## Features

### Core
- **High-concurrency testing** — configurable worker pool, runs through thousands of proxies in seconds.
- **Multi-protocol** — auto-handles `host:port`, `host:port:user:pass`, `user:pass@host:port`, and `scheme://` URL formats; tests HTTP / HTTPS / SOCKS4 / SOCKS5.
- **Geo-IP + ISP** — country, city, ASN, ISP per working proxy.
- **Smart UI** — sortable results, copy/export actions, pro-mode diagnostics (DNS timing, TCP handshake, auth time).
- **Auto-updates** — Tauri updater signs every release; clients pull updates automatically.
- **Cross-platform** — macOS (Intel + Apple Silicon universal), Windows, Linux (`.deb`, `.AppImage`, `.rpm`).

### Advanced probes (Extras tab — all opt-in)
1. **Geographic correctness** — compares claimed country against real exit country (tag input lines as `[US] 1.2.3.4:8080` to enable).
2. **Latency distribution** — fires N samples per proxy, reports p50 / p95 / jitter, flags unstable proxies.
3. **Protocol auto-detect** — probes http / https / socks5 / socks4 in parallel; tells you which actually work.
4. **Anonymity tier** — Elite / Anonymous / Transparent based on which headers leak the client IP.
5. **DNS-leak detection** — controlled per-test DNS token; flags proxies that bypass their own DNS.
6. **Multi-target reachability grid** — proxy × target matrix, color-coded OK / blocked / CAPTCHA / fail.
7. **Session stickiness** — 5 sequential lookups over ~30s; reports whether the exit IP holds.
8. **Concurrent connection cap** — fires N parallel requests; reports the ceiling before throttling.
9. **Cost-per-GB tracker** — set a $/GB rate, the app accumulates bytes and projects $ per 1k successes.
10. **Save / load sessions** — `.proxytester` files via Tauri save-dialog (desktop) or browser download (web); recent sessions kept in `localStorage`.
11. **CAPTCHA-vs-blocked detection** — distinguishes a real block from a Cloudflare / hCaptcha / reCAPTCHA challenge.
12. **Rotation tester** — for endpoints with `session=` / `rotating` hints, counts unique exit IPs over N sequential requests.

---

## Installation

Download the installer for your platform from the [latest release](https://github.com/alphajew420/illuminati-proxy-tester/releases/latest):

| Platform | Architecture | File |
| :--- | :--- | :--- |
| Windows | x64 | `Illuminati.Proxy.Tester_*_x64-setup.exe` |
| macOS | Universal (Intel + Apple Silicon) | `Illuminati.Proxy.Tester_*_universal.dmg` |
| Linux | x64 (Debian / Ubuntu) | `Illuminati.Proxy.Tester_*_amd64.deb` |
| Linux | x64 (universal) | `Illuminati.Proxy.Tester_*_amd64.AppImage` |
| Linux | x64 (RHEL / Fedora) | `Illuminati.Proxy.Tester-*-1.x86_64.rpm` |

Every asset is accompanied by a `.sig` minisign signature used by the in-app auto-updater. You can verify a download manually with `minisign -V -P RWS… -m <file>` against the public key in [`src-tauri/tauri.conf.json`](./src-tauri/tauri.conf.json).

**macOS first-launch:** the binary is not Apple-notarized yet — right-click the app and choose **Open**, then **Open** again at the security prompt. You only need to do this once per install.

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Yarn](https://yarnpkg.com/)
- [Rust](https://www.rust-lang.org/) + Cargo
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Local setup

```sh
git clone https://github.com/alphajew420/illuminati-proxy-tester.git
cd illuminati-proxy-tester
yarn install
yarn tauri dev
```

### Project layout

```
src/             Next.js 16 + React 19 frontend (App Router)
  store/         Zustand store
  components/    UI (Tailwind 4 + Radix primitives)
server/          Node sidecar (proxy testing engine, packaged into bin/ via pkg)
  core/extras.ts All advanced probes
src-tauri/       Rust shell + Tauri config + per-platform installers
.github/         Release workflow (cross-platform CI)
```

### Releasing

The workflow at [`.github/workflows/release.yml`](./.github/workflows/release.yml) builds Windows / macOS-universal / Linux installers on every `v*` tag push and uploads them to a GitHub Release. Signing keys are pulled from repo secrets — see internal notes for key rotation.

```sh
# bump version in package.json + src-tauri/tauri.conf.json, then:
git tag v1.2.3 && git push origin v1.2.3
```

### Contributing

Standard GitHub fork + pull request flow. [Conventional Commits](https://www.conventionalcommits.org/) on commit messages. Open or pick up an issue on the [Issues page](https://github.com/alphajew420/illuminati-proxy-tester/issues) before doing significant work.

---

## Illuminati Networks

- **Website:** [illuminatinetworks.com](https://illuminatinetworks.com)
- **Discord:** [discord.gg/xFUTn7687u](https://discord.gg/xFUTn7687u)
- **Telegram:** [t.me/illuminatinetworks](https://t.me/illuminatinetworks)
- **GitHub:** [github.com/alphajew420](https://github.com/alphajew420)

---

## License

MIT — see [`LICENSE`](./LICENSE).
