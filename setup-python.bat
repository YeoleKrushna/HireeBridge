@echo off
cd /d %~dp0
python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
python scripts\generate_certificate.py --name "Aarav Mehta" --domain "Data Science" --duration "4 Weeks" --id "GR-DS-2026-DEMO01" --date "28 Sep 2026"
pause
