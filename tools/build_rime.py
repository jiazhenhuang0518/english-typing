"""Build the Rime (雾凇拼音) English-hint add-on.

Outputs (in dist/rime/, not published to Pages; uploaded as GitHub Release assets):
  english-hint-overlay.zip   only our files, for 仓输入法 (iOS, already bundles rime-ice)
  rime-ice-english-full.zip  rime-ice + our files, for 鼠须管 / 小狼毫 / 同文

Both zips have no top-level folder (仓输入法 requires that).
"""
import json
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "rime" / "src"
ICE = ROOT / "tools" / "raw" / "rime-ice-main"
DIST = ROOT / "dist" / "rime"
STAGE = DIST / "overlay"

MAX_SENSES = 2
MAX_LEN = 28

# 高频虚词：词典释义要么空、要么是语法说明，打字时看不懂，手写成能对应英文的说法
OVERRIDES = {
    "了": "(done) -ed", "着": "-ing", "过": "pass; ever (-ed)", "吗": "? (yes/no)",
    "呢": "? / how about", "吧": "let's; right?", "得": "get; must", "第": "No.; -th",
    "们": "-s (plural)", "么": "?", "个": "a; one", "说": "say; speak",
    "的": "'s; of", "地": "ground; -ly", "就": "then; just", "什么": "what",
    "没有": "not have; didn't", "知道": "know", "时候": "time; when",
    "好": "good; well", "上": "up; on", "下": "down; under",
}


def ice_words():
    words = set()
    for p in (ICE / "cn_dicts").glob("*.dict.yaml"):
        body = False
        with open(p, encoding="utf-8") as f:
            for line in f:
                if not body:
                    body = line.startswith("...")
                    continue
                if line.startswith("#") or not line.strip():
                    continue
                words.add(line.split("\t", 1)[0])
    return words


def short_gloss(full):
    gloss = full.split("|", 1)[0]
    out = []
    for s in gloss.split(";"):
        s = re.sub(r"\([^)]*\)|\(.*$", "", s)
        s = re.sub(r"^to ", "", re.sub(r"\s+", " ", s).strip())
        if not s or s in out or "[" in s:
            continue
        if out and len("; ".join(out + [s])) > MAX_LEN:
            break
        out.append(s)
        if len(out) == MAX_SENSES:
            break
    text = "; ".join(out)
    if len(text) > MAX_LEN:
        text = text[: MAX_LEN - 1].rstrip() + "…"
    return text


def short_zh(meaning):
    """'v. 是，在（am / is / are 的原形）' -> '是，在'"""
    m = re.sub(r"^([a-z]+\.\s*)+", "", meaning.split("；")[0].split(";")[0])
    m = re.sub(r"（[^）]*）|\([^)]*\)", "", m)
    m = re.split(r"[，,、]", m.strip(" ，,"))[0]
    return m[:10].replace(" ", "_")


def build_dict():
    zh2en = json.loads((ROOT / "app" / "data" / "zh2en.json").read_text(encoding="utf-8"))
    known = ice_words()
    rows = []
    for zh, full in zh2en.items():
        if zh not in known and len(zh) > 1:
            continue
        g = OVERRIDES.get(zh) or short_gloss(full)
        if not g:
            continue
        rows.append(f"{zh}\t{g.replace(' ', '_')}")
    # English candidates (雾凇 mixes in English words) get the Chinese meaning
    words = json.loads((ROOT / "app" / "data" / "words.json").read_text(encoding="utf-8"))
    zh_of = {w: short_zh(m) for w, _, m, _ in words["list"]}
    for form, lemma in words["forms"].items():
        zh_of.setdefault(form, zh_of.get(lemma, ""))
    for w, zh in zh_of.items():
        if zh:
            rows.append(f"{w}\t{zh}")
    head = (
        "# 打字学英语 · 中文词 → 英文注释\n"
        "# 由 tools/build_rime.py 从 CC-CEDICT 生成，别手改。\n"
        "# 许可：CC BY-SA 4.0（CC-CEDICT, https://cc-cedict.org）\n"
        "# 编码列是英文释义，空格存成 _ ，由 lua/english_hint.lua 还原。\n"
        "---\n"
        "name: english_hint\n"
        'version: "1"\n'
        "sort: original\n"
        "...\n"
    )
    return head + "\n".join(rows) + "\n", len(rows)


def zip_dir(src_dirs, out):
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        seen = set()
        # later dirs win, so our rime_ice.custom.yaml etc. override nothing in rime-ice by accident
        for d in reversed(src_dirs):
            for p in sorted(d.rglob("*")):
                if p.is_dir() or p.name == ".DS_Store":
                    continue
                rel = p.relative_to(d).as_posix()
                if rel.startswith((".git", "others/", "build/")) or rel in seen:
                    continue
                seen.add(rel)
                z.write(p, rel)


def main():
    if STAGE.exists():
        shutil.rmtree(STAGE)
    shutil.copytree(SRC, STAGE)
    text, n = build_dict()
    (STAGE / "english_hint.dict.yaml").write_text(text, encoding="utf-8")
    zip_dir([STAGE], DIST / "english-hint-overlay.zip")
    zip_dir([ICE, STAGE], DIST / "rime-ice-english-full.zip")
    for f in ("english-hint-overlay.zip", "rime-ice-english-full.zip"):
        print(f, round((DIST / f).stat().st_size / 1e6, 1), "MB")
    print("entries", n)


if __name__ == "__main__":
    main()
