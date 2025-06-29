#!/usr/bin/env python3
"""
Test script to verify the evaluation agent works correctly
"""

import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.services.evaluation_agent import evaluation_agent

async def test_evaluation_agent():
    """Test the evaluation agent with sample chat data"""
    
    # Sample chat transcript
    sample_transcript = [
        {
            "sender": "customer",
            "text": "I need help with my order. It's been a week and I haven't received it yet.",
            "timestamp": "2024-01-15T14:30:00"
        },
        {
            "sender": "agent",
            "text": "I understand your concern. Let me help you track your order. Can you provide your order number?",
            "timestamp": "2024-01-15T14:31:00"
        },
        {
            "sender": "customer",
            "text": "Yes, it's ORD-12345. I'm really frustrated because I needed this for an important event.",
            "timestamp": "2024-01-15T14:32:00"
        },
        {
            "sender": "agent",
            "text": "I apologize for the delay. Let me check the status of ORD-12345 for you. I can see it was shipped yesterday and should arrive tomorrow. I'll also expedite the delivery at no extra cost.",
            "timestamp": "2024-01-15T14:33:00"
        },
        {
            "sender": "customer",
            "text": "Thank you so much! That's a relief. I appreciate your help.",
            "timestamp": "2024-01-15T14:34:00"
        },
        {
            "sender": "agent",
            "text": "You're very welcome! I'm glad I could help resolve this for you. Is there anything else you need assistance with?",
            "timestamp": "2024-01-15T14:35:00"
        }
    ]
    
    print("=== Testing Evaluation Agent ===")
    print(f"Sample transcript has {len(sample_transcript)} messages")
    
    try:
        # Test the evaluation agent
        result = await evaluation_agent.evaluate_chat(sample_transcript)
        
        if result.get("error_message"):
            print(f"❌ Evaluation failed: {result['error_message']}")
            return False
        
        evaluation_result = result.get("result")
        if not evaluation_result:
            print("❌ No evaluation result returned")
            return False
        
        print("✅ Evaluation completed successfully!")
        print(f"Model used: {evaluation_result.get('model_used', 'Unknown')}")
        print()
        
        # Display metrics
        print("=== EVALUATION METRICS ===")
        
        coherence = evaluation_result.get("coherence", {})
        print(f"Coherence: {coherence.get('score', 'N/A')}/5")
        print(f"Reasoning: {coherence.get('reasoning', 'N/A')}")
        print()
        
        relevance = evaluation_result.get("relevance", {})
        print(f"Relevance: {relevance.get('score', 'N/A')}/5")
        print(f"Reasoning: {relevance.get('reasoning', 'N/A')}")
        print()
        
        politeness = evaluation_result.get("politeness", {})
        print(f"Politeness: {politeness.get('score', 'N/A')}/5")
        print(f"Reasoning: {politeness.get('reasoning', 'N/A')}")
        print()
        
        resolution = evaluation_result.get("resolution", {})
        print(f"Resolution: {resolution.get('score', 'N/A')}/1")
        print(f"Reasoning: {resolution.get('reasoning', 'N/A')}")
        print()
        
        # Display evaluation summary
        print("=== EVALUATION SUMMARY ===")
        summary = evaluation_result.get("evaluation_summary", "No summary available")
        print(summary)
        print()
        
        return True
        
    except Exception as e:
        print(f"❌ Error during evaluation: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Starting evaluation agent test...")
    success = asyncio.run(test_evaluation_agent())
    if success:
        print("✅ Evaluation agent test completed successfully!")
    else:
        print("❌ Evaluation agent test failed!")
    print("Test completed!") 