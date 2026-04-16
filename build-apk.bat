@echo off
REM ═══════════════════════════════════════════════════════════
REM   Football Academy APK Builder
REM   Execute this script to build the APK
REM ═══════════════════════════════════════════════════════════

echo.
echo  ╔══════════════════════════════════════╗
echo  ║  ⚽ Football Academy APK Builder     ║
echo  ╚══════════════════════════════════════╝
echo.

REM Set Java
set JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

REM Check Java
java -version 2>nul
if errorlevel 1 (
    echo ❌ Java not found! Install: winget install Microsoft.OpenJDK.17
    pause
    exit /b 1
)

echo ✅ Java OK

REM Step 1: Build web app
echo.
echo 📦 Building web app...
cd /d "%~dp0"
call npx vite build
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)
echo ✅ Web app built

REM Step 2: Sync with Capacitor
echo.
echo 🔄 Syncing with Capacitor...
call npx cap sync android
echo ✅ Synced

REM Step 3: Build APK
echo.
echo 🔨 Building APK (this may take a few minutes)...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo ❌ APK build failed!
    pause
    exit /b 1
)

REM Step 4: Copy APK
echo.
set APK_SRC=app\build\outputs\apk\debug\app-debug.apk
set APK_DEST=..\FootballAcademy.apk
copy /Y "%APK_SRC%" "%APK_DEST%"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║  ✅ APK READY!                       ║
echo  ║  📱 FootballAcademy.apk              ║
echo  ╚══════════════════════════════════════╝
echo.
echo APK location: %~dp0FootballAcademy.apk
echo.

pause
