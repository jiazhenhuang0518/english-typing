<coding_guidelines>
# 打字学英语 · 项目说明（给 Droid）

## 是什么
纯静态 PWA（无构建步骤、无框架、原生 ES 模块），部署目录 = `app/`。用户零基础，界面全中文、大白话。

## 结构
- `app/js/dict.js` 词典+分词（Intl.Segmenter，没有就最大正向匹配）+英文句子收词（变形还原、缩写拆分、STOP 虚词）
- `app/js/srs.js` 简化 SM-2；`app/js/store.js` localStorage 状态 + `mergeState`（每条记录按 `u` 取新；删除=墓碑 `del:1`；统计按设备分开、取最大值）
- `app/js/sync.js` GitHub Gist 同步（文件名 `english-typing-sync.json`，配对码 = base64url{t,g}，链接 `#pair=`）
- `app/js/translate.js` 整句翻译：Google gtx → MyMemory，先试的超时 3.5 秒，成功的那家记在 `et.tprov`
- `app/js/pages/*.js` 五个页面；每次渲染都新建 `<section>`，所以页面里的事件监听不会叠加
- `app/data/` 由 `tools/build_data.py` 生成，别手改
- 术语词典 `app/js/glossary.js`：界面里用 `term("名词")` 生成可点开的解释（UI 四件套）

## 规矩
- 改了 `app/` 任何文件，发布前必须跑 `python3 tools/stamp_version.py`（离线缓存版本号），否则手机一直用旧版。
- 测试：`npm test`（10 项）；界面用 agent-browser 在 390×844 和桌面两种尺寸点一遍。本地测试改了代码要先清 SW 缓存。
- 不要在代码里放任何令牌；同步令牌只存在用户浏览器 `et.sync`。
- 词典许可：CC-CEDICT 是 CC BY-SA 4.0，`zh2en.json` 也要保持这个许可并在界面署名。
</coding_guidelines>
