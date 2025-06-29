#!/usr/bin/env python3
"""
Test script for the model management system.
Run this to verify that the model manager works correctly.
"""

import asyncio
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent / "app"))

from app.services.model_manager import model_manager

async def test_model_manager():
    """Test the model management functionality."""
    
    print("🧪 Testing Model Manager...")
    print("=" * 50)
    
    # Test 1: Get model status
    print("\n1. Getting model status...")
    try:
        status = model_manager.get_model_status()
        print(f"✅ Status retrieved successfully")
        print(f"   - Total models: {status['total_required']}")
        print(f"   - Installed: {status['total_installed']}")
        print(f"   - System ready: {status['system_ready']}")
        
        for model_key, model_info in status['models'].items():
            print(f"   - {model_key}: {'✅' if model_info['installed'] else '❌'} ({model_info['size_gb']}GB)")
            
    except Exception as e:
        print(f"❌ Failed to get model status: {e}")
        return False
    
    # Test 2: Check if models directory exists
    print("\n2. Checking models directory...")
    models_dir = Path("../../models")
    if models_dir.exists():
        print(f"✅ Models directory exists: {models_dir.absolute()}")
    else:
        print(f"⚠️  Models directory does not exist: {models_dir.absolute()}")
        print("   This is normal for first-time setup.")
    
    # Test 3: Test model installation check
    print("\n3. Testing model installation check...")
    try:
        for model_key, model_info in model_manager.required_models.items():
            model_path = models_dir / model_info["name"]
            is_installed = model_manager._check_model_installed(model_path, model_info["type"])
            print(f"   - {model_key}: {'✅' if is_installed else '❌'} ({model_info['name']})")
            
    except Exception as e:
        print(f"❌ Failed to check model installation: {e}")
        return False
    
    # Test 4: Test cache cleanup
    print("\n4. Testing cache cleanup...")
    try:
        model_manager.cleanup_cache()
        print("✅ Cache cleanup completed")
    except Exception as e:
        print(f"❌ Failed to cleanup cache: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Model Manager test completed successfully!")
    print("\nNext steps:")
    print("1. Start the backend server: uvicorn app.main:app --reload --port 3001")
    print("2. Access the web interface at http://localhost:5173")
    print("3. Navigate to /models to install the required models")
    print("4. Use the sample chat log for testing")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_model_manager())
    sys.exit(0 if success else 1) 