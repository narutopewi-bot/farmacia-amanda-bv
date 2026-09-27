@echo off
title Crear Acceso Directo - Farmacia Amanda
color 0B

echo =========================================================================
echo       CREANDO ACCESO DIRECTO EN EL ESCRITORIO DE WINDOWS
echo =========================================================================
echo.

cscript //nologo "%~dp0backend\scripts\create-shortcut.vbs" "%~dp0INICIAR_CAJA_PRINCIPAL.bat" "%~dp0"

echo.
echo =========================================================================
echo  [OK] Acceso directo creado exitosamente en tu Escritorio de Windows!
echo  Busca el icono con el nombre: Farmacia Amanda - CAJA PRINCIPAL
echo =========================================================================
echo.
pause
