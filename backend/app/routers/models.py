from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import json
import asyncio
from typing import Dict, Any
import logging
import threading
import time

from ..services.model_manager import model_manager
from ..services.model_loader import model_loader

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/models", tags=["models"])

# Store installation progress
installation_progress = {}

def progress_callback(model_key: str, status: str, progress: int):
    """Callback function to track installation progress"""
    installation_progress[model_key] = {
        "status": status,
        "progress": progress,
        "timestamp": time.time()
    }

@router.get("/status")
async def get_model_status():
    """
    Get the status of all models (installed, downloading, etc.)
    """
    try:
        # Use the new flexible model loader status
        status = model_loader.get_model_status()
        
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")

@router.post("/load")
async def load_base_model(request: Dict[str, Any]):
    """
    Load a specific base model by name
    """
    try:
        model_name = request.get("model_name")
        if not model_name:
            raise HTTPException(status_code=400, detail="model_name is required")
        
        success = model_loader.load_base_model(model_name)
        
        if success:
            return {
                "success": True,
                "message": f"Base model {model_name} loaded successfully",
                "data": {"loaded": True, "model_name": model_name}
            }
        else:
            return {
                "success": False,
                "message": f"Failed to load base model {model_name}",
                "data": {"loaded": False}
            }
            
    except Exception as e:
        logger.error(f"Failed to load base model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load base model: {str(e)}")

@router.post("/test-generation")
async def test_model_generation(request: Dict[str, Any]):
    """
    Test model generation with optional adapter
    """
    try:
        adapter_name = request.get("adapter_name")
        
        # Test prompt
        test_prompt = "Hello, how are you today?"
        
        # Generate response
        response = model_loader.generate_response(test_prompt, adapter_name, max_length=50)
        
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
        # Transform the status to match frontend expectations
        transformed_status = {
            "models": {},
            "total_installed": status.get("total_installed", 0),
            "total_required": status.get("total_required", 0),
            "system_ready": status.get("system_ready", False)
        }
        
        # Transform base model status
        transformed_status["models"]["base"] = {
            "name": "TinyLlama-1.1B-Chat",
            "type": "base",
            "description": "Base language model for all agents",
            "size_gb": 2.5,
            "installed": status.get("base_model_loaded", False),
            "path": str(model_loader.models_dir),
            "download_status": "completed" if status.get("base_model_loaded", False) else "not_started",
            "installation_status": "installed" if status.get("base_model_loaded", False) else "not_installed"
        }
        
        # Transform adapter statuses
        for adapter_name, adapter_info in status.get("adapters", {}).items():
            transformed_status["models"][adapter_name] = {
                "name": f"{adapter_name.capitalize()} Agent",
                "type": "adapter",
                "description": f"Fine-tuned adapter for {adapter_name} tasks",
                "size_gb": adapter_info.get("size_gb", 0.1),
                "installed": adapter_info.get("installed", False),
                "path": adapter_info.get("path", ""),
                "download_status": "completed" if adapter_info.get("installed", False) else "not_started",
                "installation_status": "installed" if adapter_info.get("installed", False) else "not_installed"
            }
        
        return {
            "success": True,
            "data": transformed_status
        }
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")

@router.post("/install/base")
async def install_base_model(background_tasks: BackgroundTasks):
    """
    Download and install the base model
    """
    try:
        # Check if already installed
        status = model_manager.get_model_status()
        if status.get("base_model_loaded", False):
            return {
                "success": True,
                "message": "Base model already installed",
                "data": {"installed": True}
            }
        
        # Start installation in background
        background_tasks.add_task(
            download_base_model_task,
            progress_callback
        )
        
        return {
            "success": True,
            "message": "Base model installation started",
            "task_id": "base_model_installation"
        }
        
    except Exception as e:
        logger.error(f"Failed to start base model installation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start installation: {str(e)}")

async def download_base_model_task(progress_callback):
    """Background task to download and load the base model"""
    try:
        progress_callback("base", "downloading", 10)
        
        # Simulate download progress
        for progress in [25, 50, 75, 90]:
            await asyncio.sleep(2)  # Simulate download time
            progress_callback("base", "downloading", progress)
        
        # Actually load the model
        progress_callback("base", "loading", 95)
        success = model_manager.load_base_model()
        
        if success:
            progress_callback("base", "completed", 100)
            logger.info("✅ Base model installation completed")
        else:
            progress_callback("base", "failed", 0)
            logger.error("❌ Base model installation failed")
            
    except Exception as e:
        progress_callback("base", "failed", 0)
        logger.error(f"Base model installation failed: {e}")

@router.post("/install/adapters")
async def install_sample_adapters(background_tasks: BackgroundTasks):
    """
    Create sample adapter directories for testing
    """
    try:
        # Check if already installed
        status = model_manager.get_model_status()
        adapters_installed = all(
            status.get("adapters", {}).get(key, {}).get("installed", False)
            for key in ["evaluation", "analysis", "recommendation"]
        )
        
        if adapters_installed:
            return {
                "success": True,
                "message": "Sample adapters already installed",
                "data": {"installed": True}
            }
        
        # Start installation in background
        background_tasks.add_task(
            install_sample_adapters_task,
            progress_callback
        )
        
        return {
            "success": True,
            "message": "Sample adapters installation started",
            "task_id": "adapters_installation"
        }
        
    except Exception as e:
        logger.error(f"Failed to start adapters installation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start installation: {str(e)}")

async def install_sample_adapters_task(progress_callback):
    """Background task to install sample adapters"""
    try:
        adapters = ["evaluation", "analysis", "recommendation"]
        
        for i, adapter_name in enumerate(adapters):
            progress_callback(adapter_name, "installing", 0)
            
            # Simulate installation progress
            for progress in [25, 50, 75, 100]:
                await asyncio.sleep(1)  # Simulate installation time
                progress_callback(adapter_name, "installing", progress)
            
            # Create sample adapter directory
            adapter_path = model_loader.adapters[adapter_name]["path"]
            adapter_path.mkdir(parents=True, exist_ok=True)
            
            # Create sample files
            (adapter_path / "adapter_config.json").write_text('{"base_model_name": "TinyLlama/TinyLlama-1.1B-Chat-v1.0"}')
            (adapter_path / "adapter_model.safetensors").write_text("sample_adapter_weights")
            (adapter_path / "tokenizer.json").write_text("sample_tokenizer")
            
            progress_callback(adapter_name, "completed", 100)
            logger.info(f"✅ {adapter_name} adapter installation completed")
            
    except Exception as e:
        logger.error(f"Sample adapters installation failed: {e}")

@router.post("/install/all")
async def install_all_models(background_tasks: BackgroundTasks):
    """
    Install all required models (base model + sample adapters)
    """
    try:
        # Check current status
        status = model_manager.get_model_status()
        
        if status.get("system_ready", False):
            return {
                "success": True,
                "message": "All models already installed",
                "data": {"installed": True}
            }
        
        # Start installation in background
        background_tasks.add_task(
            install_all_models_task,
            progress_callback
        )
        
        return {
            "success": True,
            "message": "Model installation started",
            "task_id": "all_models_installation"
        }
        
    except Exception as e:
        logger.error(f"Failed to start model installation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start installation: {str(e)}")

async def install_all_models_task(progress_callback):
    """Background task to install all models"""
    try:
        # Install base model first
        await download_base_model_task(progress_callback)
        
        # Then install adapters
        await install_sample_adapters_task(progress_callback)
        
        logger.info("✅ All models installation completed")
        
    except Exception as e:
        logger.error(f"All models installation failed: {e}")

@router.get("/progress")
async def get_installation_progress():
    """
    Get the current installation progress for all models
    """
    try:
        # Combine model status with installation progress
        status = model_manager.get_model_status()
        
        progress_data = {
            "models": {},
            "overall_progress": 0,
            "total_models": len(status.get("adapters", {})) + 1,  # +1 for base model
            "completed_models": 0
        }
        
        total_progress = 0
        
        # Base model progress
        base_progress = installation_progress.get("base", {})
        progress_data["models"]["base"] = {
            "name": "TinyLlama-1.1B-Chat",
            "type": "base",
            "description": "Base language model for all agents",
            "size_gb": 2.5,
            "installed": status.get("base_model_loaded", False),
            "path": str(model_loader.models_dir),
            "download_status": base_progress.get("status", "not_started"),
            "installation_status": base_progress.get("status", "not_installed"),
            "installation_progress": base_progress.get("progress", 0)
        }
        
        if status.get("base_model_loaded", False):
            progress_data["completed_models"] += 1
            total_progress += 100
        else:
            total_progress += base_progress.get("progress", 0)
        
        # Adapter progress
        for adapter_name, adapter_info in status.get("adapters", {}).items():
            adapter_progress = installation_progress.get(adapter_name, {})
            
            progress_data["models"][adapter_name] = {
                "name": f"{adapter_name.capitalize()} Agent",
                "type": "adapter",
                "description": f"Fine-tuned adapter for {adapter_name} tasks",
                "size_gb": adapter_info.get("size_gb", 0.1),
                "installed": adapter_info.get("installed", False),
                "path": adapter_info.get("path", ""),
                "download_status": adapter_progress.get("status", "not_started"),
                "installation_status": adapter_progress.get("status", "not_installed"),
                "installation_progress": adapter_progress.get("progress", 0)
            }
            
            if adapter_info.get("installed", False):
                progress_data["completed_models"] += 1
                total_progress += 100
            else:
                total_progress += adapter_progress.get("progress", 0)
        
        if progress_data["total_models"] > 0:
            progress_data["overall_progress"] = total_progress // progress_data["total_models"]
        
        return {
            "success": True,
            "data": progress_data
        }
        
    except Exception as e:
        logger.error(f"Failed to get installation progress: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get progress: {str(e)}")

@router.get("/progress/stream")
async def stream_installation_progress():
    """
    Stream installation progress updates
    """
    async def generate():
        while True:
            try:
                progress_data = await get_installation_progress()
                yield f"data: {json.dumps(progress_data)}\n\n"
                
                # Check if all models are installed
                if progress_data["data"]["completed_models"] == progress_data["data"]["total_models"]:
                    yield f"data: {json.dumps({'type': 'complete', 'message': 'All models installed'})}\n\n"
                    break
                
                await asyncio.sleep(2)  # Update every 2 seconds
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                break
    
    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )

@router.get("/test")
async def test_model_loading():
    """
    Test if models can be loaded successfully
    """
    try:
        # Try to load base model
        success = model_manager.load_base_model()
        
        if not success:
            return {
                "success": False,
                "message": "Failed to load base model"
            }
        
        # Test generation
        test_prompt = "Hello, how are you?"
        response = model_manager.generate_response(test_prompt)
        
        if response and not response.startswith("Error"):
            return {
                "success": True,
                "message": "Model loading test passed",
                "data": {
                    "test_response": response[:100] + "..." if len(response) > 100 else response
                }
            }
        else:
            return {
                "success": False,
                "message": f"Model generation failed: {response}"
            }
            
    except Exception as e:
        logger.error(f"Model loading test failed: {e}")
        return {
            "success": False,
            "message": f"Model loading test failed: {str(e)}"
        }

@router.delete("/cache")
async def cleanup_cache():
    """
    Clean up model cache and temporary files
    """
    try:
        # Clear installation progress
        installation_progress.clear()
        
        # Clear model cache if needed
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        return {
            "success": True,
            "message": "Cache cleaned up successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup cache: {str(e)}") 