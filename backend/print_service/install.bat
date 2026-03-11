@echo off
echo ========================================
echo DNP Direct Print Service - Installation
echo ========================================
echo.

REM Vérifier si Python est installé
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python n'est pas installe ou n'est pas dans le PATH
    echo Veuillez installer Python depuis https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python trouve
echo.

echo Installation des dependances...
pip install flask flask-cors pillow requests pywin32

echo.
echo ========================================
echo Installation terminee!
echo ========================================
echo.
echo Pour demarrer le service, executez:
echo   python dnp_print_service.py
echo.
echo Ou double-cliquez sur start_print_service.bat
echo.
pause
