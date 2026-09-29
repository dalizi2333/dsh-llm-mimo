@echo off
rem ============================================================
rem  llm-mimo desktop host patch - one-click installer
rem  Double-click, or: install-desktop-host-patch.cmd [resourcesDir]
rem  Target: DeepSeek Harness desktop 0.2.0-rc.1 (win-x64)
rem  Effect: extract app.asar -> swap two host files -> place as
rem          resources\app (dir wins over asar; original renamed)
rem  Uninstall: delete resources\app, rename app.asar.unpatched
rem             back to app.asar.
rem ============================================================
setlocal
chcp 65001 >nul
set "RES=%LOCALAPPDATA%\Programs\DeepSeek Harness\resources"
if not "%~1"=="" set "RES=%~1"

if not exist "%RES%\app.asar" (
  echo [X] app.asar not found at: %RES%
  echo     If installed elsewhere, pass the resources dir as argument 1.
  pause
  exit /b 1
)
if exist "%RES%\app" (
  echo [=] Already patched ^(resources\app exists^). Nothing to do.
  pause
  exit /b 0
)

echo [*] Closing running DeepSeek Harness ...
taskkill /IM "DeepSeek Harness.exe" /F >nul 2>&1
ping -n 3 127.0.0.1 >nul

set "EXE=%RES%\..\DeepSeek Harness.exe"
set "ELECTRON_RUN_AS_NODE=1"
echo [*] Extracting and swapping host files (about 30s) ...
"%EXE%" --expose-internals "%~dp0install-desktop-extract.mjs" "%RES%" "%~dp0desktop-0.2.0-rc.1"
if errorlevel 1 (
  echo [X] Patch failed. Your installation was NOT modified.
  pause
  exit /b 1
)

echo [*] Placing resources\app ...
ren "%RES%\app.asar" "app.asar.unpatched"
robocopy "%TEMP%\dsh-host-patch-extract" "%RES%\app" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo [X] Placement failed, restoring asar name ...
  ren "%RES%\app.asar.unpatched" "app.asar"
  pause
  exit /b 1
)
rd /s /q "%TEMP%\dsh-host-patch-extract"

echo.
echo [OK] Patch applied. Start DeepSeek Harness:
echo      - Settings - Models shows the MiMo card
echo      - Add provider dialog gains the 3rd tab (llm-mimo)
echo NOTE: re-run this script after a desktop app update
echo       (a new asar is installed but resources\app shadows it).
pause
