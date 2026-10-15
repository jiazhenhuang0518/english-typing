#!/usr/bin/env python3
"""Stamp sw.js VERSION with a hash of every cached file, so phones pick up updates.

Run before each deploy: python3 tools/stamp_version.py
"""
import hashlib
import re
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "app"
sw = APP / "sw.js"
text = sw.read_text(encoding="utf-8")
h = hashlib.sha256()
for p in sorted(APP.rglob("*")):
    if p.is_file() and p.name != "sw.js" and not p.name.startswith("."):
        h.update(str(p.relative_to(APP)).encode())
        h.update(p.read_bytes())
ver = "et-" + h.hexdigest()[:10]
new = re.sub(r'const VERSION = "[^"]*";', f'const VERSION = "{ver}";', text, count=1)
if new != text:
    sw.write_text(new, encoding="utf-8")
print(ver)
