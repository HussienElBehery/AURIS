#!/usr/bin/env python3
"""
Test script to check chat logs and user data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.database import get_db
from backend.app.models import User, ChatLog

def test_chat_retrieval():
    """Test chat log retrieval and user data"""
    
    db = next(get_db())
    try:
        print("=== Current Users ===")
        users = db.query(User).all()
        for user in users:
            print(f"User: {user.name} ({user.email})")
            print(f"  - ID: {user.id}")
            print(f"  - Role: {user.role}")
            print(f"  - Agent ID: {user.agent_id}")
            print()
        
        print("=== Current Chat Logs ===")
        chat_logs = db.query(ChatLog).all()
        for chat in chat_logs:
            print(f"Chat: {chat.interaction_id}")
            print(f"  - ID: {chat.id}")
            print(f"  - Agent ID: {chat.agent_id}")
            print(f"  - Uploaded by: {chat.uploaded_by}")
            print(f"  - Status: {chat.status}")
            print(f"  - Created: {chat.created_at}")
            print()
        
        if not chat_logs:
            print("No chat logs found in database")
        
        # Test the filtering logic
        print("=== Testing Filter Logic ===")
        for user in users:
            if user.role == "agent":
                print(f"\nFor Agent: {user.name}")
                print(f"  - User ID: {user.id}")
                print(f"  - Agent ID: {user.agent_id}")
                
                # Test what this agent should see
                agent_chats = db.query(ChatLog).filter(
                    (ChatLog.agent_id == user.agent_id) | 
                    (ChatLog.uploaded_by == user.id)
                ).all()
                
                print(f"  - Should see {len(agent_chats)} chats:")
                for chat in agent_chats:
                    print(f"    * {chat.interaction_id} (agent_id: {chat.agent_id}, uploaded_by: {chat.uploaded_by})")
        
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting chat retrieval test...")
    test_chat_retrieval()
    print("Test completed!") 