import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel, PeftConfig

logger = logging.getLogger(__name__)

class ModelLoader:
    """Flexible model loader that discovers models and handles adapter mismatches."""
    
    def __init__(self):
        self.models_dir = Path(__file__).parent.parent.parent.parent / "models"
        self.base_model = None
        self.base_tokenizer = None
        self.current_base_model_name = None
        self.adapters = {}
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        logger.info(f"ModelLoader initialized. Models directory: {self.models_dir}")
        logger.info(f"Using device: {self.device}")
        
        # Create models directory if it doesn't exist
        self.models_dir.mkdir(exist_ok=True)
        
        # Discover available models and adapters (lightweight discovery only)
        self._discover_models()
    
    def _discover_models(self):
        """Discover all available models and adapters on the system (lightweight)."""
        self.available_base_models = []
        self.adapters = {}
        
        # Discover base models in the models directory
        if self.models_dir.exists():
            for item in self.models_dir.iterdir():
                if item.is_dir():
                    # Check if it's a base model (has model files)
                    if self._is_base_model(item):
                        self.available_base_models.append({
                            "name": item.name,
                            "path": str(item),
                            "type": "local"
                        })
                    # Check if it's an adapter (has adapter files)
                    elif self._is_adapter(item):
                        adapter_info = self._get_adapter_info(item)
                        if adapter_info:
                            self.adapters[adapter_info["name"]] = adapter_info
        
        # Add only the TinyLlama model that's compatible with Python 3.13
        # (removed DialoGPT and GPT-2 as they're not needed for this project)
        compatible_models = [
            "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        ]
        
        for model_name in compatible_models:
            self.available_base_models.append({
                "name": model_name,
                "path": model_name,
                "type": "huggingface"
            })
        
        logger.info(f"Discovered {len(self.available_base_models)} base models")
        logger.info(f"Discovered {len(self.adapters)} adapters")
    
    def _is_base_model(self, path: Path) -> bool:
        """Check if a directory contains a base model (lightweight check)."""
        model_files = ["config.json", "model.safetensors", "pytorch_model.bin"]
        return any((path / file).exists() for file in model_files)
    
    def _is_adapter(self, path: Path) -> bool:
        """Check if a directory contains an adapter (lightweight check)."""
        adapter_files = ["adapter_config.json", "adapter_model.safetensors"]
        return all((path / file).exists() for file in adapter_files)
    
    def _get_adapter_info(self, adapter_path: Path) -> Optional[Dict[str, Any]]:
        """Extract information about an adapter (lightweight)."""
        try:
            config_path = adapter_path / "adapter_config.json"
            if not config_path.exists():
                return None
            
            # Read adapter config to get base model info
            import json
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            base_model_name = config.get("base_model_name_or_path", "unknown")
            
            # Determine adapter type based on directory name
            adapter_name = adapter_path.name
            if "agent1" in adapter_name or "evaluation" in adapter_name:
                agent_type = "evaluation"
            elif "agent2" in adapter_name or "analysis" in adapter_name:
                agent_type = "analysis"
            elif "agent3" in adapter_name or "recommendation" in adapter_name:
                agent_type = "recommendation"
            else:
                agent_type = "unknown"
            
            return {
                "name": agent_type,
                "path": str(adapter_path),
                "base_model_name": base_model_name,
                "agent_type": agent_type,
                "config": config
            }
            
        except Exception as e:
            logger.error(f"Error reading adapter info from {adapter_path}: {e}")
            return None
    
    def load_base_model(self, model_name: str = None) -> bool:
        """Load a base model by name (only when explicitly called)."""
        try:
            if model_name is None:
                # Use the first available model
                if not self.available_base_models:
                    logger.error("No base models available")
                    return False
                model_name = self.available_base_models[0]["name"]
            
            logger.info(f"Loading base model: {model_name}")
            
            # Configure quantization for memory efficiency
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=False,
            )
            
            # Load tokenizer
            self.base_tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                trust_remote_code=True
            )
            
            # Add padding token if not present
            if self.base_tokenizer.pad_token is None:
                self.base_tokenizer.pad_token = self.base_tokenizer.eos_token
            
            # Load model with quantization
            self.base_model = AutoModelForCausalLM.from_pretrained(
                model_name,
                quantization_config=bnb_config,
                device_map="auto",
                trust_remote_code=True,
                torch_dtype=torch.float16
            )
            
            self.current_base_model_name = model_name
            logger.info(f"✅ Base model loaded successfully: {model_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load base model {model_name}: {e}")
            return False
    
    def load_adapter(self, adapter_name: str) -> Optional[PeftModel]:
        """Load a specific adapter with graceful error handling."""
        if adapter_name not in self.adapters:
            logger.error(f"Unknown adapter: {adapter_name}")
            return None
        
        adapter_info = self.adapters[adapter_name]
        adapter_path = Path(adapter_info["path"])
        
        if not adapter_path.exists():
            logger.warning(f"Adapter not found: {adapter_path}")
            return None
        
        # Check if adapter matches current base model
        if (self.current_base_model_name and 
            adapter_info["base_model_name"] != self.current_base_model_name):
            logger.warning(f"Adapter {adapter_name} was trained on {adapter_info['base_model_name']}, "
                         f"but current base model is {self.current_base_model_name}")
            logger.info(f"Using base model for {adapter_name} due to model mismatch")
            return self.base_model
        
        try:
            # Load adapter configuration
            peft_config = PeftConfig.from_pretrained(adapter_path)
            
            # Try to load adapter
            adapter_model = PeftModel.from_pretrained(
                self.base_model,
                adapter_path,
                torch_dtype=torch.float16
            )
            
            logger.info(f"✅ Loaded adapter: {adapter_name}")
            return adapter_model
            
        except Exception as e:
            logger.error(f"Failed to load adapter {adapter_name}: {e}")
            logger.info(f"Using base model for {adapter_name} due to loading failure")
            return self.base_model
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get comprehensive status of all models and adapters (lightweight)."""
        status = {
            "base_model_loaded": self.base_model is not None,
            "current_base_model": self.current_base_model_name,
            "device": self.device,
            "available_base_models": self.available_base_models,
            "adapters": {}
        }
        
        for name, info in self.adapters.items():
            adapter_path = Path(info["path"])
            status["adapters"][name] = {
                "installed": adapter_path.exists(),
                "path": str(adapter_path),
                "base_model_name": info["base_model_name"],
                "agent_type": info["agent_type"],
                "size_gb": self._get_directory_size_gb(adapter_path) if adapter_path.exists() else 0,
                "compatible": (self.current_base_model_name == info["base_model_name"]) if self.current_base_model_name else False
            }
        
        return status
    
    def _get_directory_size_gb(self, path: Path) -> float:
        """Get directory size in GB (lightweight)."""
        try:
            total_size = 0
            for file_path in path.rglob('*'):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
            return round(total_size / (1024**3), 2)
        except:
            return 0.0
    
    def generate_response(self, prompt: str, adapter_name: Optional[str] = None, 
                         max_length: int = 512) -> str:
        """Generate a response using the model."""
        if self.base_model is None:
            return "Error: Base model not loaded"
        
        try:
            # Use adapter if specified, otherwise use base model
            model = self.base_model
            if adapter_name and adapter_name in self.adapters:
                adapter_model = self.load_adapter(adapter_name)
                if adapter_model:
                    model = adapter_model
            
            # Tokenize input
            inputs = self.base_tokenizer(
                prompt, 
                return_tensors="pt", 
                truncation=True, 
                max_length=max_length
            ).to(self.device)
            
            # Generate response
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=max_length,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.base_tokenizer.eos_token_id
                )
            
            # Decode response
            response = self.base_tokenizer.decode(
                outputs[0][inputs['input_ids'].shape[1]:], 
                skip_special_tokens=True
            )
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return f"Error generating response: {e}"

# Global model loader instance
model_loader = ModelLoader() 