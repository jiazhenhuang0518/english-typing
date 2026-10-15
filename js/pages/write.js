// 「打字」页：打中文 → 逐词英文 + 整句英文 → 跟打 → 自动收词

import { esc, term, sayBtn, intro, honest, lvBadge, $, toast } from "../ui.js";
import { mountTyper } from "../typer.js";
import { canListen } from "../speech.js";
import { STOP } from "../dict.js";

const HAN_ALL = /[\u3400-\u9fff]/g;

export function renderWrite(app, root) {
  const draft = app.session.draft || { zh: "", en: "", provider: "" };
  app.session.draft = draft;
  root.innerHTML = `
    <h1>打中文，学英文</h1>
    ${intro(`用你平时的中文输入法，写一句今天想说的话。下面马上出现每个词的英文（${term("逐词对照")}）和整句英文（${term("整句翻译")}）；再${term("跟打")}一遍，里面的单词就自动进了${term("词本")}。`)}
    <textarea id="zh" rows="3" placeholder="比如：我今天去健身房训练了一个小时">${esc(draft.zh)}</textarea>
    <div class="row gap">
      <button type="button" class="ghost" id="clear">清空</button>
      <button type="button" class="ghost" id="example">换个例句</button>
      <span class="muted small" id="zhCount"></span>
    </div>
    <div id="chips" class="chips"></div>
    <div id="sent" class="card sent hidden"></div>
    <div id="practice"></div>
    <h2>最近写过的</h2>
    <div id="notes"></div>
    ${honest([
      "整句翻译要联网，会把你打的这句话发给 Google 翻译或 MyMemory（免费服务）。不想发出去，可以在「我的」里关掉，只用离线逐词对照。",
      "机器翻译大多数时候够用，偶尔不地道。拿不准的句子，可以对照「入门→常用句」里人工写好的说法。",
      "逐词对照显示的是词典里最常见的意思，不一定是这句话里的意思。比如「打」可能是打字，也可能是打球。",
    ])}`;

  const ta = $("#zh", root);
  let composing = false;
  let chipTimer = null;
  let trTimer = null;
  let trSeq = 0;

  const EXAMPLES = [
    "我今天去健身房训练了一个小时",
    "明天早上我想喝一杯咖啡",
    "我的客户膝盖有点疼",
    "周末我和朋友去公园跑步",
    "我想快速掌握英语",
    "今天天气很好，我很开心",
  ];

  function renderChips() {
    const box = $("#chips", root);
    const text = ta.value;
    $("#zhCount", root).textContent = text ? `${(text.match(HAN_ALL) || []).length} 个汉字` : "";
    if (!text.trim()) {
      box.innerHTML = "";
      return;
    }
    if (!app.dict.zhReady) {
      box.innerHTML = `<span class="muted small">离线词典加载中…（第一次打开要下载约 2MB，之后不用）</span>`;
      return;
    }
    const toks = app.dict.segment(text);
    app.session.toks = toks;
    box.innerHTML = toks
      .map((t, i) => {
        if (!t.han) return /\S/.test(t.t) ? `<span class="chip punct">${esc(t.t)}</span>` : "";
        const en = t.hw || t.gloss.split(";")[0] || "?";
        const cls = t.entry ? "chip key" : t.gloss ? "chip" : "chip none";
        return `<button type="button" class="${cls}" data-chip="${i}"><span class="cz">${esc(t.t)}</span><span class="ce">${esc(en)}</span>${t.entry ? lvBadge(t.entry.lv) : ""}</button>`;
      })
      .join("");
  }

  function renderSentence(state) {
    const box = $("#sent", root);
    if (!ta.value.trim()) {
      box.classList.add("hidden");
      $("#practice", root).innerHTML = "";
      return;
    }
    box.classList.remove("hidden");
    if (state === "loading") {
      box.innerHTML = `<div class="muted">整句翻译中…</div>`;
      return;
    }
    if (state === "offline") {
      box.innerHTML = `<div class="muted">联网整句翻译已关闭（在「我的」里打开）。上面的逐词英文照样能用。</div>
        <div class="row gap"><button type="button" class="primary" id="saveWords">把上面的词收进词本</button></div>`;
      return;
    }
    if (state && state.error) {
      box.innerHTML = `<div class="warn">整句翻译暂时连不上（${esc(state.error)}）。上面的逐词英文不受影响，可以先收词。</div>
        <div class="row gap"><button type="button" class="ghost" id="retry">重试</button><button type="button" class="primary" id="saveWords">把上面的词收进词本</button></div>`;
      return;
    }
    if (!draft.en) {
      box.classList.add("hidden");
      return;
    }
    box.innerHTML = `
      <div class="en big">${linkWords(app, draft.en)}</div>
      <div class="row gap">
        ${sayBtn(draft.en, { label: "🔊 听" })}
        ${sayBtn(draft.en, { slow: true, label: "🐢 慢速" })}
        ${canListen() ? `<button type="button" class="ghost" data-listen="${esc(draft.en)}">🎤 跟读</button>${term("跟读", "?")}` : ""}
        <span class="muted small">来自 ${esc(draft.provider || "")}</span>
      </div>
      <div class="row gap"><button type="button" class="primary" id="startType">⌨️ 跟打一遍</button>
      <button type="button" class="ghost" id="saveWords">只收词，不跟打</button></div>`;
  }

  async function doTranslate() {
    const text = ta.value.trim();
    if (!/[\u3400-\u9fff]/.test(text)) {
      draft.en = "";
      renderSentence();
      return;
    }
    if (!app.store.prefs.online) {
      renderSentence("offline");
      return;
    }
    const seq = ++trSeq;
    renderSentence("loading");
    try {
      const r = await app.tr.translate(text);
      if (seq !== trSeq) return;
      draft.en = r.text;
      draft.provider = r.provider;
      renderSentence();
    } catch (e) {
      if (seq !== trSeq) return;
      draft.en = "";
      const why = e.name === "AbortError" ? "超时" : e instanceof TypeError ? "没联网或翻译服务连不上" : e.message;
      renderSentence({ error: why });
    }
  }

  function onText() {
    draft.zh = ta.value;
    draft.en = "";
    $("#practice", root).innerHTML = "";
    clearTimeout(chipTimer);
    clearTimeout(trTimer);
    chipTimer = setTimeout(renderChips, 150);
    trTimer = setTimeout(doTranslate, 900);
  }

  ta.addEventListener("compositionstart", () => (composing = true));
  ta.addEventListener("compositionend", () => {
    composing = false;
    onText();
  });
  ta.addEventListener("input", () => {
    if (!composing) onText();
  });

  $("#clear", root).addEventListener("click", () => {
    ta.value = "";
    onText();
    ta.focus();
  });
  $("#example", root).addEventListener("click", () => {
    const i = (app.session.exampleIdx = ((app.session.exampleIdx ?? -1) + 1) % EXAMPLES.length);
    ta.value = EXAMPLES[i];
    onText();
  });

  function collectWords() {
    const fromEn = draft.en ? app.dict.englishWords(draft.en) : [];
    const fromZh = (app.session.toks || []).filter((t) => t.entry).map((t) => t.entry);
    const seen = new Set();
    return [...fromEn, ...fromZh].filter((e) => !seen.has(e.w) && seen.add(e.w) && !STOP.has(e.w.toLowerCase()));
  }

  function finish(typedStats) {
    const zh = ta.value.trim();
    const words = collectWords();
    const added = app.addWords(words, { src: "write", ctx: zh, ctxEn: draft.en });
    if (zh) {
      app.store.addNote(zh, draft.en || "");
      app.store.bump("zh", (zh.match(HAN_ALL) || []).length);
    }
    if (typedStats) app.store.bump("en", typedStats.chars);
    const p = $("#practice", root);
    const secs = typedStats ? Math.max(1, typedStats.ms / 1000) : 0;
    const wpm = typedStats ? Math.round(typedStats.chars / 5 / (secs / 60)) : 0;
    p.innerHTML = `
      <div class="card good">
        ${typedStats ? `<div><b>打完了！</b> 用时 ${secs.toFixed(0)} 秒 · 速度 ${wpm} 词/分钟 · 打错 ${typedStats.errors} 次${typedStats.usedHint ? " · 用了提示" : ""}</div>` : ""}
        <div>${added.length ? `新收进词本 <b>${added.length}</b> 个词（点一下看详细）：` : "这句里的词都已经在词本里了。"}</div>
        <div class="chips">${added.map((e) => `<button type="button" class="chip key" data-word="${esc(e.w)}"><span class="cz">${esc(e.w)}</span><span class="ce">${esc(shortCn(e.cn))}</span></button>`).join("")}</div>
        <div class="muted small">它们会出现在「复习」里，按${term("间隔重复")}安排。写下一句吧 👇</div>
        <button type="button" class="ghost" id="nextOne">写下一句</button>
      </div>`;
    $("#nextOne", root).addEventListener("click", () => {
      ta.value = "";
      onText();
      ta.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    renderNotes();
  }

  root.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-chip]");
    if (chip) {
      const t = (app.session.toks || [])[+chip.dataset.chip];
      if (t) app.zhSheet(t);
      return;
    }
    if (e.target.closest("#retry")) doTranslate();
    if (e.target.closest("#saveWords")) finish(null);
    if (e.target.closest("#startType")) {
      const p = $("#practice", root);
      p.innerHTML = `<div class="card"><div class="muted small">照着打：${esc(draft.en)}</div><div id="typerBox"></div></div>`;
      mountTyper($("#typerBox", p), {
        target: draft.en,
        speakText: draft.en,
        onSpeak: () => app.speak(draft.en),
        onDone: (s) => finish(s),
      });
      p.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const again = e.target.closest("[data-again]");
    if (again) {
      const n = app.store.notes().find((x) => x.id === again.dataset.again);
      if (n) {
        ta.value = n.zh;
        draft.zh = n.zh;
        draft.en = n.en;
        draft.provider = "之前的翻译";
        renderChips();
        if (n.en) renderSentence();
        else doTranslate();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    const del = e.target.closest("[data-delnote]");
    if (del) {
      app.store.deleteNote(del.dataset.delnote);
      renderNotes();
    }
  });

  function renderNotes() {
    const list = app.store.notes().slice(0, 30);
    $("#notes", root).innerHTML = list.length
      ? list
          .map(
            (n) => `<div class="note">
          <div class="nz">${esc(n.zh)}</div>
          ${n.en ? `<div class="ne">${esc(n.en)}</div>` : ""}
          <div class="row gap">${n.en ? sayBtn(n.en) : ""}
            <button type="button" class="ghost sm" data-again="${n.id}">再练</button>
            <button type="button" class="ghost sm" data-delnote="${n.id}">删除</button></div>
        </div>`,
          )
          .join("")
      : `<p class="muted">还没有。写下第一句吧——什么都行，今天吃了什么、要做什么。</p>`;
  }

  renderChips();
  if (draft.en) renderSentence();
  else if (draft.zh) doTranslate();
  renderNotes();
  app.onDictReady(() => renderChips());
}

export function shortCn(cn) {
  return (cn || "").split("；")[0].replace(/^[a-z]+\.\s*/, "").split("，")[0];
}

// 英文句子里的学习词可以点
export function linkWords(app, en) {
  return en.replace(/[A-Za-z]+(?:['’][A-Za-z]+)?/g, (m) => {
    const e = app.dict.word(m.replace(/['’](s|m|re|ll|ve|d)$/i, ""));
    return e ? `<button type="button" class="wlink" data-word="${esc(e.w)}">${esc(m)}</button>` : esc(m);
  });
}
