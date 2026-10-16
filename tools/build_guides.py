"""Build the local 使用说明/ folder: one HTML guide per device + offline 安装包/.

Run after tools/build_rime.py. Installers are cached in tools/raw/installers/
(download URLs below). 安装包/ is not published (too big); the HTML guides are.
"""
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "使用说明"
PKG = OUT / "安装包"
INST = ROOT / "tools" / "raw" / "installers"
DIST = ROOT / "dist" / "rime"

SITE = "https://jiazhenhuang0518.github.io/english-typing/"
GUIDE = SITE + "rime/"
SQUIRREL = "Squirrel-1.1.2.pkg"
WEASEL = "weasel-0.17.4.0-installer.exe"
TRIME = "com.osfans.trime-v3.3.12-0-ge09ac711-arm64-v8a-release.apk"
FULL = "rime-ice-english-full.zip"
OVERLAY = "english-hint-overlay.zip"

CSS = """
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0b0b0c;color:#e8e6e3;font:16px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
main{max-width:760px;margin:0 auto;padding:28px 18px 60px}
h1{font-size:26px;margin:0 0 6px}
h2{font-size:20px;margin:34px 0 10px;padding-top:14px;border-top:1px solid #222226}
h3{font-size:17px;margin:20px 0 6px;color:#cfc9be}
a{color:#d8cfbf}
code{background:#17171a;border:1px solid #2a2a2e;border-radius:5px;padding:1px 6px;font-size:14px}
.lead{color:#a9a49b;margin:0 0 18px}
.card{border:1px solid #2a2a2e;border-radius:12px;padding:12px 16px;margin:12px 0;background:#111114}
.tip{border-left:3px solid #b8b2a7;padding:6px 12px;margin:12px 0;color:#cfc9be;background:#121215}
.warn{border-left:3px solid #d08a4a}
ol li,ul li{margin:6px 0}
table{border-collapse:collapse;width:100%;margin:10px 0}
td,th{border:1px solid #2a2a2e;padding:8px 10px;text-align:left;vertical-align:top}
th{background:#151518;color:#cfc9be}
.qr{display:inline-block;background:#fff;padding:8px;border-radius:10px;margin:6px 16px 6px 0;text-align:center;color:#111;font-size:13px}
.qr svg{width:150px;height:150px;display:block}
.demo{font-size:17px;padding:8px 12px;border:1px solid #2a2a2e;border-radius:10px;background:#0f0f12}
.demo i{font-style:normal;color:#8a8a92;font-size:13px}
.nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}
.nav a{border:1px solid #2a2a2e;border-radius:999px;padding:4px 12px;text-decoration:none;font-size:14px}
.nav a.on{background:#e8e6e3;color:#0b0b0c}
.muted{color:#8a8a92;font-size:14px}
details{margin:8px 0}summary{cursor:pointer;color:#cfc9be}
"""

PAGES = [
    ("0-先看我.html", "先看我"),
    ("1-iPhone.html", "iPhone"),
    ("2-安卓手机.html", "安卓手机"),
    ("3-Mac电脑.html", "Mac 电脑"),
    ("4-Windows电脑.html", "Windows 电脑"),
]


def qr_svg(text):
    # the vendored file sits under "type": "module", so require() would load it as ESM
    js = (
        "const s=require('fs').readFileSync(process.argv[1],'utf8');"
        "const q=new Function(s+';return qrcode;')()(0,'M');q.addData(process.argv[2]);q.make();"
        "process.stdout.write(q.createSvgTag({cellSize:4,margin:2,scalable:true}))"
    )
    return subprocess.run(
        ["node", "-e", js, str(ROOT / "app" / "vendor" / "qrcode.js"), text],
        check=True, capture_output=True, text=True,
    ).stdout


def qr(text, label):
    return f'<div class="qr">{qr_svg(text)}{label}</div>'


def page(fname, title, body):
    nav = "".join(
        f'<a href="{f}" class="{"on" if f == fname else ""}">{t}</a>' for f, t in PAGES
    )
    html = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · 打字学英语使用说明</title><style>{CSS}</style></head>
<body><main><div class="nav">{nav}</div>{body}
<p class="muted" style="margin-top:40px">雾凇拼音 iDvel/rime-ice（GPL-3.0）· 输入法引擎 Rime · 英文释义 CC-CEDICT（CC BY-SA 4.0）· 词典 ECDICT（MIT）</p>
</main></body></html>
"""
    (OUT / fname).write_text(html, encoding="utf-8")


DEMO = '<div class="demo">苹果<i>〔apple〕</i>　🍎　评过　平果</div>'

SYNC = """
<h3>手机电脑同步进度（可选，做一次就行）</h3>
<ol>
<li>先在<b>电脑</b>上做：网页 App →「我的」→「手机电脑同步」，按页面上的 3 步去 GitHub 生成一个令牌（只勾 <code>gist</code>），粘回来点「连接」。</li>
<li>连好后在电脑上点「给手机/另一台电脑配对」，屏幕上出现二维码。</li>
<li>手机打开<b>相机</b>扫这个二维码 → 点弹出的链接 → 自动连上。</li>
</ol>
<p class="muted">令牌相当于一把只能开 GitHub 小文件（Gist）的钥匙，只存在你自己设备的浏览器里。</p>
"""


def build_pages():
    site_qr = qr(SITE, "网页 App")
    guide_qr = qr(GUIDE, "输入法安装页")

    page("0-先看我.html", "先看我", f"""
<h1>打字学英语 · 使用说明</h1>
<p class="lead">一共两样东西，可以只用一样，也可以都用。</p>
<table>
<tr><th></th><th>是什么</th><th>适合</th></tr>
<tr><td><b>① 网页 App</b></td><td>一个网站，能装到桌面当 App 用：打中文 → 逐词英文 + 整句翻译 → 跟打 → 自动进词本 → 每天复习。还有零基础入门课（字母发音、核心词、常用句）。</td><td>每天专门学 10～15 分钟</td></tr>
<tr><td><b>② 输入法版</b></td><td>把手机、电脑的输入法换成 Rime（开源输入法引擎）+ 雾凇拼音（一套现成的拼音词库）。平时聊微信、写文档时，候选词后面直接带英文：{DEMO}</td><td>不专门学，平时打字顺便看</td></tr>
</table>

<h2>按设备看</h2>
<table>
<tr><th>设备</th><th>打开这个说明</th><th>输入法要装的软件</th><th>安装包在</th></tr>
<tr><td>iPhone / iPad</td><td><a href="1-iPhone.html">1-iPhone.html</a></td><td>仓输入法（App Store 免费）</td><td><code>安装包/iPhone/</code></td></tr>
<tr><td>安卓手机</td><td><a href="2-安卓手机.html">2-安卓手机.html</a></td><td>同文输入法</td><td><code>安装包/安卓/</code></td></tr>
<tr><td>Mac</td><td><a href="3-Mac电脑.html">3-Mac电脑.html</a></td><td>鼠须管</td><td><code>安装包/Mac/</code>（双击就装）</td></tr>
<tr><td>Windows</td><td><a href="4-Windows电脑.html">4-Windows电脑.html</a></td><td>小狼毫</td><td><code>安装包/Windows/</code>（双击就装）</td></tr>
</table>
<div class="tip">建议顺序：<b>先装 Mac</b>（这台电脑，双击一下就好）→ 再弄手机 → 最后 Windows。网页 App 什么时候用都行。</div>

<h2>两个网址（手机扫码就能打开）</h2>
{site_qr}{guide_qr}
<p class="muted">网页 App：{SITE}<br>输入法安装页：{GUIDE}</p>

<h2>网页 App 每天怎么用（10～15 分钟）</h2>
<ol>
<li><b>打字</b>：写 3～5 句今天想说的中文。每个词下面出英文，再出整句英文。点「跟打一遍」照着打，里面的单词自动进词本。</li>
<li><b>复习</b>：把今天到期的词做完。新词照着打，学过的词听写，熟词看英文想中文。</li>
<li><b>入门</b>（零基础先多花时间在这）：字母和发音 → 核心词（每组 10 个）→ 常用句（打招呼、点餐、健身训练等 9 个场景）。</li>
</ol>

<h2>输入法版日常怎么用</h2>
<ul>
<li>跟平时一样打拼音，候选词后面灰色的就是英文。打 <code>pingguo</code> → 苹果〔apple〕。</li>
<li>反过来打英文单词也行：打 <code>apple</code> → apple〔苹果〕。</li>
<li>看到想记住的词，去网页 App 打一下，它才会进词本、安排复习（输入法和网页 App 进度不互通）。</li>
<li>不想看英文了：电脑按 <code>Ctrl + `</code>（数字 1 左边的键）选「无英」；重新打开输入法会自动恢复成显示英文。</li>
</ul>

<h2>文件夹里有什么</h2>
<table>
<tr><th>文件</th><th>作用</th></tr>
<tr><td><code>安装包/Mac/双击安装输入法.command</code></td><td>Mac 一键安装（鼠须管 + 配置）</td></tr>
<tr><td><code>安装包/Windows/双击安装输入法.bat</code></td><td>Windows 一键安装（小狼毫 + 配置），要先把整个 Windows 文件夹拷到那台电脑</td></tr>
<tr><td><code>安装包/安卓/</code></td><td>同文输入法 APK + 配置包</td></tr>
<tr><td><code>安装包/iPhone/{OVERLAY}</code></td><td>仓输入法补丁（只有 4 个文件）</td></tr>
<tr><td><code>{FULL}</code></td><td>完整配置包 = 雾凇拼音 + 英文注释（每个文件夹里放了一份，同一个文件）</td></tr>
</table>

<h2>老实说</h2>
<ul>
<li>输入法里只有<b>单词</b>的英文，不翻译整句；整句翻译在网页 App 里（要联网）。</li>
<li>英文是从词典按规则自动挑的前一两个意思，大部分准，少数会怪。只有词典里有的词才有英文，「我在学习」这种整句候选通常没有。</li>
<li>这台 Mac 上用 Rime 引擎模拟打字测过；iPhone、安卓、Windows 没在真机上试过，碰到问题对照各设备页面最后的「出问题怎么办」。</li>
</ul>
""")

    page("1-iPhone.html", "iPhone", f"""
<h1>iPhone / iPad</h1>
<p class="lead">先装网页 App（2 分钟），再装输入法（10 分钟）。</p>

<h2>一、网页 App</h2>
<ol>
<li>用 iPhone <b>相机</b>扫下面左边的二维码，用 <b>Safari</b> 打开（别用微信里打开）。</li>
<li>点底部「分享」⬆️ → 往下找「添加到主屏幕」→ 添加。桌面上会出现「打字学英语」图标，以后从图标打开。</li>
</ol>
{qr(SITE, "网页 App")}
{SYNC}

<h2>二、输入法（仓输入法 + 英文注释）</h2>
<h3>第 1 步：装仓输入法</h3>
<p>App Store 搜「<b>仓输入法</b>」（免费），或者扫码打开安装页里的链接。它自带雾凇拼音。</p>

<h3>第 2 步：在系统里打开它</h3>
<ol>
<li>「设置」→「通用」→「键盘」→「键盘」→「添加新键盘…」→ 选「仓输入法」。</li>
<li>回到键盘列表，点「仓输入法」→ 打开「<b>允许完全访问</b>」。<b>这步必须做</b>：不开的话键盘读不到你导入的补丁，能打中文但不会有英文。</li>
</ol>

<h3>第 3 步：把补丁包给仓输入法（两种方法选一种）</h3>
<div class="card"><b>方法 A：扫码下载（简单）</b>
<ol>
<li>用相机扫下面的二维码，用 <b>Safari</b> 打开安装页 → 展开「iPhone」→ 点「下载 iPhone 补丁包」→ 弹窗点「下载」。</li>
<li class="muted">别从桌面上「打字学英语」图标里进安装页去点，那里面 iPhone 不让下载文件；也别在微信里打开。点了没反应就用方法 B。</li>
<li>下载完点地址栏左边的 ⬇️（或「文件」App →「下载」）→ 点开 <code>{OVERLAY}</code> 所在位置 → 长按这个文件 →「共享」→ 选「仓输入法」。</li>
</ol>
{guide_qr}</div>
<div class="card"><b>方法 B：从 Mac 隔空投送（AirDrop）</b>
<ol>
<li>Mac 上打开 <code>使用说明/安装包/iPhone/</code>，右键 <code>{OVERLAY}</code> →「共享」→「隔空投送」→ 选你的 iPhone。</li>
<li>iPhone 收到后选用「仓输入法」打开；如果直接存进了「文件」，就在「文件」里长按它 →「共享」→「仓输入法」。</li>
</ol></div>
<p class="muted">补丁只有 4 个文件，不会覆盖仓输入法自带的雾凇拼音和你的其他设置。</p>

<h3>第 4 步：部署</h3>
<p>打开仓输入法 App → 首页「RIME」→「<b>重新部署</b>」，等它转完（第一次几十秒）。部署就是把词库编译一遍，改了配置都要做一次。</p>

<h3>第 5 步：打开「显示候选 Comment」（必须）</h3>
<p>仓输入法 App →「<b>键盘设置</b>」→「<b>候选栏设置</b>」→ 打开「<b>显示候选 Comment</b>」。仓输入法默认把候选词后面的注释藏起来，不开这个就看不到英文。觉得英文字太小，同一页「候选 Comment 字体大小」可以调大到 14。</p>

<h3>第 6 步：用起来</h3>
<ol>
<li>随便打开一个能打字的地方（备忘录、微信）。</li>
<li>长按键盘左下角 🌐 → 选「仓输入法」。</li>
<li>打 <code>pingguo</code>，看到 {DEMO} 就成功了。</li>
</ol>

<h2>出问题怎么办</h2>
<ul>
<li><b>打字没有英文</b>：① 确认第 5 步「显示候选 Comment」开了（最常见）② 确认第 2 步「允许完全访问」开了 ③ 仓输入法 App 里再「重新部署」一次 ④ 还不行，就把 <code>安装包/安卓/{FULL}</code>（完整包）也按第 3 步的方法给仓输入法，再部署。完整包会覆盖仓自带的雾凇拼音配置。</li>
<li><b>方案列表里的「英文注释数据」</b>：是给雾凇拼音查英文用的词典，不是打字方案，不用勾、也别在键盘里切到它；打字用「雾凇拼音」，排在「已选输入方案」第一个。</li>
<li><b>输密码时键盘变回苹果键盘</b>：iOS 规定，所有第三方输入法都这样，正常。</li>
<li><b>候选很少 / 打不出字</b>：刚部署完键盘有时要等几秒，收起键盘再打开。</li>
<li><b>想换回原来的输入法</b>：长按 🌐 选别的键盘就行，仓输入法留着不影响。</li>
</ul>
""")

    page("2-安卓手机.html", "安卓手机", f"""
<h1>安卓手机</h1>
<p class="lead">先装网页 App（2 分钟），再装输入法（10 分钟）。</p>

<h2>一、网页 App</h2>
<ol>
<li>扫下面左边的二维码，用 <b>Chrome</b> 或手机自带浏览器打开（别在微信里打开）。</li>
<li>Chrome：右上角 ⋮ →「安装应用」或「添加到主屏幕」。其他浏览器一般在菜单里找「添加到桌面」。</li>
</ol>
{qr(SITE, "网页 App")}
{SYNC}

<h2>二、输入法（同文输入法 + 雾凇拼音 + 英文注释）</h2>
<h3>第 1 步：把两个文件弄到手机上</h3>
<p>需要的文件都在 <code>使用说明/安装包/安卓/</code>：</p>
<ul>
<li><code>同文输入法.apk</code>：输入法本身（官方 GitHub 下载的 v3.3.12）</li>
<li><code>{FULL}</code>：词库和配置</li>
</ul>
<p>传到手机的方法任选：微信「文件传输助手」、QQ、数据线拷贝；或者扫下面的二维码打开安装页，展开「安卓」直接下载。</p>
{guide_qr}

<h3>第 2 步：装同文输入法</h3>
<ol>
<li>在手机上点开 <code>同文输入法.apk</code> → 安装。提示「禁止安装未知来源应用」就按提示允许一次。</li>
<li>打开同文输入法 App，按提示给「文件访问 / 所有文件访问」权限。</li>
<li>按 App 提示「启用输入法」并「选择输入法」切到同文（或者去系统「设置 → 语言和输入法」里打开）。</li>
</ol>

<h3>第 3 步：放词库</h3>
<ol>
<li>用手机自带的「文件管理」找到 <code>{FULL}</code>，点它 → 解压。</li>
<li>把<b>解压出来的所有文件和文件夹</b>移动到手机存储最外层的 <code>rime</code> 文件夹里（同文第一次打开会自动建；没有就自己新建一个叫 <code>rime</code> 的文件夹）。有同名文件选「覆盖 / 替换」。</li>
<li>放好后 <code>rime</code> 里应该能直接看到 <code>rime_ice.schema.yaml</code>、<code>lua</code> 文件夹这些，不要多套一层文件夹。</li>
</ol>

<h3>第 4 步：部署</h3>
<p>打开同文 App → 找到「<b>部署</b>」点一下，等它跑完（第一次 1～3 分钟，别切出去）。</p>

<h3>第 5 步：用起来</h3>
<p>打开微信随便找个对话框，切到同文键盘，打 <code>pingguo</code>，看到 {DEMO} 就成功了。</p>

<h2>出问题怎么办</h2>
<ul>
<li><b>打出来不是雾凇拼音</b>：同文 App 里找「方案」→ 选「雾凇拼音」→ 再部署一次。</li>
<li><b>没有英文</b>：多半是文件多套了一层文件夹，回第 3 步检查 <code>rime</code> 里能不能直接看到 <code>english_hint.dict.yaml</code>。</li>
<li><b>APK 装不上</b>（很老或很特别的手机）：扫码打开安装页，点「其他版本」换一个。</li>
<li><b>想换回原来的输入法</b>：键盘上切换输入法，或者系统设置里改默认输入法。</li>
</ul>
""")

    page("3-Mac电脑.html", "Mac 电脑", f"""
<h1>Mac 电脑</h1>
<p class="lead">这台 Mac 上配置已经放好了，只差装鼠须管（要你输开机密码，我没法替你输）。</p>

<h2>一、网页 App</h2>
<ol>
<li>用 Chrome 打开 <a href="{SITE}">{SITE}</a></li>
<li>地址栏右边有个「安装」图标（电脑 + 箭头）→ 安装。以后从启动台 / 程序坞打开。Safari 也行：菜单「文件 → 添加到程序坞」。</li>
<li>建议在电脑上先把「我的 → 手机电脑同步」连好，再给手机配对。</li>
</ol>
{SYNC}

<h2>二、输入法（鼠须管 + 雾凇拼音 + 英文注释）</h2>
<h3>第 1 步：双击安装</h3>
<ol>
<li>打开 <code>使用说明/安装包/Mac/</code>，双击「<b>双击安装输入法.command</b>」。会弹出一个「终端」黑窗口。</li>
<li>提示输入密码时输入<b>开机密码</b>，回车。输的时候屏幕上什么都不显示，是正常的。</li>
<li>等它显示「装好了」，按任意键关掉窗口。</li>
</ol>
<div class="tip">如果双击提示「无法打开」：右键这个文件 →「打开」→ 再点「打开」。</div>
<p class="muted">它做了三件事：装鼠须管（官方签名安装包）→ 把原来的 <code>~/Library/Rime</code> 改名备份 → 放入新配置并部署。</p>

<h3>第 2 步：在系统里添加鼠须管</h3>
<ol>
<li>「系统设置」→「键盘」→「文字输入」那一栏点「编辑…」。</li>
<li>左下角「+」→ 左边选「简体中文」→ 右边选「<b>鼠须管</b>」→「添加」。</li>
<li>列表里找不到鼠须管：屏幕左上角  →「退出登录」，重新登录后再找。</li>
</ol>

<h3>第 3 步：用起来</h3>
<ul>
<li>按 <code>Ctrl + 空格</code>（或键盘上的 🌐 / 地球键）切到鼠须管。</li>
<li>打 <code>pingguo</code>，看到 {DEMO} 就成功了。</li>
<li>中英文切换：按一下 <code>Shift</code>。</li>
<li>开关英文注释：打字时按 <code>Ctrl + `</code>（数字 1 左边的键）→ 选「英文 / 无英」。</li>
</ul>

<h2>出问题怎么办</h2>
<ul>
<li><b>没有英文 / 候选不对</b>：屏幕右上角菜单栏的输入法图标 → 鼠须管 →「重新部署」，等十几秒。</li>
<li><b>想恢复原来的配置</b>：<code>~/Library/</code> 里有 <code>Rime.bak-日期</code> 文件夹，把现在的 <code>Rime</code> 删掉，备份改回 <code>Rime</code>，再「重新部署」。</li>
<li><b>不想要了</b>：在「文字输入」里把鼠须管删掉（选中按「−」）就不会再出现。</li>
<li>以后要更新词库：重新运行一次「双击安装输入法.command」就行（会自动备份旧的）。</li>
</ul>
""")

    win_cmd = ("[Net.ServicePointManager]::SecurityProtocol='Tls12'; iex ([Text.Encoding]::UTF8.GetString("
               "(New-Object Net.WebClient).DownloadData('" + GUIDE + "install-windows.ps1')))")
    page("4-Windows电脑.html", "Windows 电脑", f"""
<h1>Windows 电脑</h1>
<p class="lead">两种方法：拷文件夹过去双击（不用等下载），或者联网粘一行命令。</p>

<h2>一、网页 App</h2>
<ol>
<li>用 Edge 或 Chrome 打开 <a href="{SITE}">{SITE}</a></li>
<li>地址栏右边的「安装」图标（或右上角 ⋯ →「应用」→「将此站点作为应用安装」）。以后从开始菜单打开。</li>
</ol>
{SYNC}

<h2>二、输入法（小狼毫 + 雾凇拼音 + 英文注释）</h2>
<div class="card"><b>方法 A：拷文件夹双击（推荐）</b>
<ol>
<li>把 <code>使用说明/安装包/Windows/</code> <b>整个文件夹</b>拷到 Windows 电脑上（U 盘、网盘、微信文件传输助手都行，4 个文件要在一起）。</li>
<li>双击「<b>双击安装输入法.bat</b>」。</li>
<li>弹出蓝色「Windows 已保护你的电脑」：点「更多信息」→「仍要运行」。</li>
<li>弹出小狼毫安装窗口：一路「下一步 / 安装」；问简体还是繁体选<b>简体</b>；问要不要管理员权限选「是」。</li>
<li>装完黑窗口会继续放配置、部署，显示「装好了」后按任意键关掉。</li>
</ol></div>
<div class="card"><b>方法 B：联网一行命令</b>
<ol>
<li>右键「开始」按钮 →「终端」或「Windows PowerShell」。</li>
<li>复制下面这一整行，粘进去，回车：</li>
</ol>
<code style="display:block;word-break:break-all;padding:10px">{win_cmd}</code>
<p class="muted">网页里的输入法安装页有「复制命令」按钮，更方便。</p></div>

<h3>用起来</h3>
<ul>
<li>按 <code>Win + 空格</code> 切到「小狼毫」（或点任务栏右下角的输入法图标选）。</li>
<li>打 <code>pingguo</code>，看到 {DEMO} 就成功了。</li>
<li>中英文切换：按一下 <code>Shift</code>。</li>
<li>开关英文注释：打字时按 <code>Ctrl + `</code> 或 <code>F4</code> → 选「英文 / 无英」。</li>
</ul>

<h2>出问题怎么办</h2>
<div class="tip warn">Windows 脚本我只在 Mac 上写好、没在 Windows 电脑上真跑过。脚本报错就用下面的手动方法，一样的效果。</div>
<h3>手动安装（脚本不行时）</h3>
<ol>
<li>双击 <code>{WEASEL}</code> 装好小狼毫。</li>
<li>按 <code>Win + R</code>，输入 <code>%APPDATA%\\Rime</code> 回车，打开配置文件夹（打不开就先新建）。里面原来的东西可以先整个拷走备份。</li>
<li>把 <code>{FULL}</code> 右键「全部解压缩」到这个文件夹里（文件直接在 <code>Rime</code> 里，别多套一层）。</li>
<li>右下角任务栏的小狼毫图标（「中」字）右键 →「重新部署」。</li>
</ol>
<ul>
<li><b>没有英文</b>：右键「中」→「重新部署」；还不行检查 <code>%APPDATA%\\Rime</code> 里能不能直接看到 <code>english_hint.dict.yaml</code>。</li>
<li><b>恢复原来的配置</b>：脚本把旧的改名成 <code>Rime.bak-日期</code>，在 <code>%APPDATA%</code> 里，改回来再重新部署。</li>
</ul>
""")


MAC_COMMAND = f"""#!/bin/bash
# 双击运行：装鼠须管（官方签名安装包）+ 雾凇拼音 + 英文注释
cd "$(dirname "$0")"
if [ ! -d "/Library/Input Methods/Squirrel.app" ]; then
  echo "正在安装鼠须管，请输入开机密码（输入时不显示，输完回车）："
  sudo installer -pkg "{SQUIRREL}" -target / || {{ echo "安装失败"; read -n1 -r -p "按任意键关闭"; exit 1; }}
fi
bash install-mac.sh "{FULL}"
echo
read -n1 -r -p "按任意键关闭这个窗口"
"""

# ASCII only: cmd.exe reads .bat in the OEM code page
WIN_BAT = "\r\n".join([
    "@echo off",
    'set "RIME_ZIP=%~dp0' + FULL + '"',
    'set "WEASEL_EXE=%~dp0' + WEASEL + '"',
    'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"',
    "pause",
    "",
])


def link(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        dst.unlink()
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def build_packages():
    if PKG.exists():
        shutil.rmtree(PKG)
    full = DIST / FULL
    link(DIST / OVERLAY, PKG / "iPhone" / OVERLAY)
    link(INST / TRIME, PKG / "安卓" / "同文输入法.apk")
    link(full, PKG / "安卓" / FULL)
    link(INST / SQUIRREL, PKG / "Mac" / SQUIRREL)
    link(full, PKG / "Mac" / FULL)
    shutil.copy2(ROOT / "app" / "rime" / "install-mac.sh", PKG / "Mac" / "install-mac.sh")
    cmd = PKG / "Mac" / "双击安装输入法.command"
    cmd.write_text(MAC_COMMAND, encoding="utf-8")
    cmd.chmod(0o755)
    link(INST / WEASEL, PKG / "Windows" / WEASEL)
    link(full, PKG / "Windows" / FULL)
    # Windows PowerShell 5.1 reads BOM-less .ps1 as ANSI, which garbles the Chinese messages
    ps1 = (ROOT / "app" / "rime" / "install-windows.ps1").read_text(encoding="utf-8")
    (PKG / "Windows" / "install-windows.ps1").write_text(ps1, encoding="utf-8-sig")
    (PKG / "Windows" / "双击安装输入法.bat").write_bytes(WIN_BAT.encode("ascii"))


def main():
    OUT.mkdir(exist_ok=True)
    build_pages()
    build_packages()
    for p in sorted(OUT.rglob("*")):
        if p.is_file():
            print(p.relative_to(OUT), round(p.stat().st_size / 1e6, 1), "MB")


if __name__ == "__main__":
    main()
