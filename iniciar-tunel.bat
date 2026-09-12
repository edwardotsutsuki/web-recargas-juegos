@echo off
title Cloudflare Tunnel - Recargas Juegos Pro
echo ========================================================
echo   Iniciando Tunel de Cloudflare (recargasjuegospro.cloud)
echo ========================================================
echo   api.recargasjuegospro.cloud      -> localhost:3000
echo   supabase.recargasjuegospro.cloud -> localhost:54321
echo   app.recargasjuegospro.cloud      -> localhost:5173
echo ========================================================
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run --token eyJhIjoiMmQ3Zjk4NjE2Yzg3YTg4MjhjMmQwNDViNDFhOTUwNDQiLCJ0IjoiOGQ5ZjM5OGUtNjNiNy00NmNjLWE4MjgtOWVjNDg4MmNmM2Q0IiwicyI6Ik56azRabUZqTTJVdE1qQTFaaTAwWVRnMkxXSmlNRGd0TkRrM056WmlOVFE1Tm1OaSJ9
pause
