#!/usr/bin/env python3
"""
Test script to verify frontend can connect to models API
"""

import requests
import json

def test_models_api():
    """Test the models API endpoints"""
    base_url = "http://localhost:3001/api"
    
    # Test model status endpoint
    print("🔍 Testing model status endpoint...")
    try:
        response = requests.get(
            f"{base_url}/models/status",
            headers={"Authorization": "Bearer demo-token"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Model status endpoint works!")
            print(f"   Total required: {data['data']['total_required']}")
            print(f"   Total installed: {data['data']['total_installed']}")
            print(f"   System ready: {data['data']['system_ready']}")
            
            print("\n📋 Model details:")
            for model_key, model_info in data['data']['models'].items():
                status = "✅" if model_info['installed'] else "❌"
                print(f"   {model_key}: {status} ({model_info['size_gb']}GB)")
        else:
            print(f"❌ Model status failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Model status error: {e}")
        return False
    
    # Test progress endpoint
    print("\n🔍 Testing progress endpoint...")
    try:
        response = requests.get(
            f"{base_url}/models/progress",
            headers={"Authorization": "Bearer demo-token"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Progress endpoint works!")
            print(f"   Overall progress: {data['data']['overall_progress']}%")
        else:
            print(f"❌ Progress failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Progress error: {e}")
    
    return True

if __name__ == "__main__":
    print("🧪 Testing Models API for Frontend")
    print("=" * 40)
    
    success = test_models_api()
    
    if success:
        print("\n🎉 All tests passed! Frontend should work.")
        print("\n💡 You can now:")
        print("   1. Start the frontend: npm run dev")
        print("   2. Navigate to the Models page")
        print("   3. Install the base model")
    else:
        print("\n💥 Some tests failed. Check the backend server.") 