@echo off
setlocal

rem ---------------------------------------------------------------------------
rem  FAST - run the app locally (backend + frontend together)
rem
rem  Double-click this file, or run it from a terminal:  start-local.bat
rem
rem  Backend  : http://localhost:10301   (Express + MongoDB)
rem  Frontend : http://localhost:10300   (Vite dev server - open this in a browser)
rem
rem  Stop both servers with Ctrl+C in this window.
rem ---------------------------------------------------------------------------

rem Always run from the folder this file is in, no matter how it was launched.
cd /d "%~dp0"

echo.
echo ===============================================
echo   FAST - Field Assistant System (local)
echo ===============================================
echo.

rem --- Node.js is required for everything below ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on this machine.
    echo         Install it from https://nodejs.org, then run this file again.
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo   Node.js %NODE_VERSION%

rem --- .env holds MONGODB_URI and JWT_SECRET; the backend refuses to start without it ---
if not exist ".env" (
    echo.
    echo [ERROR] .env file not found.
    echo         Copy the example and fill in the values:  copy .env.example .env
    echo.
    pause
    exit /b 1
)
echo   .env found

rem --- Install dependencies automatically on first run (or after deleting node_modules) ---
if not exist "node_modules" (
    echo.
    echo   Backend node_modules missing - installing now, this can take a while...
    call npm install
    if errorlevel 1 goto install_failed
)

if not exist "frontend\node_modules" (
    echo.
    echo   Frontend node_modules missing - installing now, this can take a while...
    call npm --prefix frontend install
    if errorlevel 1 goto install_failed
)

echo.
echo   Backend  : http://localhost:10301
echo   Frontend : http://localhost:10300   ^<- open this one in your browser
echo.
echo   Press Ctrl+C in this window to stop both servers.
echo -----------------------------------------------
echo.

rem `npm run dev` uses concurrently to run backend and frontend together in this window.
call npm run dev

rem If we get here, the servers stopped - keep the window open so errors stay visible.
echo.
echo -----------------------------------------------
echo   Servers stopped.
echo.
pause
exit /b 0

:install_failed
echo.
echo [ERROR] Dependency install failed - see the messages above for details.
echo.
pause
exit /b 1
