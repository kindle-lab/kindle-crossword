"""Validate a Korean Crossword Mesquite/KPM archive."""
import json
import struct
import sys
import tarfile

archive_path = sys.argv[1]
with tarfile.open(archive_path, "r:gz") as archive:
    names = set(archive.getnames())
    manifest = json.load(archive.extractfile("manifest.json"))
    assert manifest["manifest_version"] == 2
    assert manifest["id"] == "korean-crossword"
    assert manifest["version"] == [0, 4, 0]
    assert manifest["supported_platforms"] == ["kindlehf"]
    assert manifest["dependencies"] == []
    required = (
        "manifest.json", "launch.sh", "install.sh", "uninstall.sh",
        "app/config.xml", "app/index.html", "app/core.js", "app/app.js", "app/app.css",
        "scripts/register-app.sh", "scripts/unregister-app.sh",
        "scriptlet/korean-crossword.sh", "assets/korean-crossword-cover.png",
    )
    for path in required:
        assert path in names, f"missing {path}"
    executable = (
        "launch.sh", "install.sh", "uninstall.sh", "scripts/register-app.sh",
        "scripts/unregister-app.sh", "scriptlet/korean-crossword.sh",
    )
    for path in executable:
        assert archive.getmember(path).mode & 0o100, f"{path} must be executable"
    icon = archive.extractfile("assets/korean-crossword-cover.png").read()
    assert icon[:8] == b"\x89PNG\r\n\x1a\n", "cover must be a PNG"
    width, height = struct.unpack(">II", icon[16:24])
    assert width * 3 == height * 2, "cover must be portrait 2:3"
    assert height >= 384, "cover must be Library-sized portrait art"
    config = archive.extractfile("app/config.xml").read().decode("utf-8")
    index = archive.extractfile("app/index.html").read().decode("utf-8")
    core_js = archive.extractfile("app/core.js").read().decode("utf-8")
    app_js = archive.extractfile("app/app.js").read().decode("utf-8")
    launch = archive.extractfile("launch.sh").read().decode("utf-8")
    install = archive.extractfile("install.sh").read().decode("utf-8")
    register = archive.extractfile("scripts/register-app.sh").read().decode("utf-8")
    scriptlet = archive.extractfile("scriptlet/korean-crossword.sh").read().decode("utf-8")
    assert "kindle.lab.crossword" in config
    assert 'version="0.4.0"' in config
    assert 'internetRequired" value="no"' in config
    assert "register-app.sh" in launch and "kterm" not in launch.lower()
    assert "mesquite" in register and "appreg.db" in register
    assert "window.kindle" in index
    assert 'id="cell-input"' in index
    assert 'id="article-link"' in index
    assert "fingerprint" in core_js and "articleUrl" in core_js
    assert "XMLHttpRequest" in app_js and "localStorage" in app_js
    assert "Core.setCell" in app_js
    assert "kterm" not in install.lower()
    assert "/mnt/us/korean-crossword-cover.png" in scriptlet
    assert "/mnt/us/documents/Korean Crossword.sh" in install
print("Verified Korean Crossword Mesquite KPM package v0.4.0")
