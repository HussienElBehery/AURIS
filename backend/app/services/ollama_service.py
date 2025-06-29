import requests
import logging
import psutil
import json
import time
from typing import Dict, Any, List, Optional
from pathlib import Path
from ..config import settings

logger = logging.getLogger(__name__)

class OllamaService:
    """Service for interacting with Ollama API"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.current_model = None
        self._system_info_cache = {}
        self._cache_timestamp = 0
        self._cache_duration = 5  # Cache for 5 seconds
        
    def is_ollama_running(self) -> bool:
        """Check if Ollama is running"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=2)  # Reduced timeout
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Ollama not running: {e}")
            return False
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models from Ollama"""
        try:
            if not self.is_ollama_running():
                return []
            
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                models = []
                
                for model in data.get("models", []):
                    models.append({
                        "name": model.get("name", ""),
                        "tag": model.get("tag", ""),
                        "size": model.get("size", 0),
                        "modified_at": model.get("modified_at", ""),
                        "digest": model.get("digest", ""),
                        "details": model.get("details", {})
                    })
                
                return models
            else:
                logger.error(f"Failed to get models from Ollama: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting available models: {e}")
            return []
    
    def get_current_model(self) -> Optional[str]:
        """Get the currently loaded model"""
        try:
            if not self.is_ollama_running():
                return None
            
            # We'll track this internally since Ollama doesn't have a direct API for this
            return self.current_model
            
        except Exception as e:
            logger.error(f"Error getting current model: {e}")
            return None
    
    def load_model(self, model_name: str) -> bool:
        """Load a model in Ollama (set as current model)"""
        try:
            if not self.is_ollama_running():
                logger.error("Ollama is not running")
                return False
            
            # Check if model is available
            available_models = self.get_available_models()
            model_names = [model.get("name", "") for model in available_models]
            
            if model_name not in model_names:
                logger.error(f"Model {model_name} is not available")
                return False
            
            # Set as current model (Ollama loads models on-demand, so we just track it)
            self.current_model = model_name
            logger.info(f"✅ Model {model_name} set as current model")
            return True
                
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            return False
    
    def unload_model(self) -> bool:
        """Unload the current model to free memory"""
        try:
            if not self.is_ollama_running():
                logger.error("Ollama is not running")
                return False
            
            if not self.current_model:
                logger.info("No model currently loaded")
                return True
            
            # Clear the current model
            previous_model = self.current_model
            self.current_model = None
            logger.info(f"✅ Model {previous_model} unloaded successfully")
            return True
                
        except Exception as e:
            logger.error(f"Error unloading model: {e}")
            return False
    
    def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry"""
        try:
            if not self.is_ollama_running():
                logger.error("Ollama is not running")
                return False
            
            # Pull the model
            response = requests.post(f"{self.base_url}/api/pull", json={
                "name": model_name
            })
            
            if response.status_code == 200:
                logger.info(f"✅ Model {model_name} pulled successfully")
                return True
            else:
                logger.error(f"Failed to pull model {model_name}: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error pulling model {model_name}: {e}")
            return False
    
    def test_generation(self, model_name: str, prompt: str = "Hello, how are you?") -> str:
        """Test model generation"""
        try:
            if not self.is_ollama_running():
                return "Error: Ollama is not running"
            
            response = requests.post(f"{self.base_url}/api/generate", json={
                "model": model_name,
                "prompt": prompt,
                "stream": False
            }, timeout=120)  # Increased timeout to 2 minutes
            
            if response.status_code == 200:
                data = response.json()
                model_response = data.get("response", "No response generated")
                
                # Clean up the response (remove think tags if present)
                if "<think>" in model_response:
                    # Extract text after </think>
                    parts = model_response.split("</think>")
                    if len(parts) > 1:
                        model_response = parts[1].strip()
                    else:
                        # If no closing tag, remove everything before the first actual response
                        model_response = model_response.replace("<think>", "").strip()
                
                return model_response
            else:
                return f"Error: Failed to generate response ({response.status_code})"
                
        except requests.exceptions.Timeout:
            return "Error: Request timed out - model generation took too long"
        except Exception as e:
            logger.error(f"Error testing generation: {e}")
            return f"Error: {str(e)}"
    
    def generate_evaluation(self, model_name: str, prompt: str) -> str:
        """Generate evaluation response with extended timeout for complex tasks"""
        try:
            if not self.is_ollama_running():
                return "Error: Ollama is not running"
            
            logger.info(f"Starting evaluation generation with model: {model_name}")
            
            response = requests.post(f"{self.base_url}/api/generate", json={
                "model": model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Lower temperature for more consistent evaluation
                    "top_p": 0.9,
                    "num_predict": 2048  # Limit response length
                }
            }, timeout=300)  # 5 minutes timeout for evaluation tasks
            
            if response.status_code == 200:
                data = response.json()
                model_response = data.get("response", "No response generated")
                
                logger.info(f"Evaluation generation completed successfully")
                return model_response
            else:
                error_msg = f"Error: Failed to generate evaluation response ({response.status_code})"
                logger.error(error_msg)
                return error_msg
                
        except requests.exceptions.Timeout:
            error_msg = "Error: Request timed out - evaluation generation took too long"
            logger.error(error_msg)
            return error_msg
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            logger.error(f"Error in evaluation generation: {e}")
            return error_msg
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information including CPU and GPU (with caching)"""
        current_time = time.time()
        
        # Return cached info if still valid
        if (current_time - self._cache_timestamp) < self._cache_duration and self._system_info_cache:
            return self._system_info_cache
        
        try:
            # CPU information (faster measurement)
            cpu_info = {
                "count": psutil.cpu_count(),
                "percent": psutil.cpu_percent(interval=0.1),  # Reduced from 1 second to 0.1 seconds
                "frequency": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
            }
            
            # Memory information
            memory = psutil.virtual_memory()
            memory_info = {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used
            }
            
            # GPU information (simplified for speed)
            gpu_info = self._get_gpu_info_fast()
            
            system_info = {
                "cpu": cpu_info,
                "memory": memory_info,
                "gpu": gpu_info,
                "ollama_running": self.is_ollama_running()
            }
            
            # Cache the result
            self._system_info_cache = system_info
            self._cache_timestamp = current_time
            
            return system_info
            
        except Exception as e:
            logger.error(f"Error getting system info: {e}")
            return {
                "cpu": {"error": str(e)},
                "memory": {"error": str(e)},
                "gpu": {"error": str(e)},
                "ollama_running": False
            }
    
    def _get_gpu_info_fast(self) -> Dict[str, Any]:
        """Get GPU information (optimized for speed)"""
        try:
            # Quick check for CUDA availability
            try:
                import torch
                if torch.cuda.is_available():
                    return {
                        "available": True,
                        "count": torch.cuda.device_count(),
                        "gpus": [
                            {
                                "name": torch.cuda.get_device_name(i),
                                "memory_total": torch.cuda.get_device_properties(i).total_memory,
                                "memory_used": torch.cuda.memory_allocated(i),
                                "memory_free": torch.cuda.memory_reserved(i),
                                "utilization": 0
                            }
                            for i in range(torch.cuda.device_count())
                        ]
                    }
                else:
                    return {"available": False, "count": 0, "gpus": []}
            except ImportError:
                return {"available": False, "count": 0, "gpus": [], "error": "torch not available"}
                    
        except Exception as e:
            return {"available": False, "count": 0, "gpus": [], "error": str(e)}
    
    def _get_gpu_info(self) -> Dict[str, Any]:
        """Get GPU information (full version with nvidia-ml-py)"""
        try:
            # Try to use nvidia-ml-py if available
            try:
                import pynvml
                pynvml.nvmlInit()
                gpu_count = pynvml.nvmlDeviceGetCount()
                
                gpus = []
                for i in range(gpu_count):
                    handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                    name = pynvml.nvmlDeviceGetName(handle).decode('utf-8')
                    memory = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    
                    gpus.append({
                        "name": name,
                        "memory_total": memory.total,
                        "memory_used": memory.used,
                        "memory_free": memory.free,
                        "utilization": utilization.gpu
                    })
                
                pynvml.nvmlShutdown()
                return {"available": True, "count": gpu_count, "gpus": gpus}
                
            except ImportError:
                # Fallback: check if CUDA is available via torch
                try:
                    import torch
                    if torch.cuda.is_available():
                        return {
                            "available": True,
                            "count": torch.cuda.device_count(),
                            "gpus": [
                                {
                                    "name": torch.cuda.get_device_name(i),
                                    "memory_total": torch.cuda.get_device_properties(i).total_memory,
                                    "memory_used": torch.cuda.memory_allocated(i),
                                    "memory_free": torch.cuda.memory_reserved(i),
                                    "utilization": 0  # Not available without nvidia-ml-py
                                }
                                for i in range(torch.cuda.device_count())
                            ]
                        }
                    else:
                        return {"available": False, "count": 0, "gpus": []}
                except ImportError:
                    return {"available": False, "count": 0, "gpus": [], "error": "torch not available"}
                    
        except Exception as e:
            return {"available": False, "count": 0, "gpus": [], "error": str(e)}
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get comprehensive model and system status (optimized)"""
        try:
            # Get all data in parallel where possible
            ollama_running = self.is_ollama_running()
            
            if not ollama_running:
                return {
                    "available_models": [],
                    "current_model": None,
                    "system_info": self.get_system_info(),
                    "ollama_running": False,
                    "total_models": 0
                }
            
            # Get models and system info
            available_models = self.get_available_models()
            current_model = self.get_current_model()
            system_info = self.get_system_info()
            
            return {
                "available_models": available_models,
                "current_model": current_model,
                "system_info": system_info,
                "ollama_running": ollama_running,
                "total_models": len(available_models)
            }
            
        except Exception as e:
            logger.error(f"Error getting model status: {e}")
            return {
                "available_models": [],
                "current_model": None,
                "system_info": {"error": str(e)},
                "ollama_running": False,
                "total_models": 0
            }
    
    def get_default_model(self) -> str:
        """Get the default model from configuration"""
        return settings.DEFAULT_MODEL

# Global instance
ollama_service = OllamaService() 