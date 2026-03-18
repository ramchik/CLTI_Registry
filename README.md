# CLTI Bypass Registry

Offline Infrainguinal Bypass Registry for CLTI — ESVS/GVG compliant.

## Windows download

Windows builds are published as GitHub release assets:

- `CLTI Bypass Registry-<version>-Setup.exe` — installer with Start Menu/Desktop shortcuts
- `CLTI Bypass Registry-<version>-Portable.exe` — single executable you can download and run directly

Open the repository's **Releases** page and download the `.exe` that fits your needs.

## Build a Windows `.exe` locally

Use Node 20, then run:

```bash
npm ci
npm run package:win
```

The generated Windows executables are written to the `release/` folder.

## Publishing downloadable Windows releases

Push a version tag such as `v1.0.0` to trigger the GitHub Actions release workflow. It will build the Windows artifacts and publish the `.exe` files on the GitHub Releases page.
