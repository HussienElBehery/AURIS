#!/usr/bin/env python3
"""
Test script to check model status endpoint
"""

import asyncio
from app.routers.models import get_model_status

async def test_model_status():
    """Test the model status endpoint"""
    try:
        result = await get_model_status()
        print("✅ Model status endpoint works!")
        print(f"Total required models: {result['data']['total_required']}")
        print(f"Total installed models: {result['data']['total_installed']}")
        print(f"System ready: {result['data']['system_ready']}")
        
        print("\n📋 Model details:")
        for model_key, model_info in result['data']['models'].items():
            print(f"  {model_key}: {'✅' if model_info['installed'] else '❌'} ({model_info['size_gb']}GB)")
        
        return True
    except Exception as e:
        print(f"❌ Model status endpoint failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_model_status())
    if success:
        print("\n🎉 Model status test passed!")
    else:
        print("\n💥 Model status test failed!") 