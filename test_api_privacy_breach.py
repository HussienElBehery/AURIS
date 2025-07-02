import requests
import time

API_BASE = 'http://localhost:3001/api/chat-logs'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMjc4NjI5Zi0yNWU3LTQ0NGMtYmVjMS01OTk4ZjAxZjMzNzQiLCJleHAiOjE3NTE0NDU1MTZ9.tGVdaMtqmFx7BtC1gm-pEKEFEPEH82tDZ6QXJQYaltY'
HEADERS = {'Authorization': f'Bearer {TOKEN}'}

# Upload the chat log
with open('test_privacy_breach_chatlog.json', 'rb') as f:
    files = {'file': ('test_privacy_breach_chatlog.json', f, 'application/json')}
    r = requests.post(f'{API_BASE}/upload', files=files, headers=HEADERS)
    print('Upload response:', r.status_code, r.text)
    if r.status_code == 200:
        chat_logs = r.json()
        for log in chat_logs:
            chat_log_id = log['id']
            # Start processing
            p = requests.post(f'{API_BASE}/{chat_log_id}/process', headers=HEADERS)
            print(f'Process response for {chat_log_id}:', p.status_code, p.text)
            # Poll status
            for i in range(8):
                s = requests.get(f'{API_BASE}/{chat_log_id}/status', headers=HEADERS)
                print(f'Status poll {i+1} for {chat_log_id}:', s.status_code, s.text)
                time.sleep(2) 