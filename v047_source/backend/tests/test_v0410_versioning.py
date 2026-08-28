from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
VERSION = "0.4.10"


def test_v0410_version_metadata_is_consistent():
    package = json.loads((ROOT / "frontend" / "package.json").read_text(encoding="utf-8"))
    lock = json.loads((ROOT / "frontend" / "package-lock.json").read_text(encoding="utf-8"))
    pyproject = (ROOT / "backend" / "pyproject.toml").read_text(encoding="utf-8")
    main = (ROOT / "backend" / "app" / "main.py").read_text(encoding="utf-8")
    routes = (ROOT / "backend" / "app" / "api" / "routes.py").read_text(encoding="utf-8")
    mac_spec = (ROOT / "build" / "VKOutreachManagerMac.spec").read_text(encoding="utf-8")
    mac_build = (ROOT / "build" / "BUILD_MACOS.sh").read_text(encoding="utf-8")

    assert package["version"] == VERSION
    assert lock["packages"][""]["dependencies"] == package["dependencies"]
    assert lock["packages"][""]["devDependencies"] == package["devDependencies"]
    assert f'version = "{VERSION}"' in pyproject
    assert f'version="{VERSION}"' in main
    assert f'"version": "{VERSION}"' in routes
    assert f'version="{VERSION}"' in mac_spec
    assert f'"CFBundleShortVersionString": "{VERSION}"' in mac_spec
    assert f'"CFBundleVersion": "{VERSION}"' in mac_spec
    assert f"VK_Search_{VERSION}_macOS_arm64.dmg" in mac_build


def test_v0410_keeps_existing_application_identity():
    mac_spec = (ROOT / "build" / "VKOutreachManagerMac.spec").read_text(encoding="utf-8")
    assert 'bundle_identifier="com.vkoutreach.manager"' in mac_spec
