@echo off
REM Tech Warzone 2026 Backend — Quick Start Script (Windows)

setlocal enabledelayedexpansion

echo.
echo === Tech Warzone 2026 Backend Setup ===
echo.

REM Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
  echo Error: Node.js not found. Install from https://nodejs.org
  pause
  exit /b 1
)
echo ✓ Node.js version:
node -v

REM Check Firebase CLI
firebase --version >nul 2>&1
if errorlevel 1 (
  echo.
  echo Firebase CLI not found. Installing...
  npm install -g firebase-tools
)

echo ✓ Firebase CLI installed
echo.
echo What would you like to do?
echo 1. Setup local development (emulator^)
echo 2. Deploy to Firebase
echo 3. Install dependencies only
echo.

set /p choice=Enter choice (1-3^): 

if "%choice%"=="1" (
  echo.
  echo Setting up local development...
  cd functions
  call npm install
  cd ..
  echo ✓ Dependencies installed
  echo Starting Firebase emulators...
  call firebase emulators:start
) else if "%choice%"=="2" (
  echo.
  echo Preparing for Firebase deployment...
  call firebase login
  call firebase use --add
  cd functions
  call npm install
  cd ..
  echo ✓ Dependencies installed
  echo Ready to deploy. Run:
  echo   firebase deploy --only functions,firestore:rules,firestore:indexes
) else if "%choice%"=="3" (
  echo.
  echo Installing dependencies...
  cd functions
  call npm install
  cd ..
  echo ✓ Dependencies installed
  echo Run 'firebase emulators:start' to start local development
) else (
  echo Invalid choice
  exit /b 1
)

echo.
echo Setup complete!
pause
