#!/usr/bin/env python3
"""
Debug user data to see what agentId is being used.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def debug_user_data():
    """Debug user data and agent assignments."""
    print("🔍 Debugging User Data")
    print("=" * 40)
    
    try:
        # Import database components
        sys.path.append(str(Path("backend")))
        from backend.app.database import get_db
        from backend.app.models import User, ChatLog, Evaluation
        from sqlalchemy import text
        
        # Get database session
        db = next(get_db())
        
        # Check users
        print("\n👥 Users in database:")
        users = db.query(User).all()
        for user in users:
            print(f"   - ID: {user.id}")
            print(f"     Name: {user.name}")
            print(f"     Email: {user.email}")
            print(f"     Role: {user.role}")
            print(f"     Agent ID: {user.agent_id}")
            print()
        
        # Check chat logs and their agent assignments
        print("\n💬 Chat logs and agent assignments:")
        chat_logs = db.query(ChatLog).all()
        for chat in chat_logs:
            print(f"   - Chat ID: {chat.id}")
            print(f"     Interaction ID: {chat.interaction_id}")
            print(f"     Agent ID: {chat.agent_id}")
            print(f"     Uploaded by: {chat.uploaded_by}")
            print(f"     Status: {chat.status}")
            print()
        
        # Check evaluations and their agent assignments
        print("\n📊 Evaluations and agent assignments:")
        evaluations = db.query(Evaluation).all()
        for eval in evaluations:
            print(f"   - Evaluation ID: {eval.id}")
            print(f"     Chat Log ID: {eval.chat_log_id}")
            print(f"     Agent ID: {eval.agent_id}")
            print(f"     Coherence: {eval.coherence}")
            print(f"     Relevance: {eval.relevance}")
            print(f"     Politeness: {eval.politeness}")
            print(f"     Resolution: {eval.resolution}")
            print()
        
        # Check which user uploaded which chat
        print("\n🔗 User-Chat-Evaluation relationships:")
        for user in users:
            if user.role == 'agent':
                print(f"\n   Agent: {user.name} (ID: {user.id}, Agent ID: {user.agent_id})")
                
                # Find chats uploaded by this user
                user_chats = db.query(ChatLog).filter(ChatLog.uploaded_by == user.id).all()
                print(f"     Uploaded {len(user_chats)} chats:")
                
                for chat in user_chats:
                    print(f"       - Chat: {chat.interaction_id} (Agent ID: {chat.agent_id})")
                    
                    # Find evaluation for this chat
                    evaluation = db.query(Evaluation).filter(Evaluation.chat_log_id == chat.id).first()
                    if evaluation:
                        print(f"         Evaluation: C={evaluation.coherence}, R={evaluation.relevance}, P={evaluation.politeness}, Res={evaluation.resolution}")
                    else:
                        print(f"         No evaluation found")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error debugging user data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_user_data() 