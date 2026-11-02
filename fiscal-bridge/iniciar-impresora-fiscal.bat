@echo off
cd /d "%~dp0"
title GUARDIAN FISCAL BRIDGE - ACLAS PP9 PLUS / DEVTECH DTP-80i (SENIAT)
color 0b
echo ======================================================================
echo    GUARDIAN FISCAL BRIDGE - ACLAS PP9 PLUS / DEVTECH DTP-80i (SENIAT)
echo ======================================================================
echo.
echo Iniciando agente de comunicacion fiscal en puerto 9095...
echo Compatible con The Factory HKA (ACLAS PP9 Plus) y Corporacion ECRS (DEVTECH DTP-80i).
echo.

taskkill /F /IM guardian_fiscal_bridge.exe >nul 2>&1

if exist "%~dp0guardian_fiscal_bridge.exe" (
    echo [OK] Ejecutando binario nativo independiente (CERO dependencias de Python)...
    "%~dp0guardian_fiscal_bridge.exe"
    goto FIN
)

echo [INFO] Ejecutando mediante script Python...
python "%~dp0guardian_fiscal_bridge.py"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [AVISO] Python no esta disponible. Intentando con servidor portable...
    if exist "%~dp0node.exe" (
        "%~dp0node.exe" "%~dp0server.js"
    )
)

:FIN
pause
