@echo off
rem ============================================================
rem  Bathroom Vanity Drawer - launcher
rem
rem  Rules for this file, learned the hard way:
rem    - ASCII only, NO UTF-8 BOM, CRLF line endings.
rem      cmd reads .bat in the ANSI code page; a BOM breaks the very
rem      first line and non-ASCII comments get mangled.
rem    - No "pause" anywhere. A pause on a branch that can be taken
rem      by accident hangs the window forever with no explanation.
rem      Error messages go through launch.ps1 as a MessageBox.
rem    - No "for" loops. "if not defined" inside a parenthesised
rem      block is evaluated at parse time and silently takes the
rem      wrong branch, which is how the old launcher got stuck.
rem
rem  All real work lives in launch.ps1: percent-encoding a file://
rem  URL that contains Chinese characters, and --no-first-run for a
rem  fresh Edge profile. cmd can do neither. Getting either wrong
rem  looks identical from outside: double-click, nothing happens.
rem ============================================================

start "" "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0launch.ps1"
exit /b 0