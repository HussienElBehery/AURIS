import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import uuid
from .ollama_service import ollama_service
from .evaluation_agent import evaluation_agent
from .analysis_agent import analysis_agent

logger = logging.getLogger(__name__)

class ProcessingPipeline:
    """
    Processing pipeline that integrates evaluation, analysis, and recommendation agents.
    """
    
    def __init__(self):
        self.current_model = None
        self.results_cache = {}
    
    async def process_chat_log(self, transcript: List[Dict[str, str]], chat_log_id: str) -> Dict[str, Any]:
        """
        Process a chat log using all agents.
        
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            chat_log_id: ID of the chat log being processed
            
        Returns:
            Dictionary containing processing results from all agents
        """
        results = {
            "chat_log_id": chat_log_id,
            "processing_id": str(uuid.uuid4()),
            "start_time": datetime.utcnow().isoformat(),
            "agents": {},
            "overall_status": "processing",
            "error_messages": {},
        }
        self.results_cache[chat_log_id] = results
        try:
            logger.info(f"Starting processing pipeline for chat_log_id: {chat_log_id}")
            
            # Check if Ollama is running
            if not ollama_service.is_ollama_running():
                error_msg = "Ollama is not running"
                logger.error(error_msg)
                results["overall_status"] = "failed"
                results["error_messages"]["ollama"] = error_msg
                return results
            
            # Get available models
            available_models = ollama_service.get_available_models()
            if not available_models:
                error_msg = "No models available in Ollama"
                logger.error(error_msg)
                results["overall_status"] = "failed"
                results["error_messages"]["models"] = error_msg
                return results
            
            # Use default model or first available model
            default_model = ollama_service.get_default_model()
            model_name = default_model
            
            # Check if default model is available, otherwise use first available
            model_names = [model.get("name", "") for model in available_models]
            if default_model not in model_names:
                logger.warning(f"Default model {default_model} not available, using first available model")
                model_name = available_models[0]["name"]
            
            logger.info(f"Using model: {model_name}")
            
            # EVALUATION AGENT
            logger.info("Loading model for evaluation agent...")
            ollama_service.load_model(model_name)
            logger.info(f"Model loaded for evaluation: {model_name}")
            evaluation_result = await evaluation_agent.evaluate_chat(transcript, model_name)
            ollama_service.unload_model()
            logger.info(f"Model unloaded after evaluation: {model_name}")

            if evaluation_result.get("error_message"):
                results["agents"]["evaluation"] = {
                    "status": "failed",
                    "error_message": evaluation_result["error_message"]
                }
                results["error_messages"]["evaluation"] = evaluation_result["error_message"]
                results["overall_status"] = "processing"
            else:
                results["agents"]["evaluation"] = {
                    "status": "completed",
                    "result": evaluation_result["result"]
                }
            self.results_cache[chat_log_id] = results.copy()

            # ANALYSIS AGENT
            logger.info("Loading model for analysis agent...")
            ollama_service.load_model(model_name)
            logger.info(f"Model loaded for analysis: {model_name}")
            try:
                analysis_result = await self._run_analysis_agent(transcript, model_name)
                if analysis_result is None:
                    analysis_result = {
                        "key_issues": [],
                        "highlights": [],
                        "guidelines": [],
                        "analysis_summary": "Analysis failed: No result returned.",
                        "model_used": model_name,
                        "agent": "analysis_agent",
                        "error_message": "Analysis agent returned None."
                    }
                results["agents"]["analysis"] = {
                    "status": "completed",
                    "result": analysis_result
                }
                self.results_cache[chat_log_id] = results.copy()
            except Exception as e:
                error_msg = f"Analysis agent error: {str(e)}"
                logger.error(error_msg)
                results["agents"]["analysis"] = {
                    "status": "failed",
                    "error_message": error_msg
                }
                results["error_messages"]["analysis"] = error_msg
                self.results_cache[chat_log_id] = results.copy()
            ollama_service.unload_model()
            logger.info(f"Model unloaded after analysis: {model_name}")

            # RECOMMENDATION AGENT
            logger.info("Loading model for recommendation agent...")
            ollama_service.load_model(model_name)
            logger.info(f"Model loaded for recommendation: {model_name}")
            try:
                evaluation_summary = evaluation_result["result"].get("evaluation_summary") if evaluation_result.get("result") else ""
                analysis_summary = analysis_result.get("analysis_summary") if analysis_result else ""
                from .recommendation_agent import recommendation_agent
                recommendation_result = await recommendation_agent.generate_recommendations(transcript, evaluation_summary, analysis_summary, model_name=model_name)
                results["agents"]["recommendation"] = {
                    "status": "completed",
                    "result": recommendation_result
                }
                self.results_cache[chat_log_id] = results.copy()
            except Exception as e:
                error_msg = f"Recommendation agent error: {str(e)}"
                logger.error(error_msg)
                results["agents"]["recommendation"] = {
                    "status": "failed",
                    "error_message": error_msg
                }
                results["error_messages"]["recommendation"] = error_msg
                self.results_cache[chat_log_id] = results.copy()
            ollama_service.unload_model()
            logger.info(f"Model unloaded after recommendation: {model_name}")

            # Determine overall status
            failed_agents = [agent for agent, data in results["agents"].items() if data["status"] == "failed"]
            if failed_agents:
                if len(failed_agents) == len(results["agents"]):
                    results["overall_status"] = "failed"
                else:
                    results["overall_status"] = "completed"  # Partial success
            else:
                results["overall_status"] = "completed"
            
            results["end_time"] = datetime.utcnow().isoformat()
            self.results_cache[chat_log_id] = results.copy()
            logger.info(f"Processing pipeline completed with status: {results['overall_status']}")
            
            # Final safety: unload model at the end
            try:
                logger.info(f"Final auto-unloading model {model_name} after processing completion")
                ollama_service.unload_model()
            except Exception as e:
                logger.warning(f"Failed to auto-unload model after processing: {e}")
            return results
            
        except Exception as e:
            logger.error(f"Error in processing pipeline: {e}")
            results["overall_status"] = "failed"
            results["error_messages"]["pipeline"] = str(e)
            self.results_cache[chat_log_id] = results.copy()
            return results
    
    async def _run_analysis_agent(self, transcript: List[Dict[str, str]], model_name: str) -> Dict[str, Any]:
        """Run the analysis agent with structured output and fallback."""
        guidelines = None  # Or pass a list to override
        result = await analysis_agent.analyze_chat(transcript, guidelines, model_name=model_name)
        return result
    
    async def _run_recommendation_agent(self, transcript: List[Dict[str, str]], model_name: str) -> Dict[str, Any]:
        """Run the recommendation agent (simplified version)."""
        transcript_text = self._format_transcript(transcript)
        
        recommendation_prompt = f"""
        Based on this customer service conversation, provide:
        1. Specific recommendations for improvement
        2. Coaching suggestions for the agent
        3. Best practices that could be applied
        4. Alternative response approaches
        
        Conversation:
        {transcript_text}
        
        Please provide actionable recommendations.
        """
        
        response = ollama_service.generate_evaluation(model_name, recommendation_prompt)
        
        if response.startswith("Error"):
            raise Exception(response)
        
        return {
            "recommendations": response,
            "model_used": model_name,
            "agent": "recommendation_agent"
        }
    
    def _format_transcript(self, transcript: List[Dict[str, str]]) -> str:
        """Format transcript for analysis."""
        formatted = []
        for message in transcript:
            sender = message.get("sender", "Unknown")
            text = message.get("text", "")
            timestamp = message.get("timestamp", "")
            
            if timestamp:
                formatted.append(f"[{timestamp}] {sender}: {text}")
            else:
                formatted.append(f"{sender}: {text}")
        return "\n".join(formatted)
    
    async def get_processing_status(self, chat_log_id: str) -> Dict[str, Any]:
        """
        Get the current processing status for a chat log.
        
        Args:
            chat_log_id: ID of the chat log
            
        Returns:
            Dictionary containing processing status
        """
        return {
            "chat_log_id": chat_log_id,
            "status": "unknown",
            "progress": {},
            "error_messages": {}
        }
    
    def cleanup(self):
        """
        Clean up resources.
        """
        logger.info("Processing pipeline cleanup completed")

# Global processing pipeline instance
processing_pipeline = ProcessingPipeline() 