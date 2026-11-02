@echo off
title INSTALAR INICIO AUTOMATICO - GUARDIAN FISCAL BRIDGE
color 0a
echo ======================================================================
echo    INSTALADOR DE INICIO AUTOMATICO - GUARDIAN FISCAL BRIDGE
echo ======================================================================
echo.
echo Configurando para que el agente fiscal arranque automaticamente
echo al encender la computadora, de forma 100%% invisible en segundo plano...
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET_VBS=%~dp0iniciar-invisible.vbs"
set "SHORTCUT=%STARTUP_FOLDER%\GuardianFiscalBridge.lnk"

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%TARGET_VBS%\"'; $s.WorkingDirectory = '%~dp0'; $s.Save()"

if exist "%SHORTCUT%" (
    echo [EXITO] Acceso directo de inicio automatico creado correctamente:
    echo "%SHORTCUT%"
    echo.
    echo Iniciando el agente fiscal AHORA MISMO en segundo plano...
    taskkill /F /IM guardian_fiscal_bridge.exe >nul 2>&1
    start "" wscript.exe "%TARGET_VBS%"
    timeout /t 2 /nobreak >nul
    echo.
    echo [OK] El servicio fiscal ya esta ACTIVO y escuchando en http://localhost:9095.
    echo A partir de ahora, cada vez que enciendas la PC arrancara automaticamente.
    echo Ya puedes abrir Google Chrome en Guardian y facturar.
) else (
    echo [ERROR] No se pudo crear el acceso directo en Startup.
    echo Iniciando servicio de forma directa...
    start "" wscript.exe "%TARGET_VBS%"
)

echo.
echo Presiona cualquier tecla para salir...
pause >nul
