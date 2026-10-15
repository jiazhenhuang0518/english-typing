// 入口：装配各模块、底部导航、全局点击（术语/发音/单词详情/跟读）

import { Dict, normalizeEn } from "./dict.js";
import { Store } from "./store.js";
import { Translator } from "./translate.js";
import { Sync } from "./sync.js";
import { speak, listen, scoreSpeech } from "./speech.js";
import { newCard, grade, status, G_GOOD } from "./srs.js";
import { esc, $, $$, sheet, showTerm, toast, sayBtn, lvBadge, fmtDue, term } from "./ui.js";
import { renderWrite } from "./pages/write.js";
import { renderLearn } from "./pages/learn.js";
import { renderReview, todayQueue } from "./pages/review.js";
import { renderBook } from "./pages/book.js";
import { renderMe } from "./pages/me.js";

const VERSION = "1.0.0";
const PAGES = {
  write: ["✍️", "打字", renderWrite],
  learn: ["🔤", "入门", renderLearn],
  review: ["🔁", "复习", renderReview],
  book: ["📒", "词本", renderBook],
  me: ["👤", "我的", renderMe],
};

const store = new Store();
const dict = new Dict();
const dictWaiters = [];

const app = {
  version: VERSION,
  store,
  dict,
  tr: new Translator(),
  sync: null,
  session: {},
  tab: sessionStorage.getItem("et.tab") || "write",

  speak(text, slow = false) {
    speak(text, slow ? 0.6 : store.prefs.rate);
  },

  onDictReady(fn) {
    if (dict.zhReady) return;
    dictWaiters.length = 0; // 只保留当前页面的回调
    dictWaiters.push(fn);
  },

  go(tab) {
    app.tab = PAGES[tab] ? tab : "write";
    sessionStorage.setItem("et.tab", app.tab);
    app.render();
    window.scrollTo(0, 0);
  },

  render() {
    const main = $("#main");
    const sec = document.createElement("section");
    sec.className = "page";
    main.replaceChildren(sec);
    PAGES[app.tab][2](app, sec);
    renderNav();
  },

  // 把词放进词本（已经有的跳过）；返回新加的
  addWords(entries, { src, ctx = "", ctxEn = "" } = {}) {
    const fresh = [];
    for (const e of entries) {
      if (!e || store.card(e.w)) continue;
      fresh.push(newCard(e.w, { ph: e.ph || "", cn: e.cn || "", lv: e.lv || 0, src, ctx, ctxEn }));
    }
    store.putCards(fresh);
    return fresh;
  },

  // 入门课学完一组：看过+打过一遍，算第一次“记得”，明天复习
  learnWords(entries, src) {
    const list = [];
    for (const e of entries) {
      const old = store.card(e.w);
      if (old && old.seen) continue;
      const base = old || newCard(e.w, { ph: e.ph, cn: e.cn, lv: e.lv, src });
      list.push(grade(base, G_GOOD));
    }
    store.putCards(list);
    store.bump("newc", list.length);
    return list.length;
  },

  wordSheet(w, extra = {}) {
    const e = dict.word(w);
    const c = store.card(e ? e.w : w);
    const word = e ? e.w : w;
    const ph = (e && e.ph) || (c && c.ph) || "";
    const cn = (e && e.cn) || (c && c.cn) || "";
    const st = c ? { new: "新词", learning: "学习中", master: "已掌握" }[status(c)] : "";
    const sh = sheet(`
      ${extra.zh ? `<div class="muted">「${esc(extra.zh)}」的英文</div>` : ""}
      <div class="wbig">${esc(word)} ${lvBadge(e && e.lv)}</div>
      <div class="ph">${esc(ph)} ${sayBtn(word)} ${sayBtn(word, { slow: true })}</div>
      <div class="cn">${esc(cn)}</div>
      ${extra.gloss ? `<div class="muted small">词典：${esc(extra.gloss)}</div>` : ""}
      ${c && c.ctx ? `<div class="ctx">在这句里遇到：${esc(c.ctx)}${c.ctxEn ? `<br><span class="muted">${esc(c.ctxEn)}</span>` : ""}</div>` : ""}
      <div class="row gap">
        ${c ? `<span class="muted small">${term("词本")}里 · ${st}${c.seen ? " · 下次复习 " + fmtDue(c.due) : ""}</span>
               <button type="button" class="ghost sm" id="rm">移出词本</button>`
            : `<button type="button" class="primary" id="add">加入词本</button>`}
      </div>`);
    app.speak(word);
    const add = sh.el.querySelector("#add");
    if (add) add.addEventListener("click", () => {
      app.addWords([e || { w: word, ph, cn }], { src: "manual", ctx: extra.ctx || "" });
      toast("已加入词本：" + word);
      sh.close();
      if (app.tab === "book") app.render();
    });
    const rm = sh.el.querySelector("#rm");
    if (rm) rm.addEventListener("click", () => {
      store.deleteCard(word);
      toast("已移出：" + word);
      sh.close();
      if (app.tab === "book") app.render();
    });
  },

  zhSheet(tok) {
    if (tok.entry) return app.wordSheet(tok.entry.w, { zh: tok.t, gloss: tok.gloss, ctx: $("#zh") ? $("#zh").value : "" });
    sheet(`<div class="muted">「${esc(tok.t)}」</div>
      <div class="cn big">${tok.gloss ? esc(tok.gloss) : "词典里没有这个词"}</div>
      ${tok.gloss ? sayBtn(tok.gloss.split(";")[0]) : ""}
      <p class="muted small">这个意思不在分级单词表里（多是短语或专有名词），所以不会自动收进词本。看整句翻译就好。</p>`);
  },
};

function renderNav() {
  const q = todayQueue(app);
  const due = q.due.length + q.fresh.length;
  const html = Object.entries(PAGES)
    .map(([k, [ic, label]]) => `<button type="button" class="${app.tab === k ? "on" : ""}" data-tab="${k}">
      <span class="ni">${ic}</span><span class="nl">${label}</span>${k === "review" && due ? `<span class="badge">${due}</span>` : ""}</button>`)
    .join("");
  $("#nav").innerHTML = html;
  const dot = $("#syncDot");
  if (dot) {
    const s = app.sync;
    dot.className = !s.enabled ? "off" : s.busy ? "busy" : s.lastError ? "err" : "ok";
    dot.title = !s.enabled ? "未开同步" : s.busy ? "同步中" : s.lastError ? "同步出错：" + s.lastError : "已同步 " + new Date(s.cfg.last || 0).toLocaleTimeString();
  }
}

async function doListen(btn) {
  const target = btn.dataset.listen;
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = "🎤 请说…";
  try {
    const heard = await listen();
    const { score, heard: h } = scoreSpeech(target, heard, normalizeEn);
    sheet(`<h3>跟读得分：${score} 分</h3>
      <p>你说的：<b>${esc(h)}</b></p><p class="muted">标准：${esc(target)}</p>
      <p>${score >= 90 ? "非常好！" : score >= 60 ? "不错，再听一遍原声，注意没对上的词。" : "多听几遍慢速，再试试。"}</p>
      <div class="row gap">${sayBtn(target)} ${sayBtn(target, { slow: true })}</div>`);
  } catch (e) {
    toast(e.message === "not-allowed" ? "需要允许使用麦克风" : e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-term]");
  if (t) { e.preventDefault(); e.stopPropagation(); return showTerm(t.dataset.term); }
  const s = e.target.closest("[data-say]");
  if (s) return app.speak(s.dataset.say, !!s.dataset.slow);
  const w = e.target.closest("[data-word]");
  if (w) return app.wordSheet(w.dataset.word);
  const l = e.target.closest("[data-listen]");
  if (l) return doListen(l);
  const tab = e.target.closest("[data-tab]");
  if (tab) return app.go(tab.dataset.tab);
  const go = e.target.closest("[data-go]");
  if (go) return app.go(go.dataset.go);
}, true);

async function loadDict() {
  try {
    const words = await (await fetch("data/words.json")).json();
    dict.loadWords(words);
  } catch {
    toast("单词表加载失败，请检查网络后刷新");
  }
  app.render();
  try {
    const zh = await (await fetch("data/zh2en.json")).json();
    dict.loadZh(zh);
    for (const fn of dictWaiters.splice(0)) fn();
  } catch {
    toast("中文词典加载失败，逐词对照暂时用不了");
  }
}

async function boot() {
  app.sync = new Sync(store);
  app.sync.onStatus(() => renderNav());
  store.onChange((kind) => {
    renderNav();
    if (kind !== "replace") app.sync.schedule();
  });
  store.onChange((kind) => {
    // 别的设备同步过来的新进度：不在打字/复习时才刷新页面
    if (kind !== "replace") return;
    const typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if (!typing && !app.session.review) app.render();
  });

  const m = location.hash.match(/#pair=([\w-]+)/);
  if (m) {
    history.replaceState(null, "", location.pathname + location.search);
    try {
      app.sync.usePair(m[1]);
      app.tab = "me";
      toast("配对成功，正在同步…");
    } catch (err) {
      toast("配对链接不对：" + err.message);
    }
  }

  await loadDict();
  if (app.sync.enabled) {
    await app.sync.syncNow();
    if (m) toast(app.sync.lastError ? "同步出错：" + app.sync.lastError : "同步好了！");
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") app.sync.syncNow();
    else if (Date.now() - ((app.sync.cfg && app.sync.cfg.last) || 0) > 60000) app.sync.syncNow();
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

boot();
