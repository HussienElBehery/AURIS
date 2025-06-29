import os
import logging
import asyncio
from typing import Dict, Any, Optional, List
from pathlib import Path
import shutil
from datetime import datetime
from .model_loader import model_loader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelManager:
    """
    Manages model downloading, installation, and status tracking.
    """
    
    def __init__(self):
        self.models_dir = Path("../../models").resolve()
        self.cache_dir = Path("../../model_cache").resolve()  # For temporary downloads
        self.base_model_name = "unsloth/tinyllama-chat-bnb-4bit"
        
        # Ensure directories exist
        self.models_dir.mkdir(exist_ok=True)
        self.cache_dir.mkdir(exist_ok=True)
        
        # Model status tracking
        self.download_status = {}
        self.installation_status = {}
        
        # Required models
        self.required_models = {
            "base": {
                "name": "unsloth/tinyllama-chat-bnb-4bit",
                "type": "base_model",
                "size_gb": 2.5,
                "description": "Base TinyLlama model for all agents"
            },
            "evaluation": {
                "name": "tinyllama-chat-bnb-4bit_agent1",
                "type": "adapter",
                "size_gb": 0.1,
                "description": "Evaluation agent adapter"
            },
            "analysis": {
                "name": "tinyllama-chat-bnb-4bit_agent2", 
                "type": "adapter",
                "size_gb": 0.1,
                "description": "Analysis agent adapter"
            },
            "recommendation": {
                "name": "tinyllama-chat-bnb-4bit_agent3",
                "type": "adapter", 
                "size_gb": 0.1,
                "description": "Recommendation agent adapter"
            }
        }
        
        self.model_loader = model_loader
        self.base_model_loaded = False
    
    def get_model_status(self) -> Dict[str, Any]:
        """
        Get status of all models.
        """
        status = self.model_loader.get_model_status()
        
        # Add additional status information
        status.update({
            "total_required": len(self.model_loader.adapters),
            "total_installed": sum(1 for info in status["adapters"].values() 
                                 if info["installed"]),
            "system_ready": status["base_model_loaded"] and 
                          all(info["installed"] for info in status["adapters"].values())
        })
        
        return status
    
    def _check_model_installed(self, model_path: Path, model_type: str) -> bool:
        """
        Check if a model is properly installed.
        """
        if not model_path.exists():
            return False
        
        if model_type == "base_model":
            # For base model, check if it can be loaded
            try:
                from unsloth import FastLanguageModel
                # Just check if the path exists and has model files
                return (model_path / "config.json").exists() or (model_path / "model.safetensors").exists()
            except ImportError:
                return False
        
        elif model_type == "adapter":
            # For adapters, check for required files
            required_files = [
                "adapter_config.json",
                "adapter_model.safetensors", 
                "tokenizer.json",
                "tokenizer_config.json"
            ]
            return all((model_path / file).exists() for file in required_files)
        
        return False
    
    async def download_base_model(self, progress_callback=None) -> Dict[str, Any]:
        """
        Download the base model from Hugging Face.
        """
        model_key = "base"
        model_info = self.required_models[model_key]
        
        try:
            self.download_status[model_key] = "downloading"
            if progress_callback:
                progress_callback(model_key, "downloading", 0)
            
            logger.info(f"Starting download of base model: {model_info['name']}")
            
            # Import here to avoid issues if not installed
            from huggingface_hub import snapshot_download
            from transformers import AutoTokenizer
            
            # Download model files
            model_path = self.models_dir / model_info["name"]
            model_path.mkdir(exist_ok=True)
            
            # Download with progress tracking
            def progress_fn(repo_id, revision, filename, size):
                if progress_callback:
                    # Calculate progress (rough estimate)
                    progress = min(90, int((size or 0) / (model_info["size_gb"] * 1024 * 1024 * 1024) * 100))
                    progress_callback(model_key, "downloading", progress)
            
            snapshot_download(
                repo_id=model_info["name"],
                local_dir=str(model_path),
                local_dir_use_symlinks=False,
                progress_callback=progress_fn
            )
            
            # Download tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_info["name"])
            tokenizer.save_pretrained(str(model_path))
            
            self.download_status[model_key] = "completed"
            self.installation_status[model_key] = "installed"
            
            if progress_callback:
                progress_callback(model_key, "completed", 100)
            
            logger.info(f"Successfully downloaded base model to {model_path}")
            
            return {
                "success": True,
                "message": f"Base model downloaded successfully to {model_path}",
                "model_path": str(model_path)
            }
            
        except Exception as e:
            self.download_status[model_key] = "failed"
            error_msg = f"Failed to download base model: {str(e)}"
            logger.error(error_msg)
            
            if progress_callback:
                progress_callback(model_key, "failed", 0)
            
            return {
                "success": False,
                "message": error_msg
            }
    
    async def install_sample_adapters(self, progress_callback=None) -> Dict[str, Any]:
        """
        Create sample adapter directories with placeholder files for testing.
        """
        try:
            logger.info("Creating sample adapter directories")
            
            results = {}
            
            for model_key in ["evaluation", "analysis", "recommendation"]:
                if model_key == "base":
                    continue
                    
                model_info = self.required_models[model_key]
                adapter_path = self.models_dir / model_info["name"]
                
                try:
                    self.installation_status[model_key] = "installing"
                    if progress_callback:
                        progress_callback(model_key, "installing", 0)
                    
                    # Create adapter directory
                    adapter_path.mkdir(exist_ok=True)
                    
                    # Create placeholder files
                    placeholder_files = {
                        "adapter_config.json": '{"base_model_name_or_path": "unsloth/tinyllama-chat-bnb-4bit", "bias": "none", "enable_lora": null, "fan_in_fan_out": false, "inference_mode": true, "lora_alpha": 16, "lora_dropout": 0.0, "modules_to_save": null, "peft_type": "LORA", "r": 16, "revision": null, "target_modules": ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"], "task_type": "CAUSAL_LM"}',
                        "adapter_model.safetensors": "",  # Empty file for now
                        "tokenizer.json": '{"version": "1.0", "truncation": null, "padding": null, "added_tokens": [], "normalizer": {"type": "Sequence", "normalizers": [{"type": "Prepend", "prepend": "▁"}]}, "pre_tokenizer": {"type": "Sequence", "pretokenizers": [{"type": "Split", "pattern": {"String": " "}, "behavior": "Removed", "invert": false}]}, "post_processor": null, "decoder": null, "model": {"type": "BPE", "vocab": {"<unk>": 0, "<s>": 1, "</s>": 2}, "merges": []}}',
                        "tokenizer_config.json": '{"model_type": "llama", "tokenizer_class": "LlamaTokenizer", "pad_token": null, "unk_token": "<unk>", "bos_token": "<s>", "eos_token": "</s>", "clean_up_tokenization_spaces": false, "use_fast": true, "model_max_length": 2048}',
                        "special_tokens_map.json": '{"unk_token": "<unk>", "bos_token": "<s>", "eos_token": "</s>", "pad_token": null}',
                        "README.md": f"# {model_info['name']}\n\nThis is a placeholder adapter for {model_key} agent.\n\n**Note**: This is a sample adapter for testing purposes. Replace with your actual fine-tuned adapter."
                    }
                    
                    for filename, content in placeholder_files.items():
                        file_path = adapter_path / filename
                        if filename == "adapter_model.safetensors":
                            # Create empty file
                            file_path.touch()
                        else:
                            with open(file_path, 'w', encoding='utf-8') as f:
                                f.write(content)
                    
                    self.installation_status[model_key] = "installed"
                    if progress_callback:
                        progress_callback(model_key, "completed", 100)
                    
                    results[model_key] = {
                        "success": True,
                        "message": f"Sample adapter created at {adapter_path}"
                    }
                    
                except Exception as e:
                    self.installation_status[model_key] = "failed"
                    error_msg = f"Failed to create sample adapter for {model_key}: {str(e)}"
                    logger.error(error_msg)
                    
                    if progress_callback:
                        progress_callback(model_key, "failed", 0)
                    
                    results[model_key] = {
                        "success": False,
                        "message": error_msg
                    }
            
            return {
                "success": True,
                "message": "Sample adapters created successfully",
                "results": results
            }
            
        except Exception as e:
            error_msg = f"Failed to install sample adapters: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "message": error_msg
            }
    
    async def install_all_models(self, progress_callback=None) -> Dict[str, Any]:
        """
        Install all required models.
        """
        try:
            logger.info("Starting installation of all required models")
            
            # First, download base model
            base_result = await self.download_base_model(progress_callback)
            if not base_result["success"]:
                return base_result
            
            # Then create sample adapters
            adapters_result = await self.install_sample_adapters(progress_callback)
            if not adapters_result["success"]:
                return adapters_result
            
            return {
                "success": True,
                "message": "All models installed successfully",
                "base_model": base_result,
                "adapters": adapters_result
            }
            
        except Exception as e:
            error_msg = f"Failed to install models: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "message": error_msg
            }
    
    def cleanup_cache(self):
        """
        Clean up temporary cache files.
        """
        try:
            if self.cache_dir.exists():
                shutil.rmtree(self.cache_dir)
                self.cache_dir.mkdir(exist_ok=True)
                logger.info("Cache cleaned up successfully")
        except Exception as e:
            logger.error(f"Failed to cleanup cache: {e}")
    
    def load_base_model(self) -> bool:
        """Load the base model."""
        try:
            success = self.model_loader.load_base_model()
            if success:
                self.base_model_loaded = True
                logger.info("✅ Base model loaded successfully")
            else:
                logger.error("❌ Failed to load base model")
            return success
        except Exception as e:
            logger.error(f"Error loading base model: {e}")
            return False
    
    def load_adapter(self, adapter_name: str) -> bool:
        """Load a specific adapter."""
        try:
            adapter_model = self.model_loader.load_adapter(adapter_name)
            if adapter_model:
                logger.info(f"✅ Adapter {adapter_name} loaded successfully")
                return True
            else:
                logger.error(f"❌ Failed to load adapter {adapter_name}")
                return False
        except Exception as e:
            logger.error(f"Error loading adapter {adapter_name}: {e}")
            return False
    
    def generate_response(self, prompt: str, adapter_name: Optional[str] = None) -> str:
        """Generate a response using the model."""
        if not self.base_model_loaded:
            # Try to load base model if not loaded
            if not self.load_base_model():
                return "Error: Cannot load base model"
        
        return self.model_loader.generate_response(prompt, adapter_name)
    
    def is_system_ready(self) -> bool:
        """Check if the entire system is ready."""
        status = self.get_model_status()
        return status["system_ready"]
    
    def get_installation_progress(self) -> Dict[str, Any]:
        """Get installation progress information."""
        status = self.get_model_status()
        
        total_models = status["total_required"] + 1  # +1 for base model
        installed_models = status["total_installed"]
        if status["base_model_loaded"]:
            installed_models += 1
        
        progress = (installed_models / total_models) * 100
        
        return {
            "total_models": total_models,
            "installed_models": installed_models,
            "progress_percentage": round(progress, 1),
            "base_model_ready": status["base_model_loaded"],
            "adapters_ready": status["total_installed"] == status["total_required"]
        }

# Global model manager instance
model_manager = ModelManager() 