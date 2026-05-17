#!/bin/sh
# Kill any process listening on the given port. Tries lsof (Mac/Linux/Git Bash),
# falls back to PowerShell (Windows).
kill_port() {
  PORT=$1
  PID=$(lsof -ti:"$PORT" 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "Killing process on port $PORT (pid $PID)"
    kill -9 $PID
    return
  fi
  powershell.exe -NoProfile -Command "
    Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }
  " 2>/dev/null && echo "Killed process on port $PORT"
}
