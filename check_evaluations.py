#!/usr/bin/env python3
"""
Check evaluation data in the database.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_evaluations():
    """Check evaluation data in the database."""
    print("🔍 Checking Evaluation Data")
    print("=" * 40)
    
    try:
        # Import database models
        sys.path.append(str(Path("backend")))
        from backend.app.database import get_db
        from backend.app.models import ChatLog, Evaluation
        
        # Get database session
        db = next(get_db())
        
        # Check chat logs
        chat_logs = db.query(ChatLog).all()
        print(f"📊 Found {len(chat_logs)} chat logs")
        
        for chat_log in chat_logs:
            print(f"\n💬 Chat Log: {chat_log.id}")
            print(f"   - Interaction ID: {chat_log.interaction_id}")
            print(f"   - Status: {chat_log.status}")
            print(f"   - Messages: {len(chat_log.transcript)}")
            print(f"   - Created: {chat_log.created_at}")
            
            # Check evaluation
            evaluation = db.query(Evaluation).filter(Evaluation.chat_log_id == chat_log.id).first()
            if evaluation:
                print(f"   ✅ Evaluation found:")
                print(f"      - Coherence: {evaluation.coherence}")
                print(f"      - Relevance: {evaluation.relevance}")
                print(f"      - Politeness: {evaluation.politeness}")
                print(f"      - Resolution: {evaluation.resolution}")
                print(f"      - Error: {evaluation.error_message}")
                print(f"      - Created: {evaluation.created_at}")
                
                if evaluation.reasoning:
                    print(f"      - Reasoning keys: {list(evaluation.reasoning.keys()) if isinstance(evaluation.reasoning, dict) else 'Not a dict'}")
            else:
                print(f"   ❌ No evaluation found")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error checking evaluations: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_evaluations() 