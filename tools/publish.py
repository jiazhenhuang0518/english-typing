#!/usr/bin/env python3
"""Publish to GitHub without a local git identity, via the Git Data API (gh CLI).

  main      <- whole project (minus ignored folders)
  gh-pages  <- contents of app/ (served by GitHub Pages)

Usage: python3 tools/publish.py "commit message"
"""
import base64
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = "jiazhenhuang0518/english-typing"
SKIP_DIRS = {"tools/raw", "tools/shots", "node_modules", ".git", "__pycache__", ".factory"}
SKIP_NAMES = {".DS_Store"}
CO_AUTHOR = "Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"


def gh(path, method="GET", body=None, ok404=False):
    cmd = ["gh", "api", "-X", method, f"repos/{REPO}/{path}"]
    tmp = None
    if body is not None:
        tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False)
        json.dump(body, tmp)
        tmp.close()
        cmd += ["--input", tmp.name]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if tmp:
        Path(tmp.name).unlink()
    if r.returncode != 0:
        if ok404 and ("Not Found" in r.stdout + r.stderr or "404" in r.stderr):
            return None
        raise SystemExit(f"gh api {method} {path} failed: {r.stdout[:300]} {r.stderr[:300]}")
    return json.loads(r.stdout) if r.stdout.strip() else {}


def files_for(base, skip_dirs=()):
    out = []
    for p in sorted(base.rglob("*")):
        rel = p.relative_to(base).as_posix()
        if not p.is_file() or p.name in SKIP_NAMES:
            continue
        if any(rel == d or rel.startswith(d + "/") or f"/{d}/" in f"/{rel}" for d in skip_dirs):
            continue
        out.append((rel, p))
    return out


def blob(p, cache):
    data = p.read_bytes()
    if data in cache:
        return cache[data]
    sha = gh("git/blobs", "POST", {"content": base64.b64encode(data).decode(), "encoding": "base64"})["sha"]
    cache[data] = sha
    return sha


def push_branch(branch, entries, message, cache):
    head = gh(f"git/ref/heads/{branch}", ok404=True)
    parent = head["object"]["sha"] if head else None
    tree = [{"path": rel, "mode": "100755" if p.stat().st_mode & 0o111 else "100644",
             "type": "blob", "sha": blob(p, cache)} for rel, p in entries]
    tree_sha = gh("git/trees", "POST", {"tree": tree})["sha"]
    if parent and gh(f"git/commits/{parent}")["tree"]["sha"] == tree_sha:
        print(f"{branch}: 没有变化")
        return parent
    commit = gh("git/commits", "POST", {
        "message": f"{message}\n\n{CO_AUTHOR}",
        "tree": tree_sha,
        "parents": [parent] if parent else [],
    })["sha"]
    if parent:
        gh(f"git/refs/heads/{branch}", "PATCH", {"sha": commit})
    else:
        gh("git/refs", "POST", {"ref": f"refs/heads/{branch}", "sha": commit})
    print(f"{branch}: {commit[:7]} ({len(entries)} 个文件)")
    return commit


def main():
    msg = sys.argv[1] if len(sys.argv) > 1 else "更新"
    cache = {}
    push_branch("main", files_for(ROOT, SKIP_DIRS), msg, cache)
    app = ROOT / "app"
    nojekyll = Path(tempfile.gettempdir()) / ".nojekyll"
    nojekyll.write_text("")
    push_branch("gh-pages", files_for(app) + [(".nojekyll", nojekyll)], msg, cache)


if __name__ == "__main__":
    main()
