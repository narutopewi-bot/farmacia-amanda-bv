Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = currentDir

exeFile = currentDir & "\guardian_fiscal_bridge.exe"
pyScript = currentDir & "\guardian_fiscal_bridge.py"

' Si existe el ejecutable nativo compilado, correrlo directo (CERO dependencias, no requiere Python)
If fso.FileExists(exeFile) Then
    WshShell.Run """" & exeFile & """", 0, False
Else
    ' Fallback a script Python si no estuviese el binario
    WshShell.Run "python """ & pyScript & """", 0, False
End If
