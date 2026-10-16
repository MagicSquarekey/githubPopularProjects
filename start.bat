@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

cd /d "%~dp0"

REM ============================================
REM  githubPopularProjects 一键启动 (Windows)
REM  One-click launcher for Windows
REM ============================================

REM Ensure a writable temp folder (fallback if system TEMP is unavailable)
if not defined TEMP set "TEMP=%USERPROFILE%\AppData\Local\Temp"

echo ============================================
echo   githubPopularProjects
echo   Starting, please wait...
echo ============================================
echo.

REM --- Check Node.js ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 20 or newer from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM --- Install dependencies on first run ---
if not exist "node_modules" (
    echo First run detected. Installing dependencies, this may take a few minutes...
    echo ^(detected first run, installing dependencies...^)
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies. Check your network and try again.
        echo.
        pause
        exit /b 1
    )
)

echo Opening http://localhost:3000 ...
start "" http://localhost:3000

echo.
echo Server is running. Press Ctrl+C in this window to stop.
echo ============================================
echo.

REM Run production server by default; fall back to dev mode if needed
call npm start
if errorlevel 1 (
    echo.
    echo [WARN] Production server failed to start. Falling back to development mode...
    echo.
    call npm run dev
)

pause
