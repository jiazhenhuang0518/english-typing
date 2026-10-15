// 间隔重复：快忘的时候再见一次。简化版 SM-2（Anki 同款思路）

export const MIN = 60 * 1000;
export const DAY = 24 * 60 * MIN;
export const MASTER_DAYS = 21; // 间隔达到 21 天算“已掌握”

export const G_AGAIN = 0;
export const G_HARD = 1;
export const G_GOOD = 2;
export const G_EASY = 3;

export function newCard(w, extra = {}, now = Date.now()) {
  return { w, ease: 2.5, ivl: 0, reps: 0, lapses: 0, seen: 0, due: now, added: now, ...extra, u: now };
}

export function grade(card, g, now = Date.now()) {
  const c = { ...card, seen: (card.seen || 0) + 1, last: now, u: now };
  if (g === G_AGAIN) {
    if (card.reps > 0) c.lapses = (card.lapses || 0) + 1;
    c.reps = 0;
    c.ivl = 0;
    c.ease = Math.max(1.3, card.ease - 0.2);
    c.due = now + 10 * MIN;
    return c;
  }
  let ivl;
  if (card.reps === 0) ivl = [0, 1, 1, 3][g];
  else if (card.reps === 1) ivl = [0, 2, 3, 6][g];
  else {
    const base = Math.max(1, card.ivl);
    ivl = g === G_HARD ? base * 1.2 : g === G_GOOD ? base * card.ease : base * card.ease * 1.3;
    ivl = Math.max(ivl, base + 1);
  }
  if (g === G_HARD) c.ease = Math.max(1.3, card.ease - 0.15);
  if (g === G_EASY) c.ease = card.ease + 0.15;
  c.ivl = Math.min(365, Math.round(ivl));
  c.reps = card.reps + 1;
  // 提前 2 小时到期：第二天早一点打开也能复习
  c.due = now + c.ivl * DAY - 2 * 60 * MIN;
  return c;
}

export function status(c) {
  if (!c.seen) return "new";
  if (c.ivl >= MASTER_DAYS) return "master";
  return "learning";
}

// 今天要做的：先复习到期的，再学新词（受每日新词上限限制）
export function buildQueue(cards, { now = Date.now(), newLimit = 10, newDoneToday = 0 } = {}) {
  const live = cards.filter((c) => !c.del);
  const due = live.filter((c) => c.seen && c.due <= now).sort((a, b) => a.due - b.due);
  const fresh = live
    .filter((c) => !c.seen)
    .sort((a, b) => a.added - b.added)
    .slice(0, Math.max(0, newLimit - newDoneToday));
  return { due, fresh };
}

// 打字自动评分：一次打对=记得，看了提示=模糊，打错=忘了
export function autoGrade({ correct, usedHint, fast }) {
  if (!correct) return G_AGAIN;
  if (usedHint) return G_HARD;
  return fast ? G_EASY : G_GOOD;
}
