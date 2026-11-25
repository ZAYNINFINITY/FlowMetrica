@echo off
setlocal
rem Use the real Windows PowerShell; bypass policy only for this local script.
set "FM_PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%FM_PS%" set "FM_PS=powershell.exe"
pushd "%~dp0"
"%FM_PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\flowmetrica-control.ps1" %*
set "FM_EXIT=%ERRORLEVEL%"
popd
endlocal & exit /b %FM_EXIT%
