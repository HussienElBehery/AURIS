import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

from .model_loader import model_loader
from .evaluation_agent import evaluation_agent
from .analysis_agent import analysis_agent
from .recommendation_agent import recommendation_agent

logger = logging.getLogger(__name__)

class ProcessingPipeline:
    """
    Orchestrates the processing of chat logs through all three agents.
    """
    
    def __init__(self):
        self.agents = {
            "evaluation": evaluation_agent,
            "analysis": analysis_agent,
            "recommendation": recommendation_agent
        }
    
    async def process_chat_log(self, transcript: List[Dict[str, str]], chat_log_id: str) -> Dict[str, Any]:
        """
        Process a chat log through all three agents sequentially.
        
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            chat_log_id: ID of the chat log being processed
            
        Returns:
            Dictionary containing results from all agents
        """
        try:
            logger.info(f"Starting processing pipeline for chat_log_id: {chat_log_id}")
            
            # Initialize results
            results = {
                "chat_log_id": chat_log_id,
                "processing_id": str(uuid.uuid4()),
                "start_time": datetime.utcnow().isoformat(),
                "agents": {},
                "overall_status": "processing",
                "error_messages": {}
            }
            
            # Load base model first
            logger.info("Loading base model...")
            base_model_loaded = await model_loader.load_base_model()
            if not base_model_loaded:
                error_msg = "Failed to load base model"
                logger.error(error_msg)
                results["overall_status"] = "failed"
                results["error_messages"]["base_model"] = error_msg
                return results
            
            # Process through each agent sequentially
            agent_order = ["evaluation", "analysis", "recommendation"]
            
            for agent_type in agent_order:
                try:
                    logger.info(f"Processing with {agent_type} agent...")
                    
                    # Update progress
                    results["agents"][agent_type] = {
                        "status": "processing",
                        "start_time": datetime.utcnow().isoformat(),
                        "error_message": None
                    }
                    
                    # Process with current agent
                    if agent_type == "evaluation":
                        agent_result = await evaluation_agent.evaluate_chat(transcript)
                    elif agent_type == "analysis":
                        agent_result = await analysis_agent.analyze_chat(transcript)
                    elif agent_type == "recommendation":
                        agent_result = await recommendation_agent.generate_recommendations(transcript)
                    else:
                        raise ValueError(f"Unknown agent type: {agent_type}")
                    
                    # Check for errors in agent result
                    if agent_result.get("error_message"):
                        results["agents"][agent_type]["status"] = "failed"
                        results["agents"][agent_type]["error_message"] = agent_result["error_message"]
                        results["error_messages"][agent_type] = agent_result["error_message"]
                        logger.error(f"{agent_type} agent failed: {agent_result['error_message']}")
                    else:
                        results["agents"][agent_type]["status"] = "completed"
                        results["agents"][agent_type]["result"] = agent_result
                        logger.info(f"{agent_type} agent completed successfully")
                    
                    # Unload current adapter to free memory
                    await model_loader.unload_current_adapter()
                    
                except Exception as e:
                    error_msg = f"Error in {agent_type} agent: {str(e)}"
                    logger.error(error_msg)
                    results["agents"][agent_type]["status"] = "failed"
                    results["agents"][agent_type]["error_message"] = error_msg
                    results["error_messages"][agent_type] = error_msg
                    
                    # Continue with next agent even if current one fails
                    continue
            
            # Determine overall status
            failed_agents = [agent for agent, data in results["agents"].items() 
                           if data["status"] == "failed"]
            
            if len(failed_agents) == len(agent_order):
                results["overall_status"] = "failed"
            elif len(failed_agents) > 0:
                results["overall_status"] = "partial_success"
            else:
                results["overall_status"] = "completed"
            
            results["end_time"] = datetime.utcnow().isoformat()
            logger.info(f"Processing pipeline completed with status: {results['overall_status']}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in processing pipeline: {e}")
            return {
                "chat_log_id": chat_log_id,
                "processing_id": str(uuid.uuid4()),
                "start_time": datetime.utcnow().isoformat(),
                "end_time": datetime.utcnow().isoformat(),
                "agents": {},
                "overall_status": "failed",
                "error_messages": {"pipeline": str(e)}
            }
    
    async def get_processing_status(self, chat_log_id: str) -> Dict[str, Any]:
        """
        Get the current processing status for a chat log.
        This would typically query the database for stored results.
        
        Args:
            chat_log_id: ID of the chat log
            
        Returns:
            Dictionary containing processing status
        """
        # This would typically query the database
        # For now, return a placeholder
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
        try:
            model_loader.cleanup()
            logger.info("Processing pipeline cleanup completed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

# Global processing pipeline instance
processing_pipeline = ProcessingPipeline() 