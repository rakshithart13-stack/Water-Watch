Set-Location "c:\Users\raksh\OneDrive\Desktop\Water Watch\backend"
& ".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
