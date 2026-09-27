Set oWS = CreateObject("WScript.Shell")
sDesktop = oWS.SpecialFolders("Desktop")
Set oLink = oWS.CreateShortcut(sDesktop & "\Farmacia Amanda - CAJA PRINCIPAL.lnk")
oLink.TargetPath = WScript.Arguments(0)
oLink.WorkingDirectory = WScript.Arguments(1)
oLink.IconLocation = "shell32.dll, 43"
oLink.Save
