// 「入门」页：字母和发音 / 分级核心词 / 生活常用句

import { esc, term, sayBtn, intro, honest, $, toast } from "../ui.js";
import { mountTyper } from "../typer.js";
import { LETTERS, SCENES, GROUP_SIZE } from "../lessons.js";
import { canListen } from "../speech.js";
import { shortCn } from "./write.js";

const LV_NAME = { 1: "第 1 级 · 初中词", 2: "第 2 级 · 高中词", 3: "第 3 级 · 四级词" };

export function renderLearn(app, root) {
  const s = (app.session.learn = app.session.learn || { tab: "letters", lv: 1, group: null, scene: null });
  const tabs = [
    ["letters", "🔤 字母和发音"],
    ["words", "📚 核心词"],
    ["scenes", "💬 常用句"],
  ];
  root.innerHTML = `
    <h1>零基础入门</h1>
    ${intro("从 26 个字母开始，再按难度学最常用的单词和生活里马上能用的句子。每一步都能听、能跟打。")}
    <div class="seg">${tabs.map(([k, l]) => `<button type="button" class="${s.tab === k ? "on" : ""}" data-ltab="${k}">${l}</button>`).join("")}</div>
    <div id="lbody"></div>`;
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-ltab]");
    if (t) {
      s.tab = t.dataset.ltab;
      s.group = null;
      s.scene = null;
      app.render();
    }
  });
  const body = $("#lbody", root);
  if (s.tab === "letters") letters(app, body);
  else if (s.tab === "words") (s.group == null ? groups(app, body, s) : group(app, body, s));
  else (s.scene == null ? scenes(app, body, s) : scene(app, body, s));
}

function rerender(app) { app.render(); }

function letters(app, body) {
  body.innerHTML = `
    <p class="muted">点一下字母听读音。每张卡上两个${term("音标")}：左边是字母自己的名字怎么读，右边是它在单词里常发的音（${term("自然拼读")}）。</p>
    <div class="letters">${LETTERS.map(([L, name, sound, w, cn, ic]) => `
      <button type="button" class="letter" data-say="${esc(L + ". " + w)}">
        <span class="lbig">${L}${L.toLowerCase()}</span>
        <span class="lph">${esc(name)} · ${esc(sound)}</span>
        <span class="lw">${ic} ${esc(w)} <span class="muted">${esc(cn)}</span></span>
      </button>`).join("")}</div>
    <div class="card">
      <h3>练打 26 个字母</h3>
      <p class="muted small">先熟悉键盘上字母的位置。手机上记得切到英文键盘。</p>
      <div id="abcTyper"></div>
    </div>
    <div class="card">
      <h3>练打例词</h3>
      <div id="wordTyper"></div>
    </div>`;
  mountTyper($("#abcTyper", body), {
    target: "abcdefghijklmnopqrstuvwxyz",
    autofocus: false,
    onDone: (st) => {
      app.store.bump("en", st.chars);
      toast(`打完 26 个字母！用时 ${Math.round(st.ms / 1000)} 秒`);
    },
  });
  const words = LETTERS.map((x) => x[3]).join(" ");
  mountTyper($("#wordTyper", body), {
    target: words,
    autofocus: false,
    speakText: words,
    onSpeak: () => app.speak(words),
    onDone: (st) => {
      app.store.bump("en", st.chars);
      toast("例词打完了！");
    },
  });
}

function groupsOf(app, lv) {
  const list = app.dict.level(lv);
  const out = [];
  for (let i = 0; i < list.length; i += GROUP_SIZE) out.push(list.slice(i, i + GROUP_SIZE));
  return out;
}

function groups(app, body, s) {
  const gs = groupsOf(app, s.lv);
  const doneCount = gs.filter((_, i) => app.store.lessonDone(`w${s.lv}-${i}`)).length;
  const firstTodo = gs.findIndex((_, i) => !app.store.lessonDone(`w${s.lv}-${i}`));
  body.innerHTML = `
    <p class="muted">单词按${term("分级")}排好，每级里最常用的排最前面。每组 10 个，学完自动进${term("词本")}，之后按${term("间隔重复")}复习。</p>
    <div class="seg small">${[1, 2, 3].map((lv) => `<button type="button" class="${s.lv === lv ? "on" : ""}" data-lv="${lv}">${LV_NAME[lv]}</button>`).join("")}</div>
    <div class="row gap"><span>已学 <b>${doneCount}</b> / ${gs.length} 组</span>
      ${firstTodo >= 0 ? `<button type="button" class="primary" data-group="${firstTodo}">继续：第 ${firstTodo + 1} 组 →</button>` : `<span class="okc">这一级全部学完 🎉</span>`}</div>
    <div class="groups">${gs.map((g, i) => `
      <button type="button" class="grp ${app.store.lessonDone(`w${s.lv}-${i}`) ? "done" : ""}" data-group="${i}">
        <b>第 ${i + 1} 组</b><span>${esc(g.slice(0, 4).map((e) => e.w).join(" · "))}…</span>
      </button>`).join("")}</div>`;
  body.addEventListener("click", (e) => {
    const lv = e.target.closest("[data-lv]");
    if (lv) { s.lv = +lv.dataset.lv; rerender(app); return; }
    const g = e.target.closest("[data-group]");
    if (g) { s.group = +g.dataset.group; s.step = -1; rerender(app); window.scrollTo(0, 0); }
  });
}

function group(app, body, s) {
  const gs = groupsOf(app, s.lv);
  const g = gs[s.group] || [];
  const id = `w${s.lv}-${s.group}`;
  if (s.step == null || s.step < 0) {
    body.innerHTML = `
      <button type="button" class="ghost" data-back>← 返回</button>
      <h2>${LV_NAME[s.lv]} · 第 ${s.group + 1} 组 ${app.store.lessonDone(id) ? '<span class="okc">✓ 已学</span>' : ""}</h2>
      <p class="muted">先把 10 个词都听一遍，再点「开始学」：每个词看一眼、听一遍、打一遍。</p>
      <div class="wlist">${g.map((e) => wordRow(e)).join("")}</div>
      <div class="row gap"><button type="button" class="primary" data-start>开始学这组（约 3 分钟）</button>
      ${s.group + 1 < gs.length ? `<button type="button" class="ghost" data-next>下一组 →</button>` : ""}</div>`;
  } else {
    const e = g[s.step];
    body.innerHTML = `
      <button type="button" class="ghost" data-back>← 返回这组</button>
      <div class="progress"><div style="width:${(s.step / g.length) * 100}%"></div></div>
      <div class="card center">
        <div class="muted small">${s.step + 1} / ${g.length}</div>
        <div class="wbig">${esc(e.w)}</div>
        <div class="ph">${esc(e.ph)} ${sayBtn(e.w)} ${sayBtn(e.w, { slow: true })}</div>
        <div class="cn">${esc(e.cn)}</div>
        <div id="wt"></div>
      </div>`;
    app.speak(e.w);
    mountTyper($("#wt", body), {
      target: e.w,
      placeholder: "照着打一遍",
      onDone: (st) => {
        app.store.bump("en", st.chars);
        setTimeout(() => {
          s.step++;
          if (s.step >= g.length) {
            const n = app.learnWords(g, "lesson");
            app.store.markLesson(id);
            s.step = -1;
            toast(`这组学完了！${n} 个新词进了词本，明天会提醒你复习。`);
          }
          rerender(app);
        }, 450);
      },
    });
  }
  body.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-back]")) {
      if (s.step >= 0) s.step = -1;
      else s.group = null;
      rerender(app);
    }
    if (ev.target.closest("[data-start]")) { s.step = 0; rerender(app); }
    if (ev.target.closest("[data-next]")) { s.group++; s.step = -1; rerender(app); window.scrollTo(0, 0); }
  });
}

export function wordRow(e) {
  return `<div class="wrow">
    <button type="button" class="wmain" data-word="${esc(e.w)}"><b>${esc(e.w)}</b> <span class="ph">${esc(e.ph)}</span>
    <span class="cn">${esc(shortCn(e.cn))}</span></button>${sayBtn(e.w)}</div>`;
}

function scenes(app, body, s) {
  body.innerHTML = `
    <p class="muted">人工写好的地道说法，生活里马上能用。点句子旁边的「跟打」练一遍，句子里的单词会自动进${term("词本")}。</p>
    <div class="groups">${SCENES.map((sc) => {
      const done = sc.lines.filter((_, i) => app.store.lessonDone(`s-${sc.id}-${i}`)).length;
      return `<button type="button" class="grp ${done === sc.lines.length ? "done" : ""}" data-scene="${sc.id}">
        <b>${sc.icon} ${esc(sc.title)}</b><span>${done} / ${sc.lines.length} 句</span></button>`;
    }).join("")}</div>`;
  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-scene]");
    if (b) { s.scene = b.dataset.scene; rerender(app); window.scrollTo(0, 0); }
  });
}

function scene(app, body, s) {
  const sc = SCENES.find((x) => x.id === s.scene);
  body.innerHTML = `
    <button type="button" class="ghost" data-back>← 返回</button>
    <h2>${sc.icon} ${esc(sc.title)}</h2>
    ${sc.lines.map(([zh, en], i) => `
      <div class="note ${app.store.lessonDone(`s-${sc.id}-${i}`) ? "done" : ""}">
        <div class="nz">${esc(zh)}</div>
        <div class="ne">${esc(en)}</div>
        <div class="row gap">${sayBtn(en)} ${sayBtn(en, { slow: true })}
          ${canListen() ? `<button type="button" class="ghost sm" data-listen="${esc(en)}">🎤 跟读</button>` : ""}
          <button type="button" class="ghost sm" data-type="${i}">⌨️ 跟打</button>
          ${app.store.lessonDone(`s-${sc.id}-${i}`) ? '<span class="okc">✓</span>' : ""}</div>
        <div class="tbox" id="tb${i}"></div>
      </div>`).join("")}
    ${honest(["这些句子是常见的口语说法，同一个意思英语里往往有好几种说法，这里选的是最简单、最常用的。"])}`;
  body.addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) { s.scene = null; rerender(app); return; }
    const t = e.target.closest("[data-type]");
    if (!t) return;
    const i = +t.dataset.type;
    const [zh, en] = sc.lines[i];
    mountTyper($(`#tb${i}`, body), {
      target: en,
      speakText: en,
      onSpeak: () => app.speak(en),
      onDone: (st) => {
        app.store.bump("en", st.chars);
        app.store.markLesson(`s-${sc.id}-${i}`);
        const added = app.addWords(app.dict.englishWords(en), { src: "scene", ctx: zh, ctxEn: en });
        toast(added.length ? `打对了！${added.length} 个新词进了词本` : "打对了！");
        t.closest(".note").classList.add("done");
      },
    });
  });
}
