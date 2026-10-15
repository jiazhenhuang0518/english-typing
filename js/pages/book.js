// 「词本」页：收进来的所有词

import { esc, term, sayBtn, intro, $, toast, fmtDue, lvBadge } from "../ui.js";
import { status } from "../srs.js";
import { shortCn } from "./write.js";

const ST = { new: ["新词", "st-new"], learning: ["学习中", "st-learn"], master: ["已掌握", "st-master"] };

export function renderBook(app, root) {
  const s = (app.session.book = app.session.book || { q: "", f: "all" });
  const all = app.store.cards().sort((a, b) => b.added - a.added);
  const counts = { all: all.length, new: 0, learning: 0, master: 0 };
  for (const c of all) counts[status(c)]++;
  root.innerHTML = `
    <h1>词本</h1>
    ${intro(`打字、入门课里遇到的词都自动收在这里，按${term("间隔重复")}安排复习。也可以自己加：输入英文或中文都行。`)}
    <form class="row gap" id="addForm">
      <input id="addIn" type="text" placeholder="加词：比如 coach 或 教练" autocomplete="off" autocapitalize="off">
      <button type="submit" class="primary">加入</button>
    </form>
    <input id="q" type="search" placeholder="在词本里搜…" value="${esc(s.q)}">
    <div class="seg small">
      ${[["all", "全部"], ["new", "新词"], ["learning", "学习中"], ["master", "已掌握"]]
        .map(([k, l]) => `<button type="button" class="${s.f === k ? "on" : ""}" data-f="${k}">${l} ${counts[k]}</button>`).join("")}
    </div>
    <div id="blist"></div>
    <p class="muted small">颜色：<span class="dot st-new"></span>${term("新词")} <span class="dot st-learn"></span>${term("学习中")} <span class="dot st-master"></span>${term("已掌握")}</p>`;

  function list() {
    const q = s.q.trim().toLowerCase();
    const rows = all.filter((c) => (s.f === "all" || status(c) === s.f) &&
      (!q || c.w.toLowerCase().includes(q) || (c.cn || "").includes(q) || (c.ctx || "").includes(q)));
    $("#blist", root).innerHTML = rows.length
      ? rows.slice(0, 300).map((c) => {
          const [txt, cls] = ST[status(c)];
          return `<div class="wrow">
            <span class="dot ${cls}" title="${txt}"></span>
            <button type="button" class="wmain" data-word="${esc(c.w)}"><b>${esc(c.w)}</b> ${lvBadge(c.lv)} <span class="ph">${esc(c.ph || "")}</span>
              <span class="cn">${esc(shortCn(c.cn))}</span>
              ${c.seen ? `<span class="muted small">下次 ${fmtDue(c.due)}</span>` : ""}
              ${c.ctx ? `<span class="ctx small">${esc(c.ctx)}</span>` : ""}</button>${sayBtn(c.w)}</div>`;
        }).join("") + (rows.length > 300 ? `<p class="muted small">只显示前 300 个，用搜索找更多。</p>` : "")
      : `<p class="muted">${all.length ? "没有符合的词。" : "词本还是空的。去「打字」写一句话，或者「入门→核心词」学一组。"}</p>`;
  }
  list();

  $("#q", root).addEventListener("input", (e) => { s.q = e.target.value; list(); });
  root.addEventListener("click", (e) => {
    const f = e.target.closest("[data-f]");
    if (f) { s.f = f.dataset.f; app.render(); }
  });
  $("#addForm", root).addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("#addIn", root).value.trim();
    if (!v) return;
    let entry = null;
    if (/[\u3400-\u9fff]/.test(v)) {
      const z = app.dict.lookupZh(v);
      if (z && z.hw) entry = app.dict.word(z.hw);
      if (!entry) {
        toast(z ? `「${v}」= ${z.gloss}，不在分级词表里，先用英文加吧` : `词典里没找到「${v}」`);
        return;
      }
    } else {
      entry = app.dict.word(v);
      if (!entry) {
        // 不在分级词表里的词也能加，只是没有音标和中文
        entry = { w: v.toLowerCase(), ph: "", cn: "（自己加的词）", lv: 0 };
      }
    }
    const added = app.addWords([entry], { src: "manual" });
    toast(added.length ? `已加入：${entry.w}` : `${entry.w} 已经在词本里了`);
    $("#addIn", root).value = "";
    app.render();
  });
}
