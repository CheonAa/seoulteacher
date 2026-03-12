@echo off
cd /d "z:\DataBox\CheonA\00 seoulteacher"
npx tsc --noEmit > tsc_output.txt 2>&1
type tsc_output.txt
