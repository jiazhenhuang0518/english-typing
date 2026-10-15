#!/usr/bin/env python3
"""Build app/data/words.json and app/data/zh2en.json from ECDICT + CC-CEDICT.

Usage: python3 tools/build_data.py   (raw files are expected in tools/raw/)
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "raw"
OUT = ROOT / "app" / "data"

WORD_RE = re.compile(r"^(?:I|[A-Za-z][a-z]*(?:[-'][a-z]+)*)$")
POS_RE = re.compile(r"^((?:[a-z]+\.\s*)+)(.*)$")


# ECDICT writes British IPA in an old ASCII-ish style (ai, ei, short i/u without
# the small-cap letters); convert to the notation used in Chinese textbooks.
IPA_STEPS = [
    ("ә", "ə"), (":", "ː"), ("'", "ˈ"), ("əː", "ɜː"), ("ɒː", "ɔː"), ("ɔi", "ɔɪ"), ("ɒi", "ɔɪ"),
    ("ai", "aɪ"), ("ei", "eɪ"), ("əu", "əʊ"), ("au", "aʊ"), ("iə", "ɪə"),
    ("uə", "ʊə"), ("εə", "eə"), ("ε", "e"), ("ɡ", "g"),
]


def clean_phonetic(p):
    p = p.strip()
    if not p:
        return ""
    lead = ""
    if p.startswith(","):
        lead, p = "ˌ", p[1:]
    p = p.split(",")[0]  # ECDICT lists alternative pronunciations after commas
    p = lead + p
    for a, b in IPA_STEPS:
        p = p.replace(a, b)
    p = re.sub(r"i(?!ː)", "ɪ", p)
    p = re.sub(r"u(?!ː)", "ʊ", p)
    return "/" + p + "/"


def clean_cn(translation):
    out = []
    for line in translation.replace("\\r", "").split("\\n"):
        line = line.strip()
        if not line or line.startswith("[") or line.startswith("（") or "[" in line:
            continue
        m = POS_RE.match(line)
        pos, body = (m.group(1).strip(), m.group(2)) if m else ("", line)
        parts = [re.sub(r"^[+\-*~=#@\s]+", "", x) for x in re.split(r"[,，;；]", body)]
        parts = [x.strip() for x in parts if x.strip()]
        if not parts:
            continue
        out.append((pos + " " if pos else "") + "，".join(parts[:3]))
        if len(out) == 2:
            break
    return "；".join(out)


# ECDICT's first sense for some function words is useless to a beginner
CN_OVERRIDES = {
    "a": "art. 一个（用在辅音开头的词前）",
    "an": "art. 一个（用在元音开头的词前）",
    "the": "art. 这个，那个（特指）",
    "in": "prep. 在…里，在…中；adv. 进入",
    "of": "prep. …的，属于",
    "to": "prep. 到，向，给",
    "on": "prep. 在…上，关于；adv. 继续",
    "at": "prep. 在（某地/某时）",
    "for": "prep. 为了，给，持续（多久）",
    "be": "v. 是，在（am / is / are 的原形）",
    "it": "pron. 它",
    "I": "pron. 我",
}


def build_words():
    levels = {}
    with open(RAW / "ecdict.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            w = r["word"].strip()
            tags = set(r["tag"].split())
            if not WORD_RE.match(w):
                continue
            if "zk" in tags:
                lv = 1
            elif "gk" in tags:
                lv = 2
            elif "cet4" in tags:
                lv = 3
            else:
                continue
            cn = CN_OVERRIDES.get(w) or clean_cn(r["translation"])
            ph = clean_phonetic(r["phonetic"])
            if not cn or not ph:
                continue
            frq = int(r["frq"] or 0) or int(r["bnc"] or 0) or 10**7
            key = w.lower() if w != "I" else "I"
            old = levels.get(key)
            if old is None or (old["lv"], old["frq"]) > (lv, frq):
                levels[key] = {"w": w, "ph": ph, "cn": cn, "lv": lv, "frq": frq,
                               "ex": r["exchange"]}
    words = sorted(levels.values(), key=lambda x: (x["lv"], x["frq"], x["w"]))
    forms = {}
    for x in words:
        for part in x["ex"].split("/"):
            kind, _, form = part.partition(":")
            form = form.strip().lower()
            if kind in {"p", "d", "i", "3", "s", "r", "t"} and form and form != x["w"].lower():
                if form not in levels:  # never shadow a real headword ("left", "saw")
                    forms.setdefault(form, x["w"])
    return [[x["w"], x["ph"], x["cn"], x["lv"]] for x in words], forms


SKIP_SENSE = re.compile(
    r"^(surname|variant of|old variant|archaic variant|see |used in|CL:|"
    r"\(old\)|\(archaic\)|\(literary\)|\(dialect\)|\(Tw\)|abbr\. for|"
    r"Japanese variant|erhua variant|\(bound form\)|\(onom\.\)|pr\.|"
    r"also pr\.|also written|\(Cantonese\)|\(slang\)|\(Internet slang\))",
    re.I,
)


def strip_parens(s):
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"\([^()]*\)", "", s)
    return re.sub(r"\s+", " ", s).strip(" ,.")


STOP = {"a", "an", "the", "to", "of", "or", "and", "be", "one's", "sb", "sth", "oneself"}

# Function words whose CC-CEDICT first sense is misleading for beginners.
OVERRIDES = {
    "了": "(done / changed) — no direct word",
    "的": "'s; of (shows possession)|of",
    "吗": "? (yes-no question)",
    "呢": "? (and you? / what about)",
    "吧": "(suggestion: let's …)",
    "着": "(-ing: in progress)",
    "过": "(have done before); to pass|pass",
    "得": "(how well: … so that …)",
    "地": "(-ly: adverb marker); earth|earth",
    "啊": "ah; oh|oh",
    "是": "is; am; are; yes|be",
    "在": "at; in; be doing|in",
    "和": "and; with|and",
    "也": "also; too|also",
    "都": "all; both|all",
    "不": "not; no|not",
    "没": "not have; did not|not",
    "要": "want; will; need|want",
    "会": "can; will; meeting|can",
    "能": "can; be able to|can",
    "想": "want to; think; miss|want",
    "去": "to go|go",
    "来": "to come|come",
    "这": "this|this",
    "那": "that|that",
    "个": "(measure word) — one, a|one",
    "早上": "morning|morning",
    "晚上": "evening; night|evening",
    "下午": "afternoon|afternoon",
    "上午": "morning|morning",
}


def headword_of(senses, known):
    for s in senses:
        t = strip_parens(s)
        t2 = re.sub(r"^(to|a|an|the)\s+", "", t, flags=re.I)
        if t2 in known:
            return t2
        if t2.lower() in known:
            return t2.lower()
    # short phrase ("early morning", "to go to bed"): verbs keep their first
    # content word, noun phrases their last one
    for s in senses[:2]:
        t = strip_parens(s)
        toks = [x for x in re.findall(r"[A-Za-z'-]+", t)]
        content = [x for x in toks if x.lower() not in STOP]
        if not content or len(toks) > 4:
            continue
        cand = content if t.lower().startswith("to ") else list(reversed(content))
        for c in cand:
            if c in known:
                return c
            if c.lower() in known:
                return c.lower()
    return ""


def build_zh2en(known):
    best = {}
    with open(RAW / "cedict.txt", encoding="utf-8") as f:
        for line in f:
            if line.startswith("#"):
                continue
            m = re.match(r"^(\S+) (\S+) \[([^\]]*)\] /(.*)/\s*$", line)
            if not m:
                continue
            simp, pinyin, defs = m.group(2), m.group(3), m.group(4)
            if len(simp) > 8 or not re.match(r"^[\u3400-\u9fff]+$", simp):
                continue
            proper = pinyin[:1].isupper()
            usable = [
                s.strip()
                for d in defs.split("/")
                for s in d.split(";")
                if s.strip() and not SKIP_SENSE.match(s.strip()) and "CL:" not in s
            ]
            # drop place/person names hiding inside common words ("Shui River"),
            # unless capitalised senses are all there is ("Internet")
            senses = [
                s for s in usable
                if proper or not strip_parens(s)[:1].isupper() or s == "I" or s.startswith("I ")
            ] or usable
            if not senses:
                continue
            gloss_parts, total = [], 0
            for s in senses:
                s2 = strip_parens(s) or s
                if s2 in gloss_parts:
                    continue
                if gloss_parts and total + len(s2) > 36:
                    break
                gloss_parts.append(s2)
                total += len(s2) + 2
                if len(gloss_parts) == 3:
                    break
            gloss = "; ".join(gloss_parts)
            hw = headword_of(senses, known)
            rank = (proper, 0 if hw else 1)
            old = best.get(simp)
            if old is None or rank < old[0]:
                best[simp] = (rank, gloss, hw)
    out = {k: (g + "|" + hw if hw else g) for k, (_, g, hw) in sorted(best.items())}
    out.update(OVERRIDES)
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    words, forms = build_words()
    known = {w[0] for w in words}
    zh2en = build_zh2en(known)
    (OUT / "words.json").write_text(
        json.dumps({"list": words, "forms": forms}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    (OUT / "zh2en.json").write_text(
        json.dumps(zh2en, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    by_lv = {}
    for w in words:
        by_lv[w[3]] = by_lv.get(w[3], 0) + 1
    print("words", len(words), by_lv, "forms", len(forms), "zh2en", len(zh2en))


if __name__ == "__main__":
    main()
