// 整句翻译：免费在线接口，两家互为备份，记住哪家能用

const CACHE_KEY = "et.tcache";
const PREF_KEY = "et.tprov";
const CACHE_MAX = 400;

function decodeEntities(s) {
  return s
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function withTimeout(ms, fn) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fn(ctl.signal);
  } finally {
    clearTimeout(timer);
  }
}

export const PROVIDERS = {
  google: {
    name: "Google 翻译",
    async run(q, signal) {
      const url =
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=" +
        encodeURIComponent(q);
      const r = await fetch(url, { signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const t = (j[0] || []).map((x) => x[0]).join("");
      if (!t) throw new Error("空结果");
      return t;
    },
  },
  mymemory: {
    name: "MyMemory",
    async run(q, signal) {
      const url =
        "https://api.mymemory.translated.net/get?langpair=zh-CN|en&q=" + encodeURIComponent(q);
      const r = await fetch(url, { signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const t = j.responseData && j.responseData.translatedText;
      if (!t || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(t)) {
        throw new Error(j.responseDetails || "额度用完");
      }
      return decodeEntities(t);
    },
  },
};

// MyMemory 单次最多 500 字节，长段落按句切开
export function splitForTranslate(text, maxLen = 120) {
  const parts = text.match(/[^。！？!?\n]+[。！？!?]*|\n+/g) || [text];
  const out = [];
  let cur = "";
  for (const p of parts) {
    if (/^\n+$/.test(p)) { if (cur) out.push(cur); cur = ""; continue; }
    if ((cur + p).length > maxLen && cur) { out.push(cur); cur = p; }
    else cur += p;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

export class Translator {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    try { this.cache = JSON.parse(storage.getItem(CACHE_KEY) || "{}"); } catch { this.cache = {}; }
    this.order = ["google", "mymemory"];
    const pref = storage.getItem(PREF_KEY);
    if (pref && this.order.includes(pref)) this.order = [pref, ...this.order.filter((x) => x !== pref)];
    this.lastProvider = "";
  }

  _remember(q, t) {
    this.cache[q] = t;
    const keys = Object.keys(this.cache);
    if (keys.length > CACHE_MAX) for (const k of keys.slice(0, keys.length - CACHE_MAX)) delete this.cache[k];
    try { this.storage.setItem(CACHE_KEY, JSON.stringify(this.cache)); } catch { /* 存满就不缓存 */ }
  }

  async _one(q) {
    if (this.cache[q]) return { text: this.cache[q], provider: "缓存" };
    let lastErr;
    for (const id of this.order) {
      try {
        const text = await withTimeout(id === this.order[0] ? 3500 : 6000, (s) => PROVIDERS[id].run(q, s));
        if (id !== this.order[0]) {
          this.order = [id, ...this.order.filter((x) => x !== id)];
          this.storage.setItem(PREF_KEY, id);
        }
        this._remember(q, text);
        return { text, provider: PROVIDERS[id].name };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("翻译失败");
  }

  async translate(text) {
    const parts = splitForTranslate(text);
    const res = [];
    let provider = "";
    for (const p of parts) {
      const r = await this._one(p);
      res.push(r.text.trim());
      if (r.provider !== "缓存") provider = r.provider;
    }
    this.lastProvider = provider || "缓存";
    return { text: res.join(" "), provider: this.lastProvider };
  }
}
