@echo off
title Instalador Caja Principal - Farmacia Amanda
color 0A

echo =========================================================================
echo       INSTALADOR CAJA PRINCIPAL OFFLINE - FARMACIA AMANDA B&V
echo =========================================================================
echo.

cd /d "%~dp0backend"

echo [Paso 1 de 3] Verificando instalacion de Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en esta computadora.
    echo Descargalo e instalalo desde: https://nodejs.org
    pause
    exit /b
)
echo      [OK] Node.js detectado.
echo.

echo [Paso 2 de 3] Descargando catalogo e inventario inicial desde la nube...
call node scripts/sync-local.js --initial
echo      [OK] Inventario y medicamentos sincronizados localmente.
echo.

echo [Paso 3 de 3] Creando acceso directo en el Escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut("$([Environment]::GetFolderPath('Desktop'))\Farmacia Amanda - CAJA PRINCIPAL.lnk"); $s.TargetPath = '%~dp0INICIAR_CAJA_PRINCIPAL.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = 'shell32.dll,43'; $s.Description = 'Expendio de Medicinas Amanda B&V - Caja Principal Offline'; $s.Save()"
echo      [OK] Acceso directo 'Farmacia Amanda - CAJA PRINCIPAL' creado en el Escritorio.
echo.

echo =========================================================================
echo  INSTALACION Y CONFIGURACION COMPLETADA CON EXITO!
echo =========================================================================
echo  1. Ya puedes cerrar esta ventana.
echo  2. En tu Escritorio encontraras el acceso: 'Farmacia Amanda - CAJA PRINCIPAL'
echo  3. Para probar que funciona sin internet, desconecta el cable o Wi-Fi,
echo     abre el acceso directo del escritorio y veras el sistema funcionando
echo     al 100%% con todos los medicamentos y facturacion habilitada.
echo =========================================================================
echo.
pause
