// 词典：分级学习词（ECDICT）+ 中文→英文查词（CC-CEDICT）+ 分词

const HAN = /[\u3400-\u9fff]/;
const MAX_ZH = 8;

// 不自动收进词本的虚词（零基础见得太多，背卡片没意义）
export const STOP = new Set(["the", "a", "an", "of", "to", "and", "or"]);

const CONTRACTION_TAIL = { m: ["be"], re: ["be"], s: [], ll: ["will"], ve: ["have"], d: ["would"] };
const NOT_STEM = { wo: "will", ca: "can", sha: "shall" };

// "don't" → ["do", ["not"]]，"I'm" → ["I", ["be"]]
export function splitContraction(tok) {
  const low = tok.toLowerCase();
  if (low.endsWith("n't")) {
    const stem = tok.slice(0, -3);
    return [NOT_STEM[stem.toLowerCase()] || stem, ["not"]];
  }
  const m = low.match(/^(.+)'(m|re|s|ll|ve|d)$/);
  if (m) return [tok.slice(0, m[1].length), CONTRACTION_TAIL[m[2]]];
  return [tok, []];
}

export class Dict {
  constructor() {
    this.list = [];
    this.byWord = new Map();
    this.forms = {};
    this.zh = null;
    this.segmenter = null;
    try {
      if (typeof Intl !== "undefined" && Intl.Segmenter) {
        this.segmenter = new Intl.Segmenter("zh", { granularity: "word" });
      }
    } catch { this.segmenter = null; }
  }

  loadWords(data) {
    this.list = data.list.map(([w, ph, cn, lv], i) => ({ w, ph, cn, lv, rank: i }));
    this.byWord = new Map(this.list.map((e) => [e.w.toLowerCase(), e]));
    this.forms = data.forms || {};
  }

  loadZh(obj) { this.zh = obj; }

  get zhReady() { return !!this.zh; }

  // 查英文词（会把 went / apples 这类变形还原成原形）
  word(w) {
    if (!w) return null;
    const k = w.toLowerCase();
    const hit = this.byWord.get(k);
    if (hit) return hit;
    const base = this.forms[k];
    return base ? this.byWord.get(base.toLowerCase()) || null : null;
  }

  level(lv) { return this.list.filter((e) => e.lv === lv); }

  lookupZh(t) {
    const v = this.zh && this.zh[t];
    if (!v) return null;
    const i = v.indexOf("|");
    return i < 0 ? { gloss: v, hw: "" } : { gloss: v.slice(0, i), hw: v.slice(i + 1) };
  }

  _rawPieces(text) {
    if (this.segmenter) return Array.from(this.segmenter.segment(text), (s) => s.segment);
    return text.match(/[\u3400-\u9fff]+|[^\u3400-\u9fff]+/g) || [];
  }

  _maxMatch(p, out) {
    let i = 0;
    while (i < p.length) {
      let len = Math.min(MAX_ZH, p.length - i);
      while (len > 1 && !(this.zh && this.zh[p.substr(i, len)])) len--;
      out.push(this._tok(p.substr(i, len)));
      i += len;
    }
  }

  _tok(t) {
    const z = this.lookupZh(t);
    const entry = z && z.hw ? this.word(z.hw) : null;
    return { t, han: true, gloss: z ? z.gloss : "", hw: z ? z.hw : "", entry };
  }

  // 把一段中文切成词，每个词带上英文
  segment(text) {
    const out = [];
    for (const p of this._rawPieces(text)) {
      if (!HAN.test(p)) {
        const last = out[out.length - 1];
        if (last && !last.han) last.t += p;
        else out.push({ t: p, han: false });
        continue;
      }
      if (/^[\u3400-\u9fff]+$/.test(p) && this.zh && this.zh[p]) out.push(this._tok(p));
      else if (/^[\u3400-\u9fff]+$/.test(p)) this._maxMatch(p, out);
      else {
        for (const q of p.match(/[\u3400-\u9fff]+|[^\u3400-\u9fff]+/g)) {
          if (HAN.test(q)) this._maxMatch(q, out);
          else out.push({ t: q, han: false });
        }
      }
    }
    return out;
  }

  // 英文句子里出现的学习词（原形，去重，去虚词）
  englishWords(sentence) {
    const seen = new Set();
    const res = [];
    const raw = (sentence || "").replace(/[’‘]/g, "'").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
    for (const tok of raw) {
      const [base, extra] = splitContraction(tok);
      for (const w of [base, ...extra]) {
        const e = this.word(w === "I" || w === "i" ? "I" : w);
        if (!e || STOP.has(e.w.toLowerCase()) || seen.has(e.w)) continue;
        seen.add(e.w);
        res.push(e);
      }
    }
    return res;
  }
}

// 跟打时用来比对的“干净”英文：小写、只留字母数字空格撇号
export function normalizeEn(s) {
  return (s || "")
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
