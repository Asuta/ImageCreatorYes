@echo off
setlocal
set SCRIPT_DIR=%~dp0
set VENV_PYTHON=%SCRIPT_DIR%.venv-braindead\Scripts\python.exe

if not exist "%VENV_PYTHON%" (
  echo Missing Python runtime: %VENV_PYTHON% 1>&2
  exit /b 2
)

if "%BRAINDEAD_BG_MODEL%"=="" (
  set BRAINDEAD_BG_MODEL=birefnet-general-lite
)

if "%BRAINDEAD_BG_DEVICE%"=="" (
  set BRAINDEAD_BG_DEVICE=auto
)

"%VENV_PYTHON%" "%SCRIPT_DIR%braindead_cutout.py" "%~1" "%BRAINDEAD_BG_MODEL%"
