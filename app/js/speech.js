// 发音（浏览器自带朗读）+ 跟读识别（浏览器自带语音识别，部分浏览器没有）

let voice = null;

function pickVoice() {
  if (!("speechSynthesis" in globalThis)) return null;
  const vs = speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  const pref = [/Samantha/i, /Google US English/i, /Microsoft (Aria|Jenny|Zira)/i, /en[-_]US/i, /en[-_]GB/i];
  for (const re of pref) {
    const v = vs.find((x) => re.test(x.name) || re.test(x.lang));
    if (v) return v;
  }
  return vs[0] || null;
}

if ("speechSynthesis" in globalThis) {
  voice = pickVoice();
  speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
}

export const canSpeak = () => "speechSynthesis" in globalThis;

export function speak(text, rate = 0.85) {
  if (!canSpeak() || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice ? voice.lang : "en-US";
  if (voice) u.voice = voice;
  u.rate = rate;
  speechSynthesis.speak(u);
}

const Rec = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
export const canListen = () => !!Rec;

export function listen({ timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!Rec) return reject(new Error("这个浏览器不支持语音识别"));
    const r = new Rec();
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 3;
    let done = false;
    const timer = setTimeout(() => { if (!done) r.stop(); }, timeoutMs);
    r.onresult = (e) => {
      done = true;
      clearTimeout(timer);
      resolve(Array.from(e.results[0]).map((a) => a.transcript));
    };
    r.onerror = (e) => { done = true; clearTimeout(timer); reject(new Error(e.error || "识别失败")); };
    r.onend = () => { if (!done) { clearTimeout(timer); reject(new Error("没听清，再说一次")); } };
    r.start();
  });
}

// 跟读打分：目标句里的词，被识别出来几个
export function scoreSpeech(target, heardList, normalize) {
  const want = normalize(target).split(" ").filter(Boolean);
  let best = 0;
  let bestText = heardList[0] || "";
  for (const h of heardList) {
    const got = new Set(normalize(h).split(" "));
    const hit = want.filter((w) => got.has(w)).length;
    const s = want.length ? Math.round((hit / want.length) * 100) : 0;
    if (s > best) { best = s; bestText = h; }
  }
  return { score: best, heard: bestText };
}
