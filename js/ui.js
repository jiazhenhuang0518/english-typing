// 界面小工具：转义、弹出层、提示、术语按钮、发音按钮

import { TERMS } from "./glossary.js";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function term(name, label = name) {
  return `<button type="button" class="term" data-term="${esc(name)}">${esc(label)}</button>`;
}

export function sayBtn(text, { slow = false, label } = {}) {
  const l = label || (slow ? "🐢" : "🔊");
  const title = slow ? "慢速朗读" : "朗读";
  return `<button type="button" class="icon" data-say="${esc(text)}"${slow ? ' data-slow="1"' : ""} title="${title}" aria-label="${title}">${l}</button>`;
}

export function intro(html) {
  return `<p class="intro">${html}</p>`;
}

export function honest(items) {
  return `<details class="honest"><summary>老实说</summary><ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul></details>`;
}

export function lvBadge(lv) {
  return lv ? `<span class="lv lv${lv}" title="第 ${lv} 级">${lv}</span>` : "";
}

let openSheet = null;

export function sheet(html, { onClose } = {}) {
  if (openSheet) openSheet.close();
  const wrap = document.createElement("div");
  wrap.className = "sheet-wrap";
  wrap.innerHTML = `<div class="sheet" role="dialog"><button type="button" class="sheet-x" data-close aria-label="关闭">×</button>${html}</div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("show"));
  const api = {
    el: wrap.querySelector(".sheet"),
    close() {
      if (!wrap.isConnected) return;
      wrap.remove();
      if (openSheet === api) openSheet = null;
      if (onClose) onClose();
    },
  };
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-close]")) api.close();
  });
  openSheet = api;
  return api;
}

export function showTerm(name) {
  const t = TERMS[name];
  if (!t) return;
  sheet(`<h3>${esc(name)}</h3><p>${esc(t[0])}</p><p class="where">📍 在哪里看：${esc(t[1])}</p>`);
}

let toastTimer = null;
export function toast(msg) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

export function fmtAgo(t) {
  if (!t) return "从未";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "刚刚";
  if (s < 3600) return Math.round(s / 60) + " 分钟前";
  if (s < 86400) return Math.round(s / 3600) + " 小时前";
  return Math.round(s / 86400) + " 天前";
}

export function fmtDue(t) {
  const s = Math.round((t - Date.now()) / 1000);
  if (s <= 0) return "现在";
  if (s < 3600) return Math.ceil(s / 60) + " 分钟后";
  if (s < 86400) return Math.round(s / 3600) + " 小时后";
  return Math.round(s / 86400) + " 天后";
}
