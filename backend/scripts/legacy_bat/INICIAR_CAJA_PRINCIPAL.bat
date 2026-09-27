@echo off
title Farmacia Amanda - CAJA PRINCIPAL
color 0A

echo =========================================================================
echo       EXPENDIO DE MEDICINAS AMANDA B&V C.A. - CAJA PRINCIPAL
echo            Sistema Local Offline y Facturacion Continua
echo =========================================================================
echo.

cd /d "%~dp0backend"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este equipo.
    echo Por favor ejecuta primero: INSTALAR_CAJA_PRINCIPAL.bat
    pause
    exit /b
)

echo [1/3] Verificando sincronizacion con la nube (si hay internet)...
call node scripts/sync-local.js --initial

echo [2/3] Iniciando Servidor Local de la Caja Principal en puerto 5000...
netstat -ano | findstr :5000 >nul 2>nul
if %errorlevel% neq 0 (
    start "Servidor Local Farmacia Amanda" /min node src/server.js
    timeout /t 3 /nobreak > nul
) else (
    echo      (El servidor local ya se encuentra activo en segundo plano)
)

echo [3/3] Abriendo pantalla de cobro de la Caja Principal...
start "" msedge --app=http://localhost:5000 || start "" chrome --app=http://localhost:5000 || start "" http://localhost:5000

echo.
echo =========================================================================
echo  [OK] CAJA PRINCIPAL OPERATIVA AL 100%%
echo  [OK] Puedes vender y facturar con o sin internet.
echo  [OK] Al volver el internet, las ventas suben automaticamente a Railway.
echo  (Para cerrar el sistema cuando termine el dia, cierra esta ventana).
echo =========================================================================
echo.
pause
