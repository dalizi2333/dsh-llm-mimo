#!/usr/bin/env bash
# ============================================================
#  llm-mimo 桌面版宿主补丁 - 远程一键引导 (bash，适用 Git Bash)
#
#  装载补丁:
#    附加扫描根（HDSL 运行时等）: 在模式后追加目录参数，可多个
#  卸载补丁:
#    curl -fsSL https://cdn.jsdelivr.net/gh/dalizi2333/dsh-llm-mimo@main/patches/remote-patch.sh | bash -s -- uninstall
#  查看状态:
#    curl -fsSL https://cdn.jsdelivr.net/gh/dalizi2333/dsh-llm-mimo@main/patches/remote-patch.sh | bash -s -- status
#
#  原理: 下载 desktop-patch.cjs，用桌面版自带的 Electron 运行时
#  (ELECTRON_RUN_AS_NODE) 执行 —— 目标机器不需要装任何东西。
# ============================================================
set -euo pipefail
command -v chcp.com >/dev/null 2>&1 && chcp.com 65001 >/dev/null 2>&1 || true
MODE="${1:-${DSH_PATCH_MODE:-install}}"
case "$MODE" in install|uninstall|status) ;; *) echo "用法: $0 install|uninstall|status" >&2; exit 2;; esac

LOCALAPPDATA_WIN="${LOCALAPPDATA:-$USERPROFILE/AppData/Local}"
# Git Bash 里 LOCALAPPDATA 是 Windows 形式 (C:\Users\...)，转 POSIX
RES_POSIX=$(cygpath -u "$LOCALAPPDATA_WIN" 2>/dev/null || echo "$LOCALAPPDATA_WIN")
RES="$RES_POSIX/Programs/DeepSeek Harness/resources"
EXE="$RES_POSIX/Programs/DeepSeek Harness/DeepSeek Harness.exe"
EXE_POSIX=$(cygpath -u "$EXE" 2>/dev/null || echo "$EXE")
[ -f "$EXE_POSIX" ] || { echo "[X] 找不到桌面版: $EXE_POSIX" >&2; exit 1; }

TMP="${TMPDIR:-/tmp}/dsh-desktop-patch.cjs"
ok=""
for url in \
  "https://cdn.jsdelivr.net/gh/dalizi2333/dsh-llm-mimo@desktop-patch-0.2.0-rc.1/patches/desktop-patch.cjs" \
  "https://raw.githubusercontent.com/dalizi2333/dsh-llm-mimo/main/patches/desktop-patch.cjs"; do
  if curl -fsSL --max-time 30 -o "$TMP" "$url"; then ok="$url"; break; fi
  echo "    源失败: $url"
done
[ -n "$ok" ] || { echo "[X] 所有下载源都失败（检查网络/代理后重试）" >&2; exit 1; }
echo "[*] 驱动器已下载: $ok"

ELECTRON_RUN_AS_NODE=1 "$EXE_POSIX" --expose-internals "$(cygpath -w "$TMP")" "$MODE" "${@:2}"
