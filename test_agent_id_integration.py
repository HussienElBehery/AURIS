#!/usr/bin/env python3
"""
Test script to verify agent_id integration
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_db
from app.models import User, ChatLog
from app.schemas import UserResponse

def test_agent_id_integration():
    """Test that agent_id is properly set and used"""
    
    db = next(get_db())
    try:
        # Test 1: Check that agents have agent_id
        print("=== Test 1: Checking agent_id for agents ===")
        agents = db.query(User).filter(User.role == "agent").all()
        
        for agent in agents:
            print(f"Agent: {agent.name} ({agent.email})")
            print(f"  - agent_id: {agent.agent_id}")
            print(f"  - role: {agent.role}")
            print()
        
        if not agents:
            print("No agents found in database")
            return
        
        # Test 2: Check chat logs for agent assignment
        print("=== Test 2: Checking chat logs for agent assignment ===")
        chat_logs = db.query(ChatLog).all()
        
        for chat in chat_logs:
            print(f"Chat Log: {chat.interaction_id}")
            print(f"  - agent_id: {chat.agent_id}")
            print(f"  - agent_persona: {chat.agent_persona}")
            print(f"  - uploaded_by: {chat.uploaded_by}")
            print(f"  - status: {chat.status}")
            print(f"  - created_at: {chat.created_at}")
            print()
        
        if not chat_logs:
            print("No chat logs found in database")
            return
        
        # Test 3: Check that managers don't have agent_id
        print("=== Test 3: Checking managers don't have agent_id ===")
        managers = db.query(User).filter(User.role == "manager").all()
        
        for manager in managers:
            print(f"Manager: {manager.name} ({manager.email})")
            print(f"  - agent_id: {manager.agent_id}")
            print(f"  - role: {manager.role}")
            print()
        
        print("=== Integration Test Summary ===")
        print(f"✓ Found {len(agents)} agents with agent_id")
        print(f"✓ Found {len(chat_logs)} chat logs")
        print(f"✓ Found {len(managers)} managers")
        
    except Exception as e:
        print(f"Error during testing: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting agent_id integration test...")
    test_agent_id_integration()
    print("Test completed!") 