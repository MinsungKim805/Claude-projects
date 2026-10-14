#!/bin/sh
# 작은 웹 서버를 켜고 브라우저를 열어요. (파이썬 3 필요)
cd "$(dirname "$0")"
PORT=8000
echo "메타 투어 매홀: http://localhost:$PORT 에서 열려요. 끄려면 Ctrl+C"
( sleep 1; (command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORT") || (command -v open >/dev/null && open "http://localhost:$PORT") ) >/dev/null 2>&1 &
python3 -m http.server $PORT
