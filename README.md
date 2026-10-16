# 打字学英语

打中文的同时学英语。手机、电脑都能用，可以加到主屏幕当 App，没网也能打开。

## 每天怎么用（10～15 分钟）

1. **打字**：用平时的中文输入法写 3～5 句今天想说的话。每个词下面马上出现英文，再出整句英文。点「跟打一遍」照着打出来，里面的单词自动进词本。
2. **复习**：把今天到期的词做完。新词照着打，学过的词听写，熟词看英文想中文。
3. **入门**（零基础先多花时间在这）：
   - 字母和发音：26 个字母的读音、在单词里常发的音
   - 核心词：按初中 → 高中 → 四级分 3 级，每组 10 个
   - 常用句：打招呼、点餐、问路、健身训练、工作等 9 个场景，人工写好的地道说法

## 手机电脑同步

进度存在你自己 GitHub 账号下的一个私密 Gist 里。

1. 在一台设备上打开「我的 → 手机电脑同步」，按提示去 GitHub 生成一个只勾 `gist` 权限的令牌，粘贴后点「连接」。
2. 点「给手机/另一台电脑配对」，用手机相机扫二维码，就自动连好了。

## 输入法版

不想每次打开网页？把系统输入法换成 Rime（雾凇拼音），平时打字候选词就带英文：`苹果〔apple〕`。
安装步骤（iPhone / 安卓 / Mac / Windows）：<https://jiazhenhuang0518.github.io/english-typing/rime/>

## 开发

```bash
npm test                 # 逻辑单测（node --test）
npm run serve            # 本地预览 http://localhost:8765
python3 tools/build_data.py     # 重新生成词典数据（需要 tools/raw/ 里的原始词典）
python3 tools/stamp_version.py  # 发布前必跑：更新离线缓存版本号，手机才会拿到新版
```

原始词典下载：

- ECDICT：`https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv` → `tools/raw/ecdict.csv`
- CC-CEDICT：`https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz` → 解压成 `tools/raw/cedict.txt`

## 数据来源与许可

- [ECDICT](https://github.com/skywind3000/ECDICT)（MIT）：英文单词、音标、中文释义、考试分级
- [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict)（CC BY-SA 4.0）：中文→英文词典。`app/data/zh2en.json` 由它整理而来，同样按 CC BY-SA 4.0 发布
- [雾凇拼音 rime-ice](https://github.com/iDvel/rime-ice)（GPL-3.0）：输入法版的词库和配置，完整包里原样附带它的 LICENSE
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)（MIT）：配对二维码
