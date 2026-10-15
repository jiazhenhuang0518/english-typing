// 手机电脑同步：进度存进你自己 GitHub 账号下的一个私密 Gist（相当于云端小文件）

import { mergeState, sameState } from "./store.js";

const CFG_KEY = "et.sync";
export const FILE = "english-typing-sync.json";
const API = "https://api.github.com";

export function encodePair(cfg) {
  const s = JSON.stringify({ t: cfg.token, g: cfg.gistId });
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePair(code) {
  const b = code.replace(/-/g, "+").replace(/_/g, "/");
  const j = JSON.parse(decodeURIComponent(escape(atob(b + "===".slice((b.length + 3) % 4)))));
  if (!j.t || !j.g) throw new Error("配对码不完整");
  return { token: j.t, gistId: j.g };
}

export class Sync {
  constructor(store, { storage = globalThis.localStorage, fetchImpl } = {}) {
    this.store = store;
    this.storage = storage;
    this.fetch = fetchImpl || ((...a) => globalThis.fetch(...a));
    try { this.cfg = JSON.parse(storage.getItem(CFG_KEY) || "null"); } catch { this.cfg = null; }
    this.busy = false;
    this.lastError = "";
    this.listeners = new Set();
    this._timer = null;
  }

  get enabled() { return !!(this.cfg && this.cfg.token && this.cfg.gistId); }

  onStatus(fn) { this.listeners.add(fn); }
  _emit() { for (const fn of this.listeners) fn(this); }

  _save() {
    if (this.cfg) this.storage.setItem(CFG_KEY, JSON.stringify(this.cfg));
    else this.storage.removeItem(CFG_KEY);
    this._emit();
  }

  async _api(path, opts = {}) {
    const r = await this.fetch(API + path, {
      ...opts,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + this.cfg.token,
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (r.status === 401) throw new Error("令牌无效或已过期，请重新连接");
    if (r.status === 404) throw new Error("找不到同步文件（Gist 被删了？）");
    if (!r.ok) throw new Error("GitHub 返回 " + r.status);
    return r.json();
  }

  // 第一次：用令牌找到（或新建）同步文件
  async connect(token) {
    this.cfg = { token: token.trim() };
    try {
      const user = await this._api("/user");
      let gistId = "";
      for (let page = 1; page <= 5 && !gistId; page++) {
        const list = await this._api(`/gists?per_page=100&page=${page}`);
        const hit = list.find((g) => g.files && g.files[FILE]);
        if (hit) gistId = hit.id;
        if (list.length < 100) break;
      }
      if (!gistId) {
        const g = await this._api("/gists", {
          method: "POST",
          body: JSON.stringify({
            description: "英语打字学习 · 进度同步（自动生成，请勿手动修改）",
            public: false,
            files: { [FILE]: { content: JSON.stringify(this.store.state) } },
          }),
        });
        gistId = g.id;
      }
      this.cfg = { token: this.cfg.token, gistId, login: user.login, last: 0 };
      this._save();
      await this.syncNow();
      return this.cfg;
    } catch (e) {
      this.cfg = null;
      this._save();
      throw e;
    }
  }

  usePair(code) {
    const { token, gistId } = decodePair(code);
    this.cfg = { token, gistId, login: "", last: 0 };
    this._save();
  }

  disconnect() {
    this.cfg = null;
    this._save();
  }

  async _readRemote() {
    const g = await this._api("/gists/" + this.cfg.gistId);
    const f = g.files && g.files[FILE];
    if (!f) return null;
    let text = f.content;
    if (f.truncated && f.raw_url) text = await (await this.fetch(f.raw_url)).text();
    if (!this.cfg.login && g.owner) this.cfg.login = g.owner.login;
    return text ? JSON.parse(text) : null;
  }

  async syncNow() {
    if (!this.enabled || this.busy) return false;
    this.busy = true;
    this.lastError = "";
    this._emit();
    try {
      const remote = await this._readRemote();
      const merged = mergeState(this.store.state, remote);
      if (!remote || !sameState(merged, remote)) {
        await this._api("/gists/" + this.cfg.gistId, {
          method: "PATCH",
          body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(merged) } } }),
        });
      }
      if (!sameState(merged, this.store.state)) this.store.replace(merged);
      this.cfg.last = Date.now();
      this._save();
      return true;
    } catch (e) {
      this.lastError = e.message || String(e);
      return false;
    } finally {
      this.busy = false;
      this._emit();
    }
  }

  // 改动后 15 秒自动同步一次（连续改动只同步一次）
  schedule(ms = 15000) {
    if (!this.enabled) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.syncNow(), ms);
  }
}
