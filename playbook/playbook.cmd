@echo off
rem Abre el playbook de Mi Ciudad. Doble clic o: playbook\playbook.cmd [comando]
where node >nul 2>nul || (echo Falta Node 24: https://nodejs.org & pause & exit /b 1)
node --disable-warning=ExperimentalWarning "%~dp0playbook.ts" %*
if "%~1"=="" pause
