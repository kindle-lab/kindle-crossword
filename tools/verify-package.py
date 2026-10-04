"""Validate the structural parts of a Korean Crossword KPM archive."""
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
    assert manifest["supported_platforms"] == ["kindlehf"]
    assert manifest["dependencies"] == [{"id": "kterm", "min": [2, 6, 0]}]
    required = (
        "manifest.json", "launch.sh", "install.sh", "uninstall.sh", "run-ui.sh",
        "scripts/fetch-puzzle.sh", "scriptlet/korean-crossword.sh",
        "bin/korean-crossword", "assets/korean-crossword-icon.png",
    )
    for path in required:
        assert path in names, f"missing {path}"
    for path in required[1:]:
        if path != "assets/korean-crossword-icon.png":
            assert archive.getmember(path).mode & 0o100, f"{path} must be executable"
    icon = archive.extractfile("assets/korean-crossword-icon.png").read()
    assert icon[:8] == b"\x89PNG\r\n\x1a\n", "icon must be a PNG"
    width, height = struct.unpack(">II", icon[16:24])
    assert (width, height) == (128, 128), "icon must be 128x128"
    data = archive.extractfile("bin/korean-crossword").read()
    assert data[:4] == b"\x7fELF", "binary must be an ELF executable"
    if data[4] == 1:
        header = struct.unpack_from("<16sHHIIIIIHHHHHH", data)
        assert header[2] == 40, "32-bit binary must target ARM"
        assert header[7] & 0x400, "ARM binary must use the hard-float ABI"
        for i in range(header[10]):
            program = struct.unpack_from("<IIIIIIII", data, header[5] + i * header[9])
            assert program[0] not in (2, 3), "Kindle package binary must be static"
print("Verified Korean Crossword KPM package")
