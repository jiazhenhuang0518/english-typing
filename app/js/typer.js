// 跟打组件：看着（或听着）英文一个字母一个字母打出来

import { normalizeEn } from "./dict.js";
import { esc } from "./ui.js";

export function typedNorm(s) {
  return (s || "").replace(/[’‘]/g, "'").toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").replace(/^ /, "");
}

// 对了几个字母、第一个错在哪
export function compare(target, typed) {
  let k = 0;
  while (k < typed.length && k < target.length && typed[k] === target[k]) k++;
  return { ok: k, wrong: typed.length > k, done: k === target.length && typed.trimEnd().length === target.length };
}

/**
 * opts: { target, hidden, speakText, onDone({ms, chars, errors, usedHint}), onSpeak, placeholder }
 * hidden=true 时是“听写”：没打到的字母显示成下划线
 */
export function mountTyper(box, opts) {
  const target = normalizeEn(opts.target);
  const st = { errors: 0, usedHint: false, start: 0, finished: false, lastWrongAt: -1 };
  box.innerHTML = `
    <div class="typer">
      <div class="tg" aria-hidden="true"></div>
      <input class="tin" type="text" inputmode="text" autocomplete="off" autocapitalize="off"
        autocorrect="off" spellcheck="false" enterkeyhint="done"
        placeholder="${esc(opts.placeholder || "在这里打英文（大小写、标点不用管）")}">
      <div class="trow">
        <button type="button" class="ghost" data-act="hint">提示一个字母</button>
        ${opts.speakText ? '<button type="button" class="ghost" data-act="say">🔊 再听一遍</button>' : ""}
        <span class="tstat"></span>
      </div>
    </div>`;
  const tg = box.querySelector(".tg");
  const input = box.querySelector(".tin");
  const stat = box.querySelector(".tstat");

  function paint() {
    const typed = typedNorm(input.value);
    const r = compare(target, typed);
    let html = "";
    for (let i = 0; i < target.length; i++) {
      const ch = target[i];
      let cls = "todo";
      if (i < r.ok) cls = "ok";
      else if (i === r.ok && r.wrong) cls = "bad";
      else if (i === r.ok) cls = "cur";
      const shown = opts.hidden && i >= r.ok ? (ch === " " ? " " : "_") : ch;
      html += `<span class="${cls}${ch === " " ? " sp" : ""}">${shown === " " ? "&nbsp;" : esc(shown)}</span>`;
    }
    tg.innerHTML = html;
    if (r.wrong && st.lastWrongAt !== r.ok) {
      st.errors++;
      st.lastWrongAt = r.ok;
    }
    stat.textContent = `${r.ok}/${target.length}` + (st.errors ? ` · 错 ${st.errors}` : "");
    if (r.done && !st.finished) {
      st.finished = true;
      input.disabled = true;
      box.classList.add("done");
      const ms = Date.now() - (st.start || Date.now());
      opts.onDone && opts.onDone({ ms, chars: target.length, errors: st.errors, usedHint: st.usedHint });
    }
  }

  input.addEventListener("input", () => {
    if (!st.start) st.start = Date.now();
    paint();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
  box.querySelector('[data-act="hint"]').addEventListener("click", () => {
    if (st.finished) return;
    if (!st.start) st.start = Date.now();
    const r = compare(target, typedNorm(input.value));
    st.usedHint = true;
    input.value = target.slice(0, r.ok + 1);
    paint();
    input.focus();
  });
  const sayB = box.querySelector('[data-act="say"]');
  if (sayB) sayB.addEventListener("click", () => opts.onSpeak && opts.onSpeak());
  paint();
  if (opts.autofocus !== false) setTimeout(() => input.focus({ preventScroll: false }), 50);
  return {
    input,
    reveal() { st.usedHint = true; input.value = target; paint(); },
    get state() { return st; },
  };
}
