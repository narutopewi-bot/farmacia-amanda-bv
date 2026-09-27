@echo off
title Crear Acceso Directo - Farmacia Amanda
color 0B
chcp 65001 > nul

set TARGET=%~dp0INICIAR_CAJA_PRINCIPAL.bat
set SCRIPT=%TEMP%\CreateShortcut_%RANDOM%.vbs

echo Set oWS = WScript.CreateObject("WScript.Shell") >> "%SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Farmacia Amanda - CAJA PRINCIPAL.lnk" >> "%SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SCRIPT%"
echo oLink.TargetPath = "%TARGET%" >> "%SCRIPT%"
echo oLink.WorkingDirectory = "%~dp0" >> "%SCRIPT%"
echo oLink.Description = "Expendio de Medicinas Amanda B&V - Caja Principal Offline" >> "%SCRIPT%"
echo oLink.IconLocation = "shell32.dll, 43" >> "%SCRIPT%"
echo oLink.Save >> "%SCRIPT%"

cscript /nologo "%SCRIPT%"
del "%SCRIPT%"

echo.
echo =========================================================================
echo  ✓ Acceso directo creado exitosamente en tu Escritorio de Windows!
echo  Icono: "Farmacia Amanda - CAJA PRINCIPAL"
echo =========================================================================
echo.
pause
