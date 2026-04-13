@echo off
cd /d "%~dp0"
echo.
echo  Creator ROI Scorer
echo  Starting at http://localhost:3001
echo  Press Ctrl+C to stop
echo.
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next dev -p 3001
