# VK Search v0.4.10 build provenance

- Release target: `VK Search 0.4.10` / macOS ARM64.
- Frozen application baseline: `desktop-tutorial@45d96c6f2931bbeb346e82a1e136ea5c624002ff` (VK Search 0.4.9).
- Public baseline mirror used by GitHub Actions: `danilisery754-png/vk-search-macos-build`.
- v0.4.10 source candidate used for the overlay: `desktop-tutorial@5509f84f67b4ba162f03c73a98317530f6f224b6` (`codex/vk-search-v0410`).
- Assembly is deterministic: large/new production UI files are checked against their source-candidate Git blob SHA before tests or packaging.
- Protected sender/queue/retry/quota/worklist/supervisor/VK-client files are checked against the frozen v0.4.9 Git blob identities before packaging.
- The public build workflow runs backend regressions, frontend v0.4.10 scale/overlay/composer/drag tests, TypeScript typecheck, Vite production build, PyInstaller application self-tests, ARM64 verification, codesign verification, DMG verification and SHA-256 verification before publishing a release.
