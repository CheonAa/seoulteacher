@echo off
title Real-Time Sync (D-Drive to Z-Drive)

set "SOURCE=D:\00 seoulteacher"
set "DEST=Z:\DataBox\CheonA\00 seoulteacher"

echo =======================================================
echo [SeoulTeacher] Real-time Sync Started (Background)
echo =======================================================
echo.
echo Please do not close this window. You can minimize it.
echo Syncing only changed files...
echo.

robocopy "%SOURCE%" "%DEST%" /MIR /MON:1 /MOT:1 /XD "node_modules" ".next" ".git" ".vscode" /R:1 /W:1

pause