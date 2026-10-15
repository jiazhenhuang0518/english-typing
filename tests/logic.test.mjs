import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { newCard, grade, status, buildQueue, DAY, G_AGAIN, G_HARD, G_GOOD, G_EASY } from "../app/js/srs.js";
import { Store, mergeState, emptyState, streak, dayKey, sameState } from "../app/js/store.js";
import { Dict, normalizeEn, splitContraction } from "../app/js/dict.js";
import { compare, typedNorm } from "../app/js/typer.js";
import { Sync, encodePair, decodePair, FILE } from "../app/js/sync.js";
import { splitForTranslate } from "../app/js/translate.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

class Mem {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

test("SRS: 新词→记得→间隔逐步拉长；忘了→10 分钟后", () => {
  const t0 = 1_000_000_000_000;
  let c = newCard("apple", {}, t0);
  assert.equal(status(c), "new");
  c = grade(c, G_GOOD, t0);
  assert.equal(c.ivl, 1);
  assert.equal(status(c), "learning");
  c = grade(c, G_GOOD, t0 + DAY);
  assert.equal(c.ivl, 3);
  c = grade(c, G_GOOD, t0 + 4 * DAY);
  assert.equal(c.ivl, 8); // 3 × 2.5 = 7.5 → 8
  c = grade(c, G_EASY, t0 + 12 * DAY);
  assert.ok(c.ivl >= 21);
  assert.equal(status(c), "master");
  const lapsed = grade(c, G_AGAIN, t0 + 40 * DAY);
  assert.equal(lapsed.ivl, 0);
  assert.equal(lapsed.reps, 0);
  assert.equal(lapsed.lapses, 1);
  assert.equal(lapsed.due, t0 + 40 * DAY + 10 * 60 * 1000);
  assert.ok(lapsed.ease < c.ease);
  const hard = grade(newCard("x", {}, t0), G_HARD, t0);
  assert.equal(hard.ivl, 1);
  assert.ok(hard.ease < 2.5);
});

test("SRS: 今日队列 = 到期的 + 受上限控制的新词", () => {
  const now = Date.now();
  const cards = [
    { ...newCard("a", {}, now - 5000), seen: 1, due: now - 1 },
    { ...newCard("b", {}, now - 4000), seen: 1, due: now + DAY },
    newCard("c", {}, now - 3000),
    newCard("d", {}, now - 2000),
    newCard("e", {}, now - 1000),
    { w: "z", del: 1, u: now },
  ];
  const q = buildQueue(cards, { now, newLimit: 2, newDoneToday: 1 });
  assert.deepEqual(q.due.map((c) => c.w), ["a"]);
  assert.deepEqual(q.fresh.map((c) => c.w), ["c"]);
});

test("合并：每条记录取较新的；删除也能同步；统计按设备取最大值", () => {
  const a = emptyState();
  const b = emptyState();
  a.cards.go = { w: "go", ivl: 3, u: 100 };
  b.cards.go = { w: "go", ivl: 8, u: 200 };
  a.cards.eat = { w: "eat", u: 300, del: 1 };
  b.cards.eat = { w: "eat", ivl: 1, u: 250 };
  b.cards.run = { w: "run", u: 50 };
  a.stats = { d1: { "2026-10-16": { rev: 5 } } };
  b.stats = { d1: { "2026-10-16": { rev: 3, zh: 9 } }, d2: { "2026-10-16": { rev: 4 } } };
  a.prefs = { newPerDay: 10, u: 10 };
  b.prefs = { newPerDay: 20, u: 20 };
  const m = mergeState(a, b);
  assert.equal(m.cards.go.ivl, 8);
  assert.equal(m.cards.eat.del, 1);
  assert.ok(m.cards.run);
  assert.equal(m.stats.d1["2026-10-16"].rev, 5);
  assert.equal(m.stats.d1["2026-10-16"].zh, 9);
  assert.equal(m.stats.d2["2026-10-16"].rev, 4);
  assert.equal(m.prefs.newPerDay, 20);
  // 合并满足交换律（结果内容一致）和幂等
  assert.ok(sameState(mergeState(m, m), m));
  assert.deepEqual(mergeState(b, a).cards, m.cards);
});

test("Store：存取、打卡天数", () => {
  const mem = new Mem();
  const s = new Store(mem);
  s.putCard(newCard("apple"));
  s.bump("rev", 2);
  s.addNote("你好", "Hello");
  const s2 = new Store(mem);
  assert.equal(s2.device, s.device);
  assert.equal(s2.cards().length, 1);
  assert.equal(s2.today().rev, 2);
  assert.equal(s2.notes()[0].en, "Hello");
  s2.deleteCard("apple");
  assert.equal(s2.cards().length, 0);
  const now = Date.now();
  const stats = { x: { [dayKey(now - 86400000)]: { rev: 1 }, [dayKey(now - 2 * 86400000)]: { zh: 3 } } };
  assert.equal(streak(stats, now), 2);
  stats.x[dayKey(now)] = { newc: 1 };
  assert.equal(streak(stats, now), 3);
});

test("词典：真实数据分词 + 英文句子收词", () => {
  const d = new Dict();
  d.loadWords(JSON.parse(readFileSync(join(ROOT, "app/data/words.json"), "utf8")));
  d.loadZh(JSON.parse(readFileSync(join(ROOT, "app/data/zh2en.json"), "utf8")));
  const toks = d.segment("我今天去健身房训练了一个小时！");
  const han = toks.filter((t) => t.han).map((t) => t.t);
  assert.ok(han.includes("今天"), han.join("/"));
  assert.ok(han.includes("健身房"), han.join("/"));
  const gym = toks.find((t) => t.t === "健身房");
  assert.equal(gym.hw, "gym");
  assert.equal(toks.find((t) => t.t === "今天").entry.w, "today");
  assert.ok(toks.some((t) => !t.han && t.t.includes("！")));
  const ws = d.englishWords("I went to the gym for an hour today, didn't I? I'm happy.").map((e) => e.w);
  for (const w of ["I", "go", "gym", "hour", "today", "do", "not", "be", "happy"]) assert.ok(ws.includes(w), w + " in " + ws);
  for (const w of ["the", "to", "an"]) assert.ok(!ws.includes(w), w);
  assert.equal(d.word("Apples").w, "apple");
  assert.equal(d.word("went").w, "go");
  assert.ok(d.level(1).length > 1500);
  // 没有 Intl.Segmenter 时，退回最大正向匹配
  d.segmenter = null;
  const t2 = d.segment("我想学习英语").filter((t) => t.han).map((t) => t.t);
  assert.deepEqual(t2, ["我", "想", "学习", "英语"]);
});

test("缩写拆分", () => {
  assert.deepEqual(splitContraction("don't"), ["do", ["not"]]);
  assert.deepEqual(splitContraction("can't"), ["can", ["not"]]);
  assert.deepEqual(splitContraction("won't"), ["will", ["not"]]);
  assert.deepEqual(splitContraction("I'm"), ["I", ["be"]]);
  assert.deepEqual(splitContraction("John's"), ["John", []]);
  assert.deepEqual(splitContraction("hello"), ["hello", []]);
});

test("跟打比对：忽略大小写和标点，逐字母判断", () => {
  const target = normalizeEn("I'm fine, thank you.");
  assert.equal(target, "i'm fine thank you");
  assert.deepEqual(compare(target, typedNorm("I'm fi")), { ok: 6, wrong: false, done: false });
  assert.deepEqual(compare(target, typedNorm("I'm fx")), { ok: 5, wrong: true, done: false });
  assert.equal(compare(target, typedNorm("I’M FINE, THANK YOU")).done, true);
  assert.equal(compare(target, typedNorm("i'm fine thank youu")).done, false);
});

test("翻译分段：长文按句切，单段不超过上限", () => {
  const parts = splitForTranslate("今天很好。".repeat(40), 50);
  assert.ok(parts.length > 1);
  assert.ok(parts.every((p) => p.length <= 50));
  assert.deepEqual(splitForTranslate("你好\n再见"), ["你好", "再见"]);
});

test("配对码往返", () => {
  const code = encodePair({ token: "ghp_abc123", gistId: "deadbeef" });
  assert.match(code, /^[\w-]+$/);
  assert.deepEqual(decodePair(code), { token: "ghp_abc123", gistId: "deadbeef" });
});

function fakeGitHub() {
  const gists = new Map();
  let n = 0;
  const calls = [];
  const res = (status, body) => ({ status, ok: status < 300, json: async () => body, text: async () => JSON.stringify(body) });
  const fetchImpl = async (url, opts = {}) => {
    const path = url.replace("https://api.github.com", "");
    const method = opts.method || "GET";
    calls.push(method + " " + path);
    if (!/Bearer ghp_good/.test(opts.headers.Authorization)) return res(401, {});
    if (path === "/user") return res(200, { login: "tester" });
    if (path.startsWith("/gists?")) return res(200, [...gists.values()]);
    if (path === "/gists" && method === "POST") {
      const id = "g" + ++n;
      const body = JSON.parse(opts.body);
      gists.set(id, { id, owner: { login: "tester" }, files: { [FILE]: { content: body.files[FILE].content } } });
      return res(201, gists.get(id));
    }
    const m = path.match(/^\/gists\/(\w+)$/);
    if (m) {
      const g = gists.get(m[1]);
      if (!g) return res(404, {});
      if (method === "PATCH") g.files[FILE].content = JSON.parse(opts.body).files[FILE].content;
      return res(200, g);
    }
    return res(404, {});
  };
  return { fetchImpl, gists, calls };
}

test("同步：电脑连接→手机配对→两边进度合并", async () => {
  const gh = fakeGitHub();
  const pcMem = new Mem();
  const pc = new Store(pcMem);
  pc.putCard(newCard("apple"));
  const pcSync = new Sync(pc, { storage: pcMem, fetchImpl: gh.fetchImpl });
  await assert.rejects(pcSync.connect("ghp_bad"), /令牌无效/);
  assert.equal(pcSync.enabled, false);
  await pcSync.connect("ghp_good");
  assert.equal(pcSync.cfg.login, "tester");
  assert.equal(gh.gists.size, 1);

  const phoneMem = new Mem();
  const phone = new Store(phoneMem);
  phone.putCard(newCard("banana"));
  phone.bump("rev", 3);
  const phoneSync = new Sync(phone, { storage: phoneMem, fetchImpl: gh.fetchImpl });
  phoneSync.usePair(encodePair(pcSync.cfg));
  assert.equal(await phoneSync.syncNow(), true, phoneSync.lastError);
  assert.deepEqual(phone.cards().map((c) => c.w).sort(), ["apple", "banana"]);

  assert.equal(await pcSync.syncNow(), true);
  assert.deepEqual(pc.cards().map((c) => c.w).sort(), ["apple", "banana"]);
  assert.equal(pc.today().rev, 3);

  // 第二台电脑再连同一个令牌：找到已有的 Gist，不会新建
  const pc2Mem = new Mem();
  const pc2 = new Store(pc2Mem);
  const s2 = new Sync(pc2, { storage: pc2Mem, fetchImpl: gh.fetchImpl });
  await s2.connect("ghp_good");
  assert.equal(gh.gists.size, 1);
  assert.equal(pc2.cards().length, 2);

  // 没变化时不重复写
  const before = gh.calls.filter((c) => c.startsWith("PATCH")).length;
  await s2.syncNow();
  assert.equal(gh.calls.filter((c) => c.startsWith("PATCH")).length, before);
});
