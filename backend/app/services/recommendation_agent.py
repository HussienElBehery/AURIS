import logging
from typing import Dict, Any, List
from .ollama_service import ollama_service

logger = logging.getLogger(__name__)

class RecommendationAgent:
    """
    Simplified recommendation agent that works with Ollama.
    """
    
    def __init__(self):
        self.name = "recommendation_agent"
    
    async def generate_recommendations(self, transcript: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Generate recommendations based on a chat conversation using Ollama.
        
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            
        Returns:
            Dictionary containing recommendation results
        """
        try:
            # Check if Ollama is running
            if not ollama_service.is_ollama_running():
                return {
                    "error_message": "Ollama is not running",
                    "recommendations": None
                }
            
            # Get available models
            available_models = ollama_service.get_available_models()
            if not available_models:
                return {
                    "error_message": "No models available in Ollama",
                    "recommendations": None
                }
            
            # Use the first available model
            model_name = available_models[0]["name"]
            
            # Format transcript for recommendations
            transcript_text = self._format_transcript(transcript)
            
            # Create recommendation prompt
            recommendation_prompt = f"""
            Based on this customer service conversation, provide:
            1. Specific recommendations for the agent
            2. Training suggestions
            3. Process improvements
            4. Best practices to follow
            5. Areas for skill development
            
            Conversation:
            {transcript_text}
            
            Please provide actionable recommendations.
            """
            
            # Generate recommendations using Ollama
            response = ollama_service.test_generation(model_name, recommendation_prompt)
            
            if response.startswith("Error"):
                return {
                    "error_message": response,
                    "recommendations": None
                }
            
            return {
                "recommendations": {
                    "suggestions": response,
                    "model_used": model_name,
                    "agent": self.name
                },
                "error_message": None
            }
            
        except Exception as e:
            logger.error(f"Error in recommendation agent: {e}")
            return {
                "error_message": str(e),
                "recommendations": None
            }
    
    def _format_transcript(self, transcript: List[Dict[str, str]]) -> str:
        """Format transcript for recommendations."""
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

# Global recommendation agent instance
recommendation_agent = RecommendationAgent() 