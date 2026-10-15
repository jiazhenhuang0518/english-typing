// 「我的」页：进度 / 设置 / 手机电脑同步 / 装到主屏幕 / 术语表 / 备份

import { esc, term, intro, honest, $, toast, fmtAgo, sheet } from "../ui.js";
import { TERMS } from "../glossary.js";
import { status } from "../srs.js";
import { dayKey, sumDay, streak, mergeState } from "../store.js";
import { encodePair } from "../sync.js";

const TOKEN_URL =
  "https://github.com/settings/tokens/new?scopes=gist&description=" + encodeURIComponent("英语打字学习-同步");

export function renderMe(app, root) {
  const st = app.store.state;
  const cards = app.store.cards();
  const t = app.store.today();
  const by = { new: 0, learning: 0, master: 0 };
  for (const c of cards) by[status(c)]++;
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const k = dayKey(Date.now() - i * 86400000);
    const r = sumDay(st.stats, k);
    days.push({ k, n: (r.rev || 0) + (r.newc || 0) + Math.round((r.zh || 0) / 10) });
  }
  const maxN = Math.max(1, ...days.map((d) => d.n));
  const lvProg = [1, 2, 3].map((lv) => {
    const total = app.dict.level(lv).length;
    const learned = cards.filter((c) => c.lv === lv && c.seen).length;
    return { lv, total, learned };
  });
  const p = app.store.prefs;
  const sy = app.sync;

  root.innerHTML = `
    <h1>我的</h1>
    ${intro("你学了多少、每天坚持得怎么样，都在这。下面还能改设置、连手机电脑同步。")}
    <div class="stats3">
      <div class="stat"><b>${streak(st.stats)}</b><span>连续${term("打卡")}天数</span></div>
      <div class="stat"><b>${by.master}</b><span>${term("已掌握")}</span></div>
      <div class="stat"><b>${cards.length}</b><span>${term("词本")}总数</span></div>
    </div>
    <div class="card">
      <h3>今天</h3>
      <div class="kv"><span>打中文</span><b>${t.zh || 0} 字</b></div>
      <div class="kv"><span>打英文</span><b>${t.en || 0} 个字母</b></div>
      <div class="kv"><span>复习</span><b>${t.rev || 0} 次</b></div>
      <div class="kv"><span>新学单词</span><b>${t.newc || 0} 个</b></div>
    </div>
    <div class="card">
      <h3>最近 30 天</h3>
      <div class="bars" title="每天的学习量 = 复习次数 + 新词 + 打中文字数÷10">
        ${days.map((d) => `<div class="bar${d.k === dayKey() ? " today" : ""}" style="height:${Math.max(3, (d.n / maxN) * 100)}%" title="${d.k}：${d.n}"></div>`).join("")}
      </div>
      <p class="muted small">每根柱子是一天，越高学得越多（复习次数 + 新词 + 打的中文字数÷10）。最右边是今天。</p>
    </div>
    <div class="card">
      <h3>单词进度（按${term("分级")}）</h3>
      ${lvProg.map((x) => `<div class="kv"><span>第 ${x.lv} 级</span><b>${x.learned} / ${x.total}</b></div>
        <div class="progress"><div style="width:${(x.learned / Math.max(1, x.total)) * 100}%"></div></div>`).join("")}
      <p class="muted small">学完第 1 级（约 1588 个初中词），日常交流就有底子了。词本里状态：新词 ${by.new} · 学习中 ${by.learning} · 已掌握 ${by.master}。</p>
    </div>

    <div class="card">
      <h3>设置</h3>
      <label class="kv"><span>每天学几个${term("新词", "新词")}</span>
        <select id="newPerDay">${[5, 10, 15, 20, 30].map((n) => `<option value="${n}"${p.newPerDay === n ? " selected" : ""}>${n} 个</option>`).join("")}</select></label>
      <label class="kv"><span>朗读速度</span>
        <select id="rate">${[[0.7, "慢"], [0.85, "适中"], [1, "正常"]].map(([v, l]) => `<option value="${v}"${p.rate === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="kv"><span>联网${term("整句翻译")}</span><input type="checkbox" id="online"${p.online ? " checked" : ""}></label>
      <label class="kv"><span>复习时自动读单词</span><input type="checkbox" id="autoSpeak"${p.autoSpeak ? " checked" : ""}></label>
    </div>

    <div class="card" id="syncCard">
      <h3>📱💻 手机电脑${term("同步")}</h3>
      ${sy.enabled ? `
        <div class="kv"><span>状态</span><b class="${sy.lastError ? "badc" : "okc"}">${sy.busy ? "同步中…" : sy.lastError ? "出错：" + esc(sy.lastError) : "已连接"}</b></div>
        <div class="kv"><span>GitHub 账号</span><b>${esc(sy.cfg.login || "（同步后显示）")}</b></div>
        <div class="kv"><span>上次同步</span><b>${fmtAgo(sy.cfg.last)}</b></div>
        <div class="row gap wrap">
          <button type="button" class="primary" id="syncNow">立即同步</button>
          <button type="button" class="ghost" id="pair">给手机/另一台电脑配对</button>
          <button type="button" class="ghost" id="unlink">断开</button>
        </div>
        <p class="muted small">打开软件、学完东西 15 秒后、切到后台时都会自动同步，一般不用手动点。</p>`
      : `
        <p>进度存在<b>你自己的 GitHub 账号</b>里一个私密小文件（${term("Gist")}）。只要在<b>一台</b>设备上做一次，其它设备扫码就连上。</p>
        <ol class="steps">
          <li>点 <a href="${TOKEN_URL}" target="_blank" rel="noopener">这里去 GitHub 生成${term("令牌")}</a>（用你的 GitHub 账号登录）。</li>
          <li>「Expiration（有效期）」选 <b>No expiration</b>；下面只勾 <b>gist</b>（已帮你勾好），拉到底点绿色的 <b>Generate token</b>。</li>
          <li>复制那串以 <code>ghp_</code> 开头的字符，粘到下面，点「连接」。</li>
        </ol>
        <div class="row gap"><input id="token" type="password" placeholder="粘贴令牌 ghp_…" autocomplete="off">
          <button type="button" class="primary" id="connect">连接</button></div>
        <details><summary>别的设备已经连好了？用${term("配对码")}</summary>
          <p class="muted small">在已连好的设备上点「给手机配对」，手机用相机扫二维码就行；或者把配对链接粘到这里：</p>
          <div class="row gap"><input id="pairIn" type="text" placeholder="粘贴配对链接" autocomplete="off">
          <button type="button" class="ghost" id="usePair">使用</button></div>
        </details>`}
    </div>

    <div class="card">
      <h3>📲 ${term("加到主屏幕")}（像 App 一样用）</h3>
      <div class="kv"><span>iPhone / iPad</span><span>用 <b>Safari</b> 打开 → 底部「分享」⬆️ → 「添加到主屏幕」</span></div>
      <div class="kv"><span>安卓</span><span>用 Chrome 打开 → 右上角 ⋮ → 「安装应用 / 添加到主屏幕」</span></div>
      <div class="kv"><span>电脑</span><span>Chrome / Edge 地址栏右侧的「安装」图标 ⊕</span></div>
      <p class="muted small">装好以后没网也能打开、查词、复习（整句翻译和同步要联网）。</p>
    </div>

    <div class="card">
      <h3>📖 术语表</h3>
      <div class="chips">${Object.keys(TERMS).map((k) => term(k)).join(" ")}</div>
    </div>

    <div class="card">
      <h3>💾 备份</h3>
      <p class="muted small">额外保险：把进度存成一个文件。换浏览器、清缓存前可以先导出。</p>
      <div class="row gap wrap"><button type="button" class="ghost" id="export">导出进度文件</button>
      <label class="ghost btnlike">导入进度文件<input type="file" id="import" accept="application/json,.json" hidden></label></div>
    </div>

    ${honest([
      "不连同步时，进度只存在这台设备的这个浏览器里。清除浏览器数据会丢，所以建议连上同步，或者定期导出备份。",
      "同步用的令牌存在你设备的浏览器里。有人拿到你的手机并打开这个软件，理论上能看到令牌；令牌只有 gist 权限，最坏也只能动你的 Gist。不放心可以随时去 GitHub 删掉令牌。",
      "朗读用的是手机/电脑自带的语音，iPhone 和 Mac 的英文发音最自然；有的安卓机或 Windows 没装英文语音，会读不出来或口音怪。",
      "跟读（🎤）靠浏览器自带的语音识别：iPhone Safari 能用；电脑 Chrome 的识别要连 Google，国内网络可能用不了。",
      "这个软件帮你把每天的中文变成英文素材、按科学节奏复习，但「快速掌握」靠的是天天用：每天写 3～5 句 + 做完复习，3 个月能看到明显变化。",
    ])}
    <p class="muted small credits">词典数据：ECDICT（MIT 许可，skywind3000）、CC-CEDICT（CC BY-SA 4.0，MDBG）。二维码：qrcode-generator（MIT）。版本 ${esc(app.version)}</p>`;

  const setp = (k, v) => { app.store.setPref(k, v); toast("已保存"); };
  $("#newPerDay", root).addEventListener("change", (e) => setp("newPerDay", +e.target.value));
  $("#rate", root).addEventListener("change", (e) => { setp("rate", +e.target.value); app.speak("Hello! Nice to meet you."); });
  $("#online", root).addEventListener("change", (e) => setp("online", e.target.checked));
  $("#autoSpeak", root).addEventListener("change", (e) => setp("autoSpeak", e.target.checked));

  const on = (id, fn) => { const el = $("#" + id, root); if (el) el.addEventListener("click", fn); };
  on("connect", async () => {
    const tok = $("#token", root).value.trim();
    if (!tok) return toast("先粘贴令牌");
    toast("连接中…");
    try {
      await sy.connect(tok);
      toast("连上了！进度已同步");
    } catch (e) {
      toast("连接失败：" + e.message);
    }
    app.render();
  });
  on("usePair", async () => {
    const v = $("#pairIn", root).value.trim();
    const code = v.includes("#pair=") ? v.split("#pair=")[1] : v;
    try {
      sy.usePair(code);
      toast("配对成功，同步中…");
      await sy.syncNow();
      toast(sy.lastError ? "同步出错：" + sy.lastError : "同步好了！");
    } catch (e) {
      toast("配对码不对：" + e.message);
    }
    app.render();
  });
  on("syncNow", async () => {
    await sy.syncNow();
    toast(sy.lastError ? "同步出错：" + sy.lastError : "同步好了");
    app.render();
  });
  on("unlink", () => {
    if (!confirm("断开后这台设备不再同步（本机进度保留，云端文件也保留）。确定？")) return;
    sy.disconnect();
    app.render();
  });
  on("pair", () => pairSheet(app));
  on("export", () => {
    const blob = new Blob([JSON.stringify(app.store.state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `英语打字学习-进度-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  const imp = $("#import", root);
  imp.addEventListener("change", async () => {
    const f = imp.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !data.cards) throw new Error("不是进度文件");
      app.store.replace(mergeState(app.store.state, data));
      toast("导入好了（和现有进度合并，不会覆盖）");
      app.render();
    } catch (e) {
      toast("导入失败：" + e.message);
    }
  });
}

async function loadQr() {
  if (globalThis.qrcode) return globalThis.qrcode;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "vendor/qrcode.js";
    s.onload = res;
    s.onerror = () => rej(new Error("二维码组件加载失败"));
    document.head.appendChild(s);
  });
  return globalThis.qrcode;
}

async function pairSheet(app) {
  const url = location.origin + location.pathname + "#pair=" + encodePair(app.sync.cfg);
  let svg = "";
  try {
    const qrcode = await loadQr();
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    svg = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
  } catch (e) {
    svg = `<p class="warn">${esc(e.message)}</p>`;
  }
  const sh = sheet(`
    <h3>给另一台设备配对</h3>
    <p>手机打开<b>相机</b>扫下面的二维码 → 点弹出的链接 → 自动连上同步。</p>
    <div class="qr">${svg}</div>
    <p class="muted small">扫不了？把这个链接发到手机上打开（别发到群里）：</p>
    <div class="row gap"><input type="text" readonly value="${esc(url)}" id="pairUrl"><button type="button" class="ghost" id="copyPair">复制</button></div>
    <p class="warn small">⚠️ 二维码和链接里有你的同步${term("令牌")}，只给自己的设备用，别截图发给别人。</p>`);
  sh.el.querySelector("#copyPair").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("已复制");
    } catch {
      sh.el.querySelector("#pairUrl").select();
      toast("请手动复制");
    }
  });
}
