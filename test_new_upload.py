#!/usr/bin/env python3
"""
Test script for the new simplified chat log upload format
"""

import json
import requests
from datetime import datetime

# Test data with the new format
test_data = {
    "transcript": [
        {
            "sender": "customer",
            "text": "I need a copy of my invoice RIGHT NOW. I've been trying to get this for a week! Your support is a joke. Invoice number is INV-2023-10-26-001. I'm beyond frustrated."
        },
        {
            "sender": "agent",
            "text": "Whoa there! I totally get your frustration, and I'm SO sorry you've had trouble getting your invoice. A week is way too long! Let's get this sorted. INV-2023-10-26-001... okay, one sec! While I'm looking, did you know we just launched a new feature that lets you download all your invoices directly from your account? It's super easy! You can find it under 'Billing History'."
        },
        {
            "sender": "customer",
            "text": "I don't care about new features! I just want the invoice I *already* paid for. I'm trying to submit it for expense reports and this is holding everything up!"
        },
        {
            "sender": "agent",
            "text": "Totally understandable! Expense reports are the worst, right? Okay, okay, invoice... hmm. It's not popping up immediately. Sometimes the system takes a little bit. But hey, have you checked out our premium support package? It includes priority invoice retrieval, plus a dedicated account manager! It's a game-changer!"
        },
        {
            "sender": "customer",
            "text": "Are you serious? You're trying to upsell me while I'm waiting for something I'm entitled to? Just find the invoice!"
        },
        {
            "sender": "agent",
            "text": "No, no, not at all! Just trying to offer solutions! Let me double-check with my team lead. It might be a system glitch. I'll need a few minutes. In the meantime, are you enjoying our new mobile app? It's got a sleek new design!"
        }
    ]
}

# Test data with timestamps
test_data_with_timestamps = {
    "transcript": [
        {
            "sender": "customer",
            "text": "I need a copy of my invoice RIGHT NOW. I've been trying to get this for a week! Your support is a joke. Invoice number is INV-2023-10-26-001. I'm beyond frustrated.",
            "timestamp": "2024-01-15T10:30:00"
        },
        {
            "sender": "agent",
            "text": "Whoa there! I totally get your frustration, and I'm SO sorry you've had trouble getting your invoice. A week is way too long! Let's get this sorted. INV-2023-10-26-001... okay, one sec! While I'm looking, did you know we just launched a new feature that lets you download all your invoices directly from your account? It's super easy! You can find it under 'Billing History'.",
            "timestamp": "2024-01-15T10:32:15"
        },
        {
            "sender": "customer",
            "text": "I don't care about new features! I just want the invoice I *already* paid for. I'm trying to submit it for expense reports and this is holding everything up!",
            "timestamp": "2024-01-15T10:33:45"
        }
    ]
}

def test_upload_format():
    """Test the new upload format"""
    print("Testing new chat log upload format...")
    
    # Save test data to files
    with open('test_chat_simple.json', 'w') as f:
        json.dump(test_data, f, indent=2)
    
    with open('test_chat_with_timestamps.json', 'w') as f:
        json.dump(test_data_with_timestamps, f, indent=2)
    
    print("✅ Created test files:")
    print("  - test_chat_simple.json (without timestamps)")
    print("  - test_chat_with_timestamps.json (with timestamps)")
    
    # Test JSON parsing
    try:
        # Test simple format
        with open('test_chat_simple.json', 'r') as f:
            parsed_data = json.load(f)
        
        transcript = parsed_data.get('transcript', [])
        print(f"✅ Successfully parsed {len(transcript)} messages from simple format")
        
        # Test timestamp format
        with open('test_chat_with_timestamps.json', 'r') as f:
            parsed_data_timestamp = json.load(f)
        
        transcript_timestamp = parsed_data_timestamp.get('transcript', [])
        print(f"✅ Successfully parsed {len(transcript_timestamp)} messages from timestamp format")
        
        # Verify message structure
        for i, msg in enumerate(transcript):
            if 'sender' not in msg or 'text' not in msg:
                print(f"❌ Message {i} missing required fields")
                return False
        
        print("✅ All messages have required fields (sender, text)")
        
        # Check timestamps
        messages_with_timestamps = [msg for msg in transcript_timestamp if 'timestamp' in msg]
        print(f"✅ {len(messages_with_timestamps)} messages have timestamps")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing format: {e}")
        return False

def test_backend_import():
    """Test that backend can import the new format"""
    try:
        from app.schemas import TranscriptMessage, ChatLogUpload
        from app.models import ChatLog
        
        # Test schema validation
        message = TranscriptMessage(
            sender="customer",
            text="Test message",
            timestamp="2024-01-15T10:30:00"
        )
        
        print("✅ Backend schemas import successfully")
        print("✅ TranscriptMessage schema works with timestamps")
        
        return True
        
    except Exception as e:
        print(f"❌ Backend import error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing New Chat Log Upload Format")
    print("=" * 50)
    
    # Test format
    format_ok = test_upload_format()
    
    # Test backend
    backend_ok = test_backend_import()
    
    print("\n" + "=" * 50)
    if format_ok and backend_ok:
        print("🎉 All tests passed! New format is ready to use.")
        print("\n📝 Usage:")
        print("1. Create JSON file with 'transcript' array")
        print("2. Each message needs 'sender' and 'text'")
        print("3. 'timestamp' is optional (will use current time if not provided)")
        print("4. Upload via the web interface")
    else:
        print("❌ Some tests failed. Please check the errors above.") 