#!/usr/bin/env python3
"""
Test script to verify chat logs endpoint
"""

import requests
import json

def test_chat_logs_endpoint():
    """Test the chat logs endpoint"""
    
    base_url = "http://localhost:8000"
    
    # Test login first
    login_data = {
        "email": "h.ahmed2104@nu.edu.eg",
        "password": "password123"
    }
    
    try:
        print("Testing login...")
        login_response = requests.post(f"{base_url}/auth/login", json=login_data)
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data["access_token"]
            print("✓ Login successful")
            
            # Test chat logs endpoint
            headers = {"Authorization": f"Bearer {access_token}"}
            
            print("\nTesting chat logs endpoint...")
            chat_response = requests.get(f"{base_url}/chat-logs", headers=headers)
            
            if chat_response.status_code == 200:
                chat_logs = chat_response.json()
                print(f"✓ Chat logs endpoint successful - found {len(chat_logs)} chat logs")
                
                for i, chat in enumerate(chat_logs):
                    print(f"\nChat {i+1}:")
                    print(f"  - ID: {chat['id']}")
                    print(f"  - Interaction ID: {chat['interaction_id']}")
                    print(f"  - Agent ID: {chat['agent_id']}")
                    print(f"  - Status: {chat['status']}")
                    print(f"  - Created: {chat['created_at']}")
                    print(f"  - Messages: {len(chat['transcript'])}")
            else:
                print(f"✗ Chat logs endpoint failed: {chat_response.status_code}")
                print(f"Response: {chat_response.text}")
                
        else:
            print(f"✗ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            
    except requests.exceptions.ConnectionError:
        print("✗ Could not connect to server. Make sure the backend is running on port 8000.")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    print("Testing chat logs endpoint...")
    test_chat_logs_endpoint()
    print("Test completed!") 