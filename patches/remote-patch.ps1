# ============================================================
#  llm-mimo 桌面版宿主补丁 - 远程一键引导 (pwsh / Windows PowerShell)
#
#  装载补丁:
#    irm https://cdn.jsdelivr.net/gh/dalizi2333/dsh-llm-mimo@main/patches/remote-patch.ps1 | iex
#  卸载补丁:
#    $env:DSH_PATCH_MODE="uninstall"; irm https://cdn.jsdelivr.net/gh/dalizi2333/dsh-llm-mimo@main/patches/remote-patch.ps1 | iex; Remove-Item Env:\DSH_PATCH_MODE
#  查看状态:
#    $env:DSH_PATCH_MODE="status"; irm https://cdn.jsdelivr.net/gh/dalizi2333/dsh-llm-mimo@main/patches/remote-patch.ps1 | iex; Remove-Item Env:\DSH_PATCH_MODE
#
#  原理: 下载 desktop-patch.cjs 到临时目录，用桌面版自带的 Electron
#  运行时(RunAsNode)执行 —— 目标机器不需要装任何东西。
# ============================================================
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Mode = if ($env:DSH_PATCH_MODE) { $env:DSH_PATCH_MODE } else { "install" }
if ($Mode -notin @("install", "uninstall", "status")) { Write-Error "DSH_PATCH_MODE 必须是 install/uninstall/status" }

$resources = Join-Path $env:LOCALAPPDATA "Programs\DeepSeek Harness\resources"
$exe = Join-Path $resources "..\DeepSeek Harness.exe"
if (-not (Test-Path $exe)) { Write-Error "找不到桌面版: $exe （如装在别处请手动改造本脚本）" }

$sources = @(
  "https://cdn.jsdelivr.net/gh/dalizi2333/dsh-llm-mimo@desktop-patch-0.2.0-rc.1/patches/desktop-patch.cjs",
  "https://raw.githubusercontent.com/dalizi2333/dsh-llm-mimo/main/patches/desktop-patch.cjs"
)
$tmp = Join-Path $env:TEMP "dsh-desktop-patch.cjs"
$downloaded = $false
foreach ($url in $sources) {
  try {
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 30
    $downloaded = $true
    Write-Host "[*] 驱动器已下载: $url"
    break
  } catch {
    Write-Host "    源失败: $($_.Exception.Message)"
  }
}
if (-not $downloaded) { Write-Error "所有下载源都失败了（检查网络/代理后重试）" }

$env:ELECTRON_RUN_AS_NODE = "1"
$roots = if ($env:DSH_PATCH_ROOTS) { $env:DSH_PATCH_ROOTS.Split(";") | Where-Object { $_ } } else { @() }
& $exe --expose-internals $tmp $Mode @roots
$code = $LASTEXITCODE
Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
if ($code -ne 0) { exit $code }
if ($Mode -eq "install") {
  Write-Host ""
  Write-Host "下一步: 启动桌面版 -> 插件页 -> 添加插件 -> 粘贴 llm-mimo 仓库路径 -> 启用 -> 重启"
}
