// 学习进度存储（本机 localStorage）+ 多设备合并规则

const KEY = "et.v1";
const DEVICE_KEY = "et.device";
const MAX_NOTES = 1500;

export const DEFAULT_PREFS = { newPerDay: 10, rate: 0.85, online: true, autoSpeak: true };

export function emptyState() {
  return { v: 1, cards: {}, notes: {}, lessons: {}, stats: {}, prefs: { ...DEFAULT_PREFS, u: 0 } };
}

export function dayKey(t = Date.now()) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 同一条记录两边都有：谁改得晚听谁的（u = 最后修改时间）
function mergeMap(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (!out[k] || (v.u || 0) > (out[k].u || 0)) out[k] = v;
  }
  return out;
}

// 统计按设备分开记，每台设备只加自己的数 → 取最大值就不会重复或丢失
function mergeStats(a = {}, b = {}) {
  const out = JSON.parse(JSON.stringify(a));
  for (const [dev, days] of Object.entries(b)) {
    out[dev] = out[dev] || {};
    for (const [day, rec] of Object.entries(days)) {
      const cur = (out[dev][day] = out[dev][day] || {});
      for (const [f, n] of Object.entries(rec)) cur[f] = Math.max(cur[f] || 0, n);
    }
  }
  return out;
}

function pruneNotes(notes) {
  const ids = Object.keys(notes);
  if (ids.length <= MAX_NOTES) return notes;
  const keep = ids.sort((x, y) => (notes[y].t || 0) - (notes[x].t || 0)).slice(0, MAX_NOTES);
  return Object.fromEntries(keep.map((k) => [k, notes[k]]));
}

export function mergeState(a, b) {
  a = a || emptyState();
  b = b || emptyState();
  const pa = a.prefs || { u: 0 };
  const pb = b.prefs || { u: 0 };
  return {
    v: 1,
    cards: mergeMap(a.cards, b.cards),
    notes: pruneNotes(mergeMap(a.notes, b.notes)),
    lessons: mergeMap(a.lessons, b.lessons),
    stats: mergeStats(a.stats, b.stats),
    prefs: { ...DEFAULT_PREFS, ...((pb.u || 0) > (pa.u || 0) ? pb : pa) },
  };
}

export function sameState(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function sumDay(stats, day) {
  const out = {};
  for (const days of Object.values(stats || {})) {
    for (const [f, n] of Object.entries(days[day] || {})) out[f] = (out[f] || 0) + n;
  }
  return out;
}

export function activeDay(rec) {
  return (rec.zh || 0) + (rec.rev || 0) + (rec.newc || 0) + (rec.en || 0) > 0;
}

// 连续打卡天数：今天还没学就从昨天往回数
export function streak(stats, now = Date.now()) {
  let n = 0;
  let t = now;
  if (!activeDay(sumDay(stats, dayKey(t)))) t -= 86400000;
  while (activeDay(sumDay(stats, dayKey(t)))) {
    n++;
    t -= 86400000;
  }
  return n;
}

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export class Store {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.listeners = new Set();
    this.device = storage.getItem(DEVICE_KEY);
    if (!this.device) {
      this.device = "d-" + randomId();
      storage.setItem(DEVICE_KEY, this.device);
    }
    try {
      this.state = mergeState(JSON.parse(storage.getItem(KEY) || "null"), emptyState());
    } catch {
      this.state = emptyState();
    }
    this._timer = null;
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  _changed(kind) {
    this.save();
    for (const fn of this.listeners) fn(kind);
  }

  save() { this.storage.setItem(KEY, JSON.stringify(this.state)); }

  replace(state) {
    this.state = state;
    this.save();
    for (const fn of this.listeners) fn("replace");
  }

  get prefs() { return this.state.prefs; }

  setPref(k, v) {
    this.state.prefs = { ...this.state.prefs, [k]: v, u: Date.now() };
    this._changed("prefs");
  }

  // —— 卡片（词本）——
  cards() { return Object.values(this.state.cards).filter((c) => !c.del); }
  card(w) { const c = this.state.cards[w]; return c && !c.del ? c : null; }
  putCard(c) { this.state.cards[c.w] = { ...c, u: Date.now() }; this._changed("cards"); }
  putCards(list) {
    const now = Date.now();
    for (const c of list) this.state.cards[c.w] = { ...c, u: now };
    if (list.length) this._changed("cards");
  }
  deleteCard(w) {
    if (!this.state.cards[w]) return;
    this.state.cards[w] = { w, del: 1, u: Date.now() };
    this._changed("cards");
  }

  // —— 写过的句子 ——
  addNote(zh, en) {
    const id = "n" + randomId();
    const now = Date.now();
    this.state.notes[id] = { zh, en, t: now, u: now };
    this.state.notes = pruneNotes(this.state.notes);
    this._changed("notes");
    return id;
  }
  notes() {
    return Object.entries(this.state.notes)
      .filter(([, n]) => !n.del)
      .map(([id, n]) => ({ id, ...n }))
      .sort((a, b) => b.t - a.t);
  }
  deleteNote(id) {
    this.state.notes[id] = { del: 1, u: Date.now() };
    this._changed("notes");
  }

  // —— 入门课完成情况 ——
  lessonDone(id) { const l = this.state.lessons[id]; return !!(l && l.done); }
  markLesson(id) {
    this.state.lessons[id] = { done: Date.now(), u: Date.now() };
    this._changed("lessons");
  }

  // —— 每日统计（只记本设备）——
  bump(field, n = 1) {
    if (!n) return;
    const day = dayKey();
    const mine = (this.state.stats[this.device] = this.state.stats[this.device] || {});
    const rec = (mine[day] = mine[day] || {});
    rec[field] = (rec[field] || 0) + n;
    this._changed("stats");
  }
  today() { return sumDay(this.state.stats, dayKey()); }
}
