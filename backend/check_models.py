#!/usr/bin/env python3
"""
Lightweight script to check model status without loading models.
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

def check_model_status():
    print("\n🔍 Checking Model Status (Lightweight)...")
    print("=" * 50)
    
    # Check base model
    print(f"Base model loaded: {model_loader.base_model is not None}")
    print(f"Current base model: {model_loader.current_base_model_name}")
    print(f"Device: {model_loader.device}")
    
    # Check adapters
    print(f"\nAvailable adapters: {list(model_loader.adapters.keys())}")
    
    for name, info in model_loader.adapters.items():
        adapter_path = Path(info["path"])
        exists = adapter_path.exists()
        print(f"  {name}: {'✅' if exists else '❌'} {adapter_path}")
        
        if exists:
            # Check for required files
            required_files = [
                "adapter_config.json",
                "adapter_model.safetensors", 
                "tokenizer.json",
                "tokenizer_config.json"
            ]
            for file in required_files:
                file_path = adapter_path / file
                print(f"    {file}: {'✅' if file_path.exists() else '❌'}")
    
    # Get detailed status
    print(f"\n📊 Detailed Status:")
    status = model_loader.get_model_status()
    print(f"  Base model loaded: {status['base_model_loaded']}")
    print(f"  Total adapters: {len(status['adapters'])}")
    
    installed_count = sum(1 for info in status['adapters'].values() if info['installed'])
    print(f"  Installed adapters: {installed_count}")
    
    # Show available base models
    print(f"\n📦 Available Base Models:")
    for model in status['available_base_models']:
        print(f"  • {model['name']} ({model['type']})")
    
    print("\n✅ Model status check completed successfully!")
    print("💡 Note: No models were loaded during this check.")

if __name__ == "__main__":
    check_model_status() 