@echo off
setlocal

set "NODEJS_DIR=C:\Program Files\nodejs"
set "PATH=%NODEJS_DIR%;%PATH%"
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
set "ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"

cd /d "%~dp0.."

if not exist "%NODEJS_DIR%\node.exe" (
  echo Node.js not found at "%NODEJS_DIR%\node.exe".
  echo Please install Node.js LTS first.
  exit /b 1
)

if not exist node_modules (
  call "%NODEJS_DIR%\npm.cmd" install
  if errorlevel 1 exit /b 1
)

call "%NODEJS_DIR%\npm.cmd" run build
if errorlevel 1 exit /b 1

call "%cd%\node_modules\.bin\electron-builder.cmd" --win portable
if errorlevel 1 exit /b 1

echo.
echo Portable build finished. Check the release folder:
echo %cd%\release
