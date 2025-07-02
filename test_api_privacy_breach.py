import requests
import time

API_BASE = 'http://localhost:3001/api/chat-logs'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMjc4NjI5Zi0yNWU3LTQ0NGMtYmVjMS01OTk4ZjAxZjMzNzQiLCJleHAiOjE3NTIwNzEzMDN9.tDlfrmOOcZUo25k4tq5Z8jJd1z8UxiPrR4uAH1g722I'
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
                # Print the raw output if available in the response
                try:
                    status_json = s.json()
                    if 'agents' in status_json:
                        for agent, agent_data in status_json['agents'].items():
                            print(f'Raw output for agent {agent}:', agent_data)
                except Exception as e:
                    print(f'Could not parse status response as JSON: {e}')
                time.sleep(2) 