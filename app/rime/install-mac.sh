#!/bin/bash
# 打字学英语 · Mac 一键安装：鼠须管(Squirrel) + 雾凇拼音 + 候选词英文注释
# 用法：bash install-mac.sh            （从 GitHub 下载配置包）
#       bash install-mac.sh 本地.zip    （用本地配置包）
set -euo pipefail

ZIP_URL="https://github.com/jiazhenhuang0518/english-typing/releases/latest/download/rime-ice-english-full.zip"
RIME_DIR="$HOME/Library/Rime"
SQUIRREL="/Library/Input Methods/Squirrel.app"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

if [ ! -d "$SQUIRREL" ]; then
  say "第 1 步：安装鼠须管（会要你输入开机密码，输入时屏幕不显示，正常）"
  if command -v brew >/dev/null; then
    brew install --cask squirrel-app
  else
    say "没装 Homebrew。请到 https://rime.im/download/ 下载鼠须管安装后，再运行一次本脚本。"
    exit 1
  fi
else
  say "第 1 步：鼠须管已安装，跳过"
fi

say "第 2 步：放入雾凇拼音 + 英文注释配置"
TMP=$(mktemp -d)
if [ "${1:-}" != "" ]; then
  cp "$1" "$TMP/pack.zip"
else
  curl -fL --retry 3 -o "$TMP/pack.zip" "$ZIP_URL"
fi
if [ -d "$RIME_DIR" ] && [ "$(ls -A "$RIME_DIR")" ]; then
  BAK="$RIME_DIR.bak-$(date +%Y%m%d-%H%M%S)"
  mv "$RIME_DIR" "$BAK"
  echo "原来的配置已备份到：$BAK"
fi
mkdir -p "$RIME_DIR"
ditto -x -k "$TMP/pack.zip" "$RIME_DIR"
rm -rf "$TMP"

say "第 3 步：部署（第一次要 1 分钟左右）"
if [ -x "$SQUIRREL/Contents/MacOS/Squirrel" ]; then
  "$SQUIRREL/Contents/MacOS/Squirrel" --reload || true
fi

cat <<'EOF'

装好了。还差一步手动操作：
  系统设置 → 键盘 → 文字输入「编辑…」→ 左下角 + → 简体中文 → 鼠须管 → 添加
  （如果列表里找不到鼠须管：注销重新登录一次再找）

用法：切到鼠须管，打 pingguo，候选会显示「苹果〔apple〕」。
开关英文注释：打字时按 Ctrl+` （数字 1 左边那个键）→ 选「英文」/「无英」。
EOF
