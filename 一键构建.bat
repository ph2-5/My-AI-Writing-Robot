@echo off
chcp 65001 >nul 2>&1
title AI 写字机器人 - 构建打包

echo ========================================
echo   AI 写字机器人 - 一键构建
echo ========================================
echo.

echo [1/4] 检查环境...
python -c "import docx, numpy, openai, lxml, fontTools" 2>nul
if %errorlevel% neq 0 (
    echo [安装] 安装 Python 依赖...
    pip install -r requirements.txt -q
)

if not exist "node_modules" (
    echo [安装] 安装 Node.js 依赖...
    npm install
)

echo [2/4] 构建前端...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    pause
    exit /b 1
)

echo [3/4] 打包 Electron 应用...
call npm run electron:build:win
if %errorlevel% neq 0 (
    echo [错误] Electron 打包失败
    pause
    exit /b 1
)

echo [4/4] 复制启动脚本到 release 目录...
if exist "release\win-unpacked" (
    copy /y "启动AI写字机器人.bat" "release\win-unpacked\启动AI写字机器人.bat" >nul
    copy /y "启动AI写字机器人.bat" "release\启动AI写字机器人.bat" >nul
)

echo.
echo ========================================
echo   ✅ 构建完成！
echo.
echo   安装包位置: release\AI写字机器人 Setup *.exe
echo   免安装版:   release\win-unpacked\AI写字机器人.exe
echo.
echo   使用方式:
echo   1. 双击 release\启动AI写字机器人.bat
echo   2. 或双击 release\win-unpacked\AI写字机器人.exe
echo ========================================
echo.
pause
