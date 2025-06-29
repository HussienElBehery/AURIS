#!/usr/bin/env python3
"""
Lightweight test to check model discovery functionality without loading models.
"""

import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent / "app"))

try:
    from app.services.model_loader import model_loader
    print("✅ Successfully imported model_loader")
except ImportError as e:
    print(f"❌ Failed to import model_loader: {e}")
    sys.exit(1)

def test_model_discovery():
    print("\n🔍 Testing Model Discovery (Lightweight)...")
    print("=" * 50)
    
    # Get model status without loading
    status = model_loader.get_model_status()
    
    print(f"Base model loaded: {status['base_model_loaded']}")
    print(f"Current base model: {status.get('current_base_model', 'None')}")
    print(f"Device: {status['device']}")
    
    # Check available base models
    print(f"\n📦 Available Base Models ({len(status['available_base_models'])}):")
    for model in status['available_base_models']:
        print(f"  • {model['name']} ({model['type']})")
    
    # Check adapters
    print(f"\n🔧 Available Adapters ({len(status['adapters'])}):")
    for name, info in status['adapters'].items():
        print(f"  • {name} ({info['agent_type']}):")
        print(f"    - Path: {info['path']}")
        print(f"    - Base model: {info['base_model_name']}")
        print(f"    - Installed: {info['installed']}")
        print(f"    - Size: {info['size_gb']}GB")
        print(f"    - Compatible: {info['compatible']}")
    
    # Test model discovery methods
    print(f"\n🔍 Testing Discovery Methods:")
    
    # Test base model detection
    models_dir = Path("../../models")
    if models_dir.exists():
        for item in models_dir.iterdir():
            if item.is_dir():
                is_base = model_loader._is_base_model(item)
                is_adapter = model_loader._is_adapter(item)
                print(f"  {item.name}: base={is_base}, adapter={is_adapter}")
    
    print("\n✅ Discovery test completed successfully!")

if __name__ == "__main__":
    test_model_discovery() 