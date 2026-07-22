@echo off
echo.
echo ============================================
echo   RESETTING YUBIKEY WORD SEARCH GAME
echo ============================================
echo.
echo Step 1: Generating new game...
call npm run generate-game
echo.
echo Step 2: Finding and stopping server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing PID %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo.
echo Step 3: Starting server...
start cmd /k npm run dev
echo.
echo ============================================
echo   GAME RESET COMPLETE!
echo ============================================
echo.
echo Next steps:
echo 1. Hard refresh your browser (Ctrl+Shift+R)
echo 2. You should see a fresh game with no claims
echo.
pause
