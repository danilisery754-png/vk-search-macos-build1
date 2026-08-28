from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_v0410_layout_override_loads_last():
    main = (ROOT / "frontend" / "src" / "main.tsx").read_text(encoding="utf-8")
    ordered = [
        "./styles/global.css",
        "./styles/v041.css",
        "./styles/v049.css",
        "./styles/v0410.css",
    ]
    positions = [main.index(item) for item in ordered]
    assert positions == sorted(positions)


def test_v0410_outer_viewport_cannot_fall_back_to_legacy_100vh_geometry():
    css = (ROOT / "frontend" / "src" / "styles" / "v0410.css").read_text(encoding="utf-8")
    assert ".app-viewport" in css
    assert "position: fixed" in css
    assert "inset: 0" in css
    assert "overflow: hidden" in css
    assert "background: var(--bg)" in css
    assert "min-width: 0 !important" in css
    assert "min-height: 0 !important" in css
    assert ".app-scale-layer > .app-shell" in css
    assert "height: 100%" in css
    assert "100vh" not in css


def test_v0410_desktop_host_does_not_open_debug_tools_or_add_a_second_panel():
    desktop = (ROOT / "desktop" / "main.py").read_text(encoding="utf-8")
    assert "webview.start(" in desktop
    assert "debug=False" in desktop
    assert "debug=True" not in desktop
    assert "background_color=\"#09101d\"" in desktop
    assert "open_devtools" not in desktop.lower()
    assert "developer_tools" not in desktop.lower()
