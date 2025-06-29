import logging
from typing import Dict, Any, List
from .ollama_service import ollama_service

logger = logging.getLogger(__name__)

class AnalysisAgent:
    """
    Simplified analysis agent that works with Ollama.
    """
    
    def __init__(self):
        self.name = "analysis_agent"
    
    async def analyze_chat(self, transcript: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Analyze a chat conversation using Ollama.
        
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Check if Ollama is running
            if not ollama_service.is_ollama_running():
                return {
                    "error_message": "Ollama is not running",
                    "analysis": None
                }
            
            # Get available models
            available_models = ollama_service.get_available_models()
            if not available_models:
                return {
                    "error_message": "No models available in Ollama",
                    "analysis": None
                }
            
            # Use the first available model
            model_name = available_models[0]["name"]
            
            # Format transcript for analysis
            transcript_text = self._format_transcript(transcript)
            
            # Create analysis prompt
            analysis_prompt = f"""
            Analyze this customer service conversation and provide:
            1. Key topics and themes discussed
            2. Customer emotions and sentiment
            3. Agent performance assessment
            4. Communication effectiveness
            5. Potential improvements
            
            Conversation:
            {transcript_text}
            
            Please provide a detailed analysis.
            """
            
            # Generate analysis using Ollama
            response = ollama_service.test_generation(model_name, analysis_prompt)
            
            if response.startswith("Error"):
                return {
                    "error_message": response,
                    "analysis": None
                }
            
            return {
                "analysis": {
                    "insights": response,
                    "model_used": model_name,
                    "agent": self.name
                },
                "error_message": None
            }
            
        except Exception as e:
            logger.error(f"Error in analysis agent: {e}")
            return {
                "error_message": str(e),
                "analysis": None
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

# Global analysis agent instance
analysis_agent = AnalysisAgent() 