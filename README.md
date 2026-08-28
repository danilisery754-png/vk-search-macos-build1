# VK Search macOS build — v0.4.10

Public build staging repository for VK Search 0.4.10 macOS ARM64.

Base source: public frozen v0.4.9 repository `danilisery754-png/vk-search-macos-build`, which itself was copied from `desktop-tutorial@45d96c6f2931bbeb346e82a1e136ea5c624002ff`.

This repository stores only the v0.4.10 overlay plus the GitHub-hosted macOS build workflow. The workflow assembles the frozen v0.4.9 base, overlays v0.4.10, runs backend/frontend verification, builds the Apple Silicon DMG, verifies it, and publishes release `v0.4.10`.
