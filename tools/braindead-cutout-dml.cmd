@echo off
setlocal
set SCRIPT_DIR=%~dp0
set VENV_PYTHON=%SCRIPT_DIR%.venv-dml\Scripts\python.exe

if not exist "%VENV_PYTHON%" (
  echo Missing Python runtime: %VENV_PYTHON% 1>&2
  exit /b 2
)

if "%~2"=="" (
  if "%BRAINDEAD_BG_MODEL%"=="" (
    set BRAINDEAD_BG_MODEL=u2net_human_seg
  )
) else (
  set BRAINDEAD_BG_MODEL=%~2
)

set BRAINDEAD_BG_DEVICE=dml

"%VENV_PYTHON%" "%SCRIPT_DIR%braindead_cutout.py" "%~1" "%BRAINDEAD_BG_MODEL%"
