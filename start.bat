@echo off
cd /d %~dp0
if not exist .env copy .env.example .env
if not exist node_modules (
  echo Installing Node dependencies...
  npm install
)
echo Starting HireeBridge...
npm start
