@echo off
rem 浴室柜画图工具 —— 双击即开独立窗口（无地址栏、无标签页）
rem 用 Windows 自带的 Edge 的 --app 模式，不需要安装任何东西。
setlocal
set "ROOT=%~dp0"
set "URL=file:///%ROOT%index.html"
set "URL=%URL:\=/%"

set "EDGE="
for %%P in (
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  "%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
) do (
  if not defined EDGE if exist %%~P set "EDGE=%%~P"
)

if not defined EDGE (
  echo.
  echo   找不到 Microsoft Edge。
  echo   请先安装 Edge，或直接双击 index.html 用浏览器打开。
  echo.
  pause
  exit /b 1
)

rem 固定的 user-data-dir，这样反复双击不会每次新建一份配置
start "" "%EDGE%" --app="%URL%" --window-size=1680,1000 --user-data-dir="%TEMP%\diy-bath-profile"
exit /b 0