@echo off
chcp 65001 >nul 2>&1
title AI 写字机器人

cd /d "%~dp0"

echo ========================================
echo   AI 写字机器人 - 启动中...
echo ========================================
echo.

set "PYTHON_DIR="
set "PYTHON_CMD="

where python >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
    goto :python_found
)

where py >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py"
    goto :python_found
)

if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    set "PYTHON_DIR=%LOCALAPPDATA%\Programs\Python\Python312"
    goto :python_found
)

if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    set "PYTHON_DIR=%LOCALAPPDATA%\Programs\Python\Python311"
    goto :python_found
)

if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    set "PYTHON_DIR=%LOCALAPPDATA%\Programs\Python\Python310"
    goto :python_found
)

echo [错误] 未找到 Python！
echo.
echo 请安装 Python 3.10+ 并勾选 "Add Python to PATH"
echo 下载地址: https://www.python.org/downloads/
echo.
pause
exit /b 1

:python_found
echo [OK] Python: %PYTHON_CMD%

if defined PYTHON_DIR (
    set "PATH=%PYTHON_DIR%;%PYTHON_DIR%\Scripts;%PATH%"
)

echo [1/3] 检查 Python 依赖...
%PYTHON_CMD% -c "import docx, numpy, openai, lxml, fontTools" 2>nul
if %errorlevel% neq 0 (
    echo [安装] 正在安装缺失的 Python 依赖...
    %PYTHON_CMD% -m pip install -r requirements.txt -q
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请手动运行:
        echo        %PYTHON_CMD% -m pip install -r requirements.txt
        pause
        exit /b 1
    )
)
echo       依赖检查通过

set "NPM_CMD="
set "NODE_DIR="

where npm >nul 2>&1
if %errorlevel% equ 0 (
    set "NPM_CMD=npm"
    goto :npm_found
)

if exist "%ProgramFiles%\nodejs\npm.cmd" (
    set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
    set "NODE_DIR=%ProgramFiles%\nodejs"
    goto :npm_found
)

echo [错误] 未找到 Node.js！
echo.
echo 请安装 Node.js 18+
echo 下载地址: https://nodejs.org/
echo.
pause
exit /b 1

:npm_found
echo [OK] Node.js: %NPM_CMD%

if defined NODE_DIR (
    set "PATH=%NODE_DIR%;%PATH%"
)

echo [2/3] 检查 Node.js 依赖...
if not exist "node_modules" (
    echo [安装] 正在安装 Node.js 依赖...
    %NPM_CMD% install
    if %errorlevel% neq 0 (
        echo [错误] npm install 失败
        pause
        exit /b 1
    )
) else (
    echo       依赖已就绪
)

echo [3/3] 启动应用...
echo.
echo ========================================
echo   应用启动中，请稍候...
echo   首次启动可能需要 10-20 秒
echo ========================================
echo.

set NODE_ENV=development
%NPM_CMD% run electron:dev
