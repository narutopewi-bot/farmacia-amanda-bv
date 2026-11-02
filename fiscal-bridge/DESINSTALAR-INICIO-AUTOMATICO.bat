@echo off
title DESINSTALAR INICIO AUTOMATICO - GUARDIAN FISCAL BRIDGE
color 0c
echo ======================================================================
echo    DESINSTALAR INICIO AUTOMATICO - GUARDIAN FISCAL BRIDGE
echo ======================================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_FOLDER%\GuardianFiscalBridge.lnk"

if exist "%SHORTCUT%" (
    del "%SHORTCUT%"
    echo [EXITO] Inicio automatico eliminado.
) else (
    echo [INFO] No habia ningun inicio automatico configurado.
)

echo.
pause
