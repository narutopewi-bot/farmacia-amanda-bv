@echo off
title Instalador Caja Principal - Farmacia Amanda
color 0A

echo =========================================================================
echo       INSTALADOR CAJA PRINCIPAL OFFLINE - FARMACIA AMANDA B Y V
echo =========================================================================
echo.

cd /d "%~dp0backend"

echo [Paso 1 de 4] Verificando instalacion de Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Node.js no esta instalado en este equipo.
    echo Descargando e iniciando instalador oficial de Node.js...
    powershell -NoProfile -Command "Start-Process 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi'"
    echo.
    echo Una vez completada la instalacion de Node.js, presiona una tecla.
    pause
)
echo      [OK] Node.js detectado.
echo.

echo [Paso 2 de 4] Verificando librerias del sistema...
if not exist "%~dp0backend\node_modules" (
    echo      Instalando dependencias necesarias...
    call npm install --omit=dev
)
echo      [OK] Librerias listas.
echo.

echo [Paso 3 de 4] Descargando catalogo e inventario en vivo desde Railway...
call node scripts/sync-local.js --initial
echo      [OK] Inventario y medicamentos sincronizados localmente.
echo.

echo [Paso 4 de 4] Creando acceso directo en el Escritorio...
cscript //nologo "%~dp0backend\scripts\create-shortcut.vbs" "%~dp0INICIAR_CAJA_PRINCIPAL.bat" "%~dp0"
echo      [OK] Acceso directo Farmacia Amanda - CAJA PRINCIPAL creado en el Escritorio.
echo.

echo =========================================================================
echo  INSTALACION Y CONFIGURACION COMPLETADA CON EXITO!
echo =========================================================================
echo  1. NO necesitas tener Python ni programas adicionales.
echo  2. En tu Escritorio tienes el acceso: Farmacia Amanda - CAJA PRINCIPAL
echo  3. Para probar que funciona sin internet, desconecta el cable o Wi-Fi,
echo     abre el acceso directo del escritorio y el sistema abrira de inmediato.
echo =========================================================================
echo.
pause
