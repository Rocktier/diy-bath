# 浴室柜画图工具 —— 启动器
#
# 单独写这个文件是因为两个 cmd 解决不了的坑：
#   1. 项目路径里有中文时，file:// URL 必须百分号编码，否则 Edge 的 --app 参数会被忽略，
#      表现为"双击没反应"（其实进程起来了，窗口开成新标签页）
#   2. 全新 profile 会触发 Edge 首次运行流程，同样把 --app 窗口顶掉，
#      必须加 --no-first-run
#
# run.bat 只负责找到 PowerShell 并调用本文件。

$ErrorActionPreference = 'Stop'

$index = Join-Path $PSScriptRoot 'index.html'
if (-not (Test-Path -LiteralPath $index)) {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    [System.Windows.Forms.MessageBox]::Show(
        "找不到 index.html：$index`n请确认 run.bat 和 index.html 在同一个文件夹里。",
        '浴室柜画图工具', 'OK', 'Error') | Out-Null
    exit 1
}

# ---- 找 Edge ----
$candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
    "${env:LocalAppData}\Microsoft\Edge\Application\msedge.exe"
)
$edge = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

if (-not $edge) {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    [System.Windows.Forms.MessageBox]::Show(
        '本机找不到 Microsoft Edge。`n请先安装 Edge，或直接双击 index.html 用浏览器打开。',
        '浴室柜画图工具', 'OK', 'Error') | Out-Null
    exit 1
}

# ---- 拼 URL，交给 .NET 做百分号编码（非 ASCII 路径的关键）----
$url = ([System.Uri]$index).AbsoluteUri

# ---- 独立 profile，避免干扰用户日常用的 Edge ----
$profileDir = Join-Path $env:TEMP 'diy-bath-profile'

$argList = @(
    "--app=$url"
    "--user-data-dir=$profileDir"
    '--no-first-run'
    '--no-default-browser-check'
    '--window-size=1680,1000'
)

Start-Process -FilePath $edge -ArgumentList $argList
exit 0