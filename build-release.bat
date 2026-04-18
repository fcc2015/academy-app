@echo off
REM ═══════════════════════════════════════════════════════════════════
REM   Football Academy — Release AAB Builder (Google Play Store)
REM
REM   Prerequisites:
REM   1. Copy android/keystore.properties.example → android/keystore.properties
REM   2. Fill in your keystore credentials
REM   3. Run this script
REM ═══════════════════════════════════════════════════════════════════

echo.
echo  ╔════════════════════════════════════════════╗
echo  ║  ⚽ Football Academy — Release Builder     ║
echo  ╚════════════════════════════════════════════╝
echo.

REM Set Java (update path if needed)
set JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

REM Check Java
java -version 2>nul
if errorlevel 1 (
    echo ❌ Java not found! Install: winget install Microsoft.OpenJDK.21
    pause & exit /b 1
)
echo ✅ Java OK

REM Check keystore.properties exists
if not exist "android\keystore.properties" (
    echo.
    echo ❌ android\keystore.properties not found!
    echo    Copy android\keystore.properties.example and fill in your credentials.
    echo.
    pause & exit /b 1
)
echo ✅ Keystore config found

REM ── Step 1: Build web assets ─────────────────────────────────────
echo.
echo 📦 Building web app...
cd /d "%~dp0"
call npx vite build
if errorlevel 1 ( echo ❌ Vite build failed! & pause & exit /b 1 )
echo ✅ Web app built

REM ── Step 2: Sync Capacitor ───────────────────────────────────────
echo.
echo 🔄 Syncing Capacitor...
call npx cap sync android
echo ✅ Synced

REM ── Step 3: Build release AAB (Play Store format) ────────────────
echo.
echo 🔨 Building release AAB...
cd android
call gradlew.bat bundleRelease
if errorlevel 1 ( echo ❌ AAB build failed! & pause & exit /b 1 )

REM ── Step 4: Copy AAB to project root ─────────────────────────────
echo.
set AAB_SRC=app\build\outputs\bundle\release\app-release.aab
set AAB_DEST=..\FootballAcademy-release.aab
copy /Y "%AAB_SRC%" "%AAB_DEST%"
if errorlevel 1 ( echo ⚠️  Could not copy AAB — check path above & pause & exit /b 1 )

REM ── Done ─────────────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║  ✅ RELEASE AAB READY FOR GOOGLE PLAY!       ║
echo  ║  📦 FootballAcademy-release.aab              ║
echo  ╚══════════════════════════════════════════════╝
echo.
echo Upload FootballAcademy-release.aab to:
echo   Google Play Console → Your App → Release → Production
echo.
pause
