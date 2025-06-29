from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
import json
import asyncio
from typing import Dict, Any, List
import logging
import time
import subprocess

from ..services.ollama_service import ollama_service
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/models", tags=["models"])

@router.get("/status")
async def get_model_status():
    """
    Get the status of Ollama models and system information
    """
    try:
        status = ollama_service.get_model_status()
        
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")

@router.get("/list")
async def get_models() -> Dict[str, Any]:
    """Get list of available models and current model status"""
    try:
        available_models = ollama_service.get_available_models()
        current_model = ollama_service.get_current_model()
        default_model = ollama_service.get_default_model()
        
        return {
            "success": True,
            "data": {
                "models": available_models,
                "current_model": current_model,
                "default_model": default_model,
                "total_models": len(available_models)
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }

@router.post("/load")
async def load_model(request: Dict[str, Any]):
    """
    Load a specific model in Ollama
    """
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
        
        success = ollama_service.load_model(model_name)
        
        if success:
            return {
                "success": True,
                "message": f"Model {model_name} loaded successfully",
                "data": {"loaded": True, "model_name": model_name}
            }
        else:
            return {
                "success": False,
                "message": f"Failed to load model {model_name}",
                "data": {"loaded": False}
            }
            
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@router.post("/unload")
async def unload_model():
    """
    Unload the current model to free memory
    """
    try:
        success = ollama_service.unload_model()
        
        if success:
            return {
                "success": True,
                "message": "Model unloaded successfully",
                "data": {"unloaded": True}
            }
        else:
            return {
                "success": False,
                "message": "Failed to unload model",
                "data": {"unloaded": False}
            }
            
    except Exception as e:
        logger.error(f"Failed to unload model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to unload model: {str(e)}")

@router.post("/test-generation")
async def test_model_generation(request: Dict[str, Any]):
    """
    Test model generation with Ollama
    """
    try:
        model_name = request.get("model_name")
        prompt = request.get("prompt", "Hello, how are you today?")
        
        if not model_name:
            # Use current model if no specific model provided
            model_name = ollama_service.get_current_model()
            if not model_name:
                return {
                    "success": False,
                    "message": "No model loaded. Please load a model first.",
                    "data": {"response": "No model loaded"}
                }
        
        response = ollama_service.test_generation(model_name, prompt)
        
        if response.startswith("Error"):
            return {
                "success": False,
                "message": response,
                "data": {"response": response}
            }
        else:
            return {
                "success": True,
                "message": "Model generation test completed successfully",
                "data": {"response": response}
            }
            
    except Exception as e:
        logger.error(f"Failed to test model generation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to test model generation: {str(e)}")

@router.get("/system-info")
async def get_system_info():
    """
    Get system information (CPU, GPU, memory)
    """
    try:
        system_info = ollama_service.get_system_info()
        
        return {
            "success": True,
            "data": system_info
        }
    except Exception as e:
        logger.error(f"Failed to get system info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")

@router.get("/available")
async def get_available_models():
    """
    Get list of available models from Ollama
    """
    try:
        models = ollama_service.get_available_models()
        
        return {
            "success": True,
            "data": {
                "models": models,
                "count": len(models)
            }
        }
    except Exception as e:
        logger.error(f"Failed to get available models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get available models: {str(e)}")

@router.post("/pull")
async def pull_model(request: Dict[str, Any]):
    """
    Pull a model from Ollama registry
    """
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
        
        success = ollama_service.pull_model(model_name)
        
        if success:
            return {
                "success": True,
                "message": f"Model {model_name} pulled successfully",
                "data": {"pulled": True, "model_name": model_name}
            }
        else:
            return {
                "success": False,
                "message": f"Failed to pull model {model_name}",
                "data": {"pulled": False}
            }
            
    except Exception as e:
        logger.error(f"Failed to pull model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to pull model: {str(e)}")

@router.get("/health")
async def check_ollama_health():
    """
    Check if Ollama is running and healthy
    """
    try:
        is_running = ollama_service.is_ollama_running()
        
        return {
            "success": True,
            "data": {
                "ollama_running": is_running,
                "status": "healthy" if is_running else "not_running"
            }
        }
    except Exception as e:
        logger.error(f"Failed to check Ollama health: {e}")
        return {
            "success": False,
            "data": {
                "ollama_running": False,
                "status": "error",
                "error": str(e)
            }
        }

@router.post("/stop")
async def stop_model(request: Dict[str, Any]):
    """
    Unload (stop) a model from Ollama memory (does not delete from disk)
    """
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
        # Call ollama stop <model>
        result = subprocess.run(["ollama", "stop", model_name], capture_output=True, text=True)
        if result.returncode == 0:
            # Also clear current_model if it matches
            if ollama_service.get_current_model() == model_name:
                ollama_service.unload_model()
            return {"success": True, "message": f"Model {model_name} stopped/unloaded from memory."}
        else:
            return {"success": False, "message": result.stderr or f"Failed to stop model {model_name}"}
    except Exception as e:
        logger.error(f"Failed to stop/unload model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop/unload model: {str(e)}")

@router.post("/set-default/{model_name}")
async def set_default_model(model_name: str) -> Dict[str, Any]:
    """Set a model as the default model"""
    try:
        # Check if model exists
        available_models = ollama_service.get_available_models()
        model_names = [model.get("name", "") for model in available_models]
        
        if model_name not in model_names:
            return {
                "success": False,
                "message": f"Model {model_name} is not available"
            }
        
        # Update the default model in settings
        settings.DEFAULT_MODEL = model_name
        
        return {
            "success": True,
            "message": f"Default model set to {model_name}",
            "data": {
                "default_model": model_name
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        } 