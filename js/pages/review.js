// 「复习」页：按间隔重复安排今天该复习的词

import { esc, term, sayBtn, intro, honest, $, fmtDue } from "../ui.js";
import { mountTyper } from "../typer.js";
import { buildQueue, grade, status, G_AGAIN, G_HARD, G_GOOD, G_EASY } from "../srs.js";

const GRADE_TXT = { 0: "忘了", 1: "模糊", 2: "记得", 3: "很熟" };

export function todayQueue(app) {
  const t = app.store.today();
  return buildQueue(app.store.cards(), { newLimit: app.store.prefs.newPerDay, newDoneToday: t.newc || 0 });
}

export function renderReview(app, root) {
  const r = app.session.review;
  if (r && r.idx < r.queue.length) return cardView(app, root, r);
  if (r && r.idx >= r.queue.length && r.queue.length) return summary(app, root, r);
  landing(app, root);
}

function landing(app, root) {
  const q = todayQueue(app);
  const all = app.store.cards();
  const next = all.filter((c) => c.seen).sort((a, b) => a.due - b.due)[0];
  const total = q.due.length + q.fresh.length;
  const waiting = all.filter((c) => !c.seen).length - q.fresh.length;
  const quotaNote = waiting > 0
    ? `<p class="muted small">还有 ${waiting} 个新词排着队：今天的新词额度（${app.store.prefs.newPerDay} 个，入门课学的也算）用完了，明天会接着放出来。想多学可以在「我的」里调高。</p>`
    : "";
  root.innerHTML = `
    <h1>今日复习</h1>
    ${intro(`在你快忘的时候再见一次，记得最牢（${term("间隔重复")}）。每天做完下面这些就行，一般 5～10 分钟。`)}
    <div class="stats3">
      <div class="stat"><b>${q.due.length}</b><span>到期要复习</span></div>
      <div class="stat"><b>${q.fresh.length}</b><span>今天的${term("新词")}</span></div>
      <div class="stat"><b>${all.length}</b><span>${term("词本")}总数</span></div>
    </div>
    ${quotaNote}
    ${total ? `<button type="button" class="primary big" id="go">开始（${total} 个）</button>`
      : `<div class="card center"><div class="wbig">🎉</div><p>今天的复习做完了。</p>
         <p class="muted">${all.length ? `下一批${next ? "在 " + fmtDue(next.due) : "等你加新词"}。` : "词本还是空的。"}想多学：去「打字」写几句，或「入门→核心词」学一组。</p>
         <div class="row gap center"><button type="button" class="ghost" data-go="write">去打字</button><button type="button" class="ghost" data-go="learn">去入门</button></div></div>`}
    <h3>怎么复习</h3>
    <ul class="muted small">
      <li><b>新词</b>：看英文、听发音、照着打一遍。</li>
      <li><b>学过的词</b>：只给中文和发音，你凭记忆打出英文（听写）。打不出来点「提示一个字母」或「不会」。</li>
      <li><b>比较熟的词</b>：看英文想中文，自己判断记没记住。</li>
    </ul>
    ${honest([
      "评分是按打字自动算的：一次打对=记得，看了提示或错一两次=模糊，错很多或点「不会」=忘了。忘了的词 10 分钟后会再出现一次。",
      "每天新词默认 10 个，可以在「我的」里调。零基础不建议一天超过 20 个，复习量会越滚越大。",
    ])}`;
  const go = $("#go", root);
  if (go) go.addEventListener("click", () => {
    const qq = todayQueue(app);
    app.session.review = { queue: [...qq.due, ...qq.fresh].map((c) => c.w), idx: 0, results: [], repeats: {} };
    app.render();
  });
}

function pickMode(c) {
  if (!c.seen) return "learn";
  if (c.ivl >= 3 && Math.random() < 0.4) return "recall";
  return "dictation";
}

function cardView(app, root, r) {
  const w = r.queue[r.idx];
  const c = app.store.card(w);
  if (!c) { r.idx++; return app.render(); }
  const e = app.dict.word(w) || {};
  const ph = c.ph || e.ph || "";
  const cn = c.cn || e.cn || "";
  const mode = r.mode && r.modeFor === r.idx ? r.mode : pickMode(c);
  r.mode = mode;
  r.modeFor = r.idx;
  const ctx = c.ctx ? `<div class="ctx">例：${esc(c.ctx)}${c.ctxEn ? `<br><span class="muted">${esc(c.ctxEn)}</span>` : ""}</div>` : "";
  const label = { learn: "新词 · 看着打", dictation: "听写 · 凭记忆打", recall: "回想 · 看英文想中文" }[mode];
  root.innerHTML = `
    <div class="row between"><button type="button" class="ghost" id="quit">← 先停一下</button>
      <span class="muted small">${r.idx + 1} / ${r.queue.length} · ${label}</span></div>
    <div class="progress"><div style="width:${(r.idx / r.queue.length) * 100}%"></div></div>
    <div class="card center" id="rc"></div>`;
  $("#quit", root).addEventListener("click", () => { app.session.review = null; app.render(); });
  const box = $("#rc", root);
  const done = (g) => commit(app, r, c, g, box);

  if (mode === "learn") {
    box.innerHTML = `
      <div class="wbig">${esc(w)}</div>
      <div class="ph">${esc(ph)} ${sayBtn(w)} ${sayBtn(w, { slow: true })}</div>
      <div class="cn">${esc(cn)}</div>${ctx}<div id="t"></div>`;
    app.speak(w);
    mountTyper($("#t", box), {
      target: w, placeholder: "照着打一遍",
      onDone: (s) => { app.store.bump("en", s.chars); done(s.usedHint || s.errors > 1 ? G_HARD : G_GOOD); },
    });
  } else if (mode === "dictation") {
    box.innerHTML = `
      <div class="cn big">${esc(cn)}</div>
      <div class="ph">${sayBtn(w, { label: "🔊 听发音" })} ${sayBtn(w, { slow: true })}</div>
      <div id="t"></div>
      <button type="button" class="ghost" id="dunno">不会，看答案</button>
      <div id="ans"></div>`;
    if (app.store.prefs.autoSpeak) app.speak(w);
    let gaveUp = false;
    const ty = mountTyper($("#t", box), {
      target: w, hidden: true, placeholder: "凭记忆打出英文",
      speakText: w, onSpeak: () => app.speak(w),
      onDone: (s) => {
        app.store.bump("en", s.chars);
        $("#ans", box).innerHTML = `<div class="wbig">${esc(w)}</div><div class="ph">${esc(ph)}</div>${ctx}`;
        if (gaveUp) return done(G_AGAIN);
        if (s.errors === 0 && !s.usedHint) return done(s.ms < 4000 && c.ivl >= 3 ? G_EASY : G_GOOD);
        if (s.errors <= 2) return done(G_HARD);
        done(G_AGAIN);
      },
    });
    $("#dunno", box).addEventListener("click", () => { gaveUp = true; ty.reveal(); });
  } else {
    box.innerHTML = `
      <div class="wbig">${esc(w)}</div>
      <div class="ph">${esc(ph)} ${sayBtn(w)}</div>
      <p class="muted">先在心里想它是什么意思，再点下面。</p>
      <button type="button" class="primary" id="show">看答案</button>
      <div id="ans"></div>`;
    if (app.store.prefs.autoSpeak) app.speak(w);
    $("#show", box).addEventListener("click", () => {
      $("#show", box).remove();
      $("#ans", box).innerHTML = `<div class="cn big">${esc(cn)}</div>${ctx}
        <div class="grades">${[G_AGAIN, G_HARD, G_GOOD, G_EASY].map((g) => `<button type="button" class="g${g}" data-g="${g}">${GRADE_TXT[g]}</button>`).join("")}</div>`;
      $("#ans", box).addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-g]");
        if (b) done(+b.dataset.g);
      });
    });
  }
}

function commit(app, r, c, g, box) {
  if (r.committed === r.idx) return;
  r.committed = r.idx;
  const wasNew = !c.seen;
  const n = grade(c, g);
  app.store.putCard(n);
  app.store.bump("rev");
  if (wasNew) app.store.bump("newc");
  app.store.bump(g === G_AGAIN ? "bad" : "ok");
  r.results.push({ w: c.w, g });
  if (g === G_AGAIN && (r.repeats[c.w] || 0) < 2) {
    r.repeats[c.w] = (r.repeats[c.w] || 0) + 1;
    r.queue.push(c.w);
  }
  const msg = document.createElement("div");
  msg.className = "gmsg g" + g;
  msg.textContent = `${GRADE_TXT[g]} · 下次 ${g === G_AGAIN ? (r.repeats[c.w] ? "这轮稍后再来" : "10 分钟后") : fmtDue(n.due)}`;
  box.appendChild(msg);
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "primary";
  nextBtn.textContent = "下一个 →";
  const go = () => { r.idx++; r.mode = null; app.render(); };
  nextBtn.addEventListener("click", go);
  box.appendChild(nextBtn);
  nextBtn.focus();
  // 自动答对的直接进下一个；答错的停一下让你看清答案
  if (g >= G_GOOD && r.mode !== "recall") setTimeout(() => { if (nextBtn.isConnected) go(); }, 900);
  if (r.mode === "recall") setTimeout(() => { if (nextBtn.isConnected) go(); }, 300);
}

function summary(app, root, r) {
  const cnt = [0, 0, 0, 0];
  for (const x of r.results) cnt[x.g]++;
  const wrong = [...new Set(r.results.filter((x) => x.g === G_AGAIN).map((x) => x.w))];
  const book = app.store.cards();
  const master = book.filter((c) => status(c) === "master").length;
  root.innerHTML = `
    <h1>做完了 💪</h1>
    <div class="stats3">
      <div class="stat"><b>${r.results.length}</b><span>这轮做了</span></div>
      <div class="stat"><b>${cnt[2] + cnt[3]}</b><span>记得</span></div>
      <div class="stat"><b>${cnt[0]}</b><span>忘了</span></div>
    </div>
    <p>${term("已掌握")}的词现在一共 <b>${master}</b> 个。</p>
    ${wrong.length ? `<div class="card"><h3>这轮忘掉的词</h3><div class="chips">${wrong.map((w) => `<button type="button" class="chip key" data-word="${esc(w)}"><span class="cz">${esc(w)}</span></button>`).join("")}</div></div>` : ""}
    <div class="row gap"><button type="button" class="primary" id="again">再看看还有没有</button><button type="button" class="ghost" data-go="write">去打字</button></div>`;
  $("#again", root).addEventListener("click", () => { app.session.review = null; app.render(); });
}
