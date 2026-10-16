# 打字学英语 · Windows 一键安装：小狼毫(Weasel) + 雾凇拼音 + 候选词英文注释
# 用法：右键「开始」→ 终端(PowerShell)，粘贴安装说明页上的那一行命令。
# 那行命令按 UTF-8 解码本文件（PowerShell 5.1 默认不按 UTF-8，中文提示会乱码）。
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ZipUrl  = "https://github.com/jiazhenhuang0518/english-typing/releases/latest/download/rime-ice-english-full.zip"
$WeaselUrl = "https://github.com/rime/weasel/releases/download/0.17.4/weasel-0.17.4.0-installer.exe"
$RimeDir = Join-Path $env:APPDATA "Rime"
# 「双击安装输入法.bat」会把同一文件夹里的安装包路径放进这两个环境变量，就不用联网下载
$LocalZip = $env:RIME_ZIP
$LocalWeasel = $env:WEASEL_EXE

function Find-WeaselRoot {
  foreach ($k in "HKLM:\SOFTWARE\WOW6432Node\Rime\Weasel", "HKLM:\SOFTWARE\Rime\Weasel") {
    $v = (Get-ItemProperty -Path $k -ErrorAction SilentlyContinue).WeaselRoot
    if ($v -and (Test-Path $v)) { return $v }
  }
  return $null
}

$root = Find-WeaselRoot
if (-not $root) {
  Write-Host "`n第 1 步：下载并安装小狼毫（弹出安装窗口时一路「下一步」）" -ForegroundColor Cyan
  if ($LocalWeasel -and (Test-Path $LocalWeasel)) { $exe = $LocalWeasel } else {
    $exe = Join-Path $env:TEMP "weasel-installer.exe"
    Invoke-WebRequest -Uri $WeaselUrl -OutFile $exe -UseBasicParsing
  }
  Start-Process -FilePath $exe -Wait
  $root = Find-WeaselRoot
  if (-not $root) { Write-Host "没检测到小狼毫，装好后再运行一次本脚本。" -ForegroundColor Red; return }
} else {
  Write-Host "`n第 1 步：小狼毫已安装，跳过" -ForegroundColor Cyan
}

Write-Host "`n第 2 步：放入雾凇拼音 + 英文注释配置" -ForegroundColor Cyan
if ($LocalZip -and (Test-Path $LocalZip)) { $zip = $LocalZip } else {
  $zip = Join-Path $env:TEMP "rime-ice-english-full.zip"
  Invoke-WebRequest -Uri $ZipUrl -OutFile $zip -UseBasicParsing
}
if ((Test-Path $RimeDir) -and (Get-ChildItem $RimeDir -Force | Select-Object -First 1)) {
  $bak = "$RimeDir.bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
  Move-Item $RimeDir $bak
  Write-Host "原来的配置已备份到：$bak"
}
New-Item -ItemType Directory -Force -Path $RimeDir | Out-Null
Expand-Archive -Path $zip -DestinationPath $RimeDir -Force

Write-Host "`n第 3 步：部署（第一次要 1 分钟左右）" -ForegroundColor Cyan
Start-Process -FilePath (Join-Path $root "WeaselDeployer.exe") -ArgumentList "/deploy" -Wait

Write-Host @"

装好了。按 Win+空格 切到「小狼毫」，打 pingguo，候选会显示「苹果〔apple〕」。
开关英文注释：打字时按 Ctrl+`（数字 1 左边那个键）或 F4 → 选「英文」/「无英」。
"@ -ForegroundColor Green
