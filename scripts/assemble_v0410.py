from __future__ import annotations

import hashlib
import itertools
import json
import shutil
import sys
from pathlib import Path

VERSION = "0.4.10"
BASE_VERSION = "0.4.9"

# Exact production-file Git blob identities from desktop-tutorial@5509f84f67b4ba162f03c73a98317530f6f224b6.
EXPECTED_V0410_BLOBS = {
    "frontend/src/components/MessageBubble.tsx": "a563c3216c5b4a4b7d12b4be92c9dda5069416c6",
    "frontend/src/components/RunSelector.tsx": "6dcd5b22a1665739b62317e1b0ce8dbc69855ccc",
    "frontend/src/components/ScaledOverlay.tsx": "4136066c7c893356de6240991b584484c94c3c7a",
    "frontend/src/components/Shell.tsx": "c47b584e436c316104cde3e718ab817a56c1fa27",
    "frontend/src/components/UiScaleContext.tsx": "fdf12fc50eb13eb017f04ad166c5ca6906b3304a",
    "frontend/src/hooks/useAutoGrowTextarea.ts": "3a7b129835a51252f361ad7016cd5e0391424257",
    "frontend/src/pages/AccountsPage.tsx": "f9c5fb2492597f4ebb43919492ea4146e9b2732d",
    "frontend/src/pages/InboxPage.tsx": "9034e4dc1fe9f3352340781fecdb51d7489bc04c",
    "frontend/src/styles/v0410.css": "9f4e96edc0f44e9638225a957816b77268d1454c",
    "frontend/src/utils/uiScale.ts": "612bf4d465d47e94a58f7dc4727c30ac9bb60b6b",
}


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text and old not in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one occurrence in {path}: {old!r}; found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_all_version(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if BASE_VERSION not in text and VERSION in text:
        return
    if BASE_VERSION not in text:
        raise SystemExit(f"No {BASE_VERSION} version marker found in {path}")
    path.write_text(text.replace(BASE_VERSION, VERSION), encoding="utf-8")


def concatenate_exact(parts_dir: Path, pattern: str, target: Path, expected_sha: str) -> None:
    parts = sorted(parts_dir.glob(pattern))
    if not parts:
        raise SystemExit(f"No chunks found: {pattern}")
    payloads = [part.read_bytes() for part in parts]

    # Connector-created chunk files preserve every byte inside each chunk, but a
    # line-range transfer may or may not carry the newline at a chunk boundary.
    # Try only that finite ambiguity and accept exclusively the exact source blob.
    boundary_count = max(0, len(payloads) - 1)
    for separators in itertools.product((b"", b"\n"), repeat=boundary_count):
        body = payloads[0]
        for separator, payload in zip(separators, payloads[1:]):
            body += separator + payload
        for suffix in (b"", b"\n"):
            candidate = body + suffix
            if git_blob_sha(candidate) == expected_sha:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(candidate)
                print(f"assembled exact {target.name}: {expected_sha}")
                return

    variants = []
    for separators in itertools.product((b"", b"\n"), repeat=boundary_count):
        body = payloads[0]
        for separator, payload in zip(separators, payloads[1:]):
            body += separator + payload
        variants.extend((git_blob_sha(body), git_blob_sha(body + b"\n")))
    raise SystemExit(
        f"Could not reconstruct exact {target.name}; expected {expected_sha}; "
        f"candidate hashes: {', '.join(sorted(set(variants)))}"
    )


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: assemble_v0410.py <cloned-v049-repo-root>")

    overlay_root = Path(__file__).resolve().parents[1]
    clone_root = Path(sys.argv[1]).resolve()
    source_root = clone_root / "v047_source"
    if not source_root.is_dir():
        raise SystemExit(f"Missing v0.4.9 source root: {source_root}")

    provenance = clone_root / "SOURCE_PROVENANCE.md"
    if not provenance.is_file() or "45d96c6f2931bbeb346e82a1e136ea5c624002ff" not in provenance.read_text(encoding="utf-8"):
        raise SystemExit("Baseline provenance is not the frozen v0.4.9 candidate")

    direct_root = overlay_root / "v047_source"
    if direct_root.is_dir():
        for src in direct_root.rglob("*"):
            if not src.is_file():
                continue
            relative = src.relative_to(direct_root)
            dst = source_root / relative
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    chunks = overlay_root / "overlay_chunks"
    concatenate_exact(
        chunks,
        "InboxPage.tsx.part*",
        source_root / "frontend/src/pages/InboxPage.tsx",
        EXPECTED_V0410_BLOBS["frontend/src/pages/InboxPage.tsx"],
    )
    concatenate_exact(
        chunks,
        "v0410.css.part*",
        source_root / "frontend/src/styles/v0410.css",
        EXPECTED_V0410_BLOBS["frontend/src/styles/v0410.css"],
    )

    main_tsx = source_root / "frontend/src/main.tsx"
    main_text = main_tsx.read_text(encoding="utf-8")
    import_line = "import './styles/v0410.css'"
    if import_line not in main_text:
        marker = "import './styles/v049.css'"
        if marker not in main_text:
            raise SystemExit("Could not locate v049 CSS import")
        main_tsx.write_text(main_text.replace(marker, marker + "\n" + import_line, 1), encoding="utf-8")

    replace_once(
        source_root / "frontend/src/pages/SettingsPage.tsx",
        "Изменение применяется к рабочей области только после сохранения.",
        "Изменение применяется ко всему интерфейсу только после сохранения.",
    )

    package_path = source_root / "frontend/package.json"
    package = json.loads(package_path.read_text(encoding="utf-8"))
    package["version"] = VERSION
    package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lock_path = source_root / "frontend/package-lock.json"
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    lock["version"] = VERSION
    lock["packages"][""]["version"] = VERSION
    lock_path.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for relative in (
        "backend/pyproject.toml",
        "backend/app/main.py",
        "backend/app/api/routes.py",
        "build/VKOutreachManagerMac.spec",
        "build/BUILD_MACOS.sh",
    ):
        replace_all_version(source_root / relative)

    mismatches: list[str] = []
    for relative, expected in EXPECTED_V0410_BLOBS.items():
        path = source_root / relative
        actual = git_blob_sha(path.read_bytes()) if path.is_file() else "MISSING"
        if actual != expected:
            mismatches.append(f"{relative}: expected {expected}, got {actual}")
    if mismatches:
        raise SystemExit("v0.4.10 overlay identity mismatch:\n" + "\n".join(mismatches))

    checks = {
        "frontend package": f'"version": "{VERSION}"' in package_path.read_text(encoding="utf-8"),
        "backend package": f'version = "{VERSION}"' in (source_root / "backend/pyproject.toml").read_text(encoding="utf-8"),
        "FastAPI": f'version="{VERSION}"' in (source_root / "backend/app/main.py").read_text(encoding="utf-8"),
        "health": f'"version": "{VERSION}"' in (source_root / "backend/app/api/routes.py").read_text(encoding="utf-8"),
        "CSS import": import_line in main_tsx.read_text(encoding="utf-8"),
        "DMG name": f"VK_Search_{VERSION}_macOS_arm64.dmg" in (source_root / "build/BUILD_MACOS.sh").read_text(encoding="utf-8"),
    }
    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        raise SystemExit("Assembly metadata checks failed: " + ", ".join(failed))

    print(f"Assembled VK Search {VERSION} over frozen {BASE_VERSION} baseline")
    for relative in EXPECTED_V0410_BLOBS:
        print(f"verified {relative}")


if __name__ == "__main__":
    main()
