@echo off
title Crear Acceso Directo - Farmacia Amanda
color 0B

echo =========================================================================
echo       CREANDO ACCESO DIRECTO EN EL ESCRITORIO DE WINDOWS
echo =========================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut("$([Environment]::GetFolderPath('Desktop'))\Farmacia Amanda - CAJA PRINCIPAL.lnk"); $s.TargetPath = '%~dp0INICIAR_CAJA_PRINCIPAL.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = 'shell32.dll,43'; $s.Description = 'Expendio de Medicinas Amanda B&V - Caja Principal Offline'; $s.Save()"

echo.
echo =========================================================================
echo  [OK] Acceso directo creado exitosamente en tu Escritorio de Windows!
echo  Busca el icono con el nombre: 'Farmacia Amanda - CAJA PRINCIPAL'
echo =========================================================================
echo.
pause
