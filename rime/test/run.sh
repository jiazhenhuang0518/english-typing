#!/bin/sh
# 本机实测：解压完整包 → 部署 → 模拟打字。需要 brew install librime
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
RIME=$(brew --prefix librime)
WORK=${TMPDIR:-/tmp}/rime-english-test
rm -rf "$WORK" && mkdir -p "$WORK/user"
cc -o "$WORK/harness" "$ROOT/rime/test/harness.c" -I"$RIME/include" -L"$RIME/lib" -lrime
(cd "$WORK/user" && unzip -q "$ROOT/dist/rime/rime-ice-english-full.zip")
"$RIME/bin/rime_deployer" --build "$WORK/user" "$WORK/user" "$WORK/user/build" >/dev/null 2>&1
"$WORK/harness" "$WORK/user" "${@:-pingguo}"
