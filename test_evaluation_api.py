#!/usr/bin/env python3
"""
Test the evaluation API endpoint directly.
"""

import requests
import json

def test_evaluation_api():
    """Test the evaluation API endpoint."""
    print("🧪 Testing Evaluation API")
    print("=" * 40)
    
    # Test the evaluation endpoint
    url = "http://localhost:8000/api/chat-logs/evaluations/by-agent/agent-f5eb1583"
    headers = {
        "Authorization": "Bearer demo-token"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
            
            # Check if it's an array or single object
            if isinstance(data, list):
                print(f"Found {len(data)} evaluations")
                for i, eval in enumerate(data):
                    print(f"  Evaluation {i+1}:")
                    print(f"    - ID: {eval.get('id')}")
                    print(f"    - Chat Log ID: {eval.get('chat_log_id')}")
                    print(f"    - Agent ID: {eval.get('agent_id')}")
                    print(f"    - Coherence: {eval.get('coherence')}")
                    print(f"    - Relevance: {eval.get('relevance')}")
                    print(f"    - Politeness: {eval.get('politeness')}")
                    print(f"    - Resolution: {eval.get('resolution')}")
            else:
                print("Single evaluation object:")
                print(f"  - ID: {data.get('id')}")
                print(f"  - Chat Log ID: {data.get('chat_log_id')}")
                print(f"  - Agent ID: {data.get('agent_id')}")
                print(f"  - Coherence: {data.get('coherence')}")
                print(f"  - Relevance: {data.get('relevance')}")
                print(f"  - Politeness: {data.get('politeness')}")
                print(f"  - Resolution: {data.get('resolution')}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error testing API: {e}")

if __name__ == "__main__":
    test_evaluation_api() 