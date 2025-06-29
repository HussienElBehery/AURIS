import logging
import json
from typing import Dict, Any, List, Optional
from .model_loader import model_loader

logger = logging.getLogger(__name__)

class RecommendationAgent:
    """
    Agent responsible for generating improvement recommendations for chat interactions.
    """
    
    def __init__(self):
        self.agent_type = "recommendation"
    
    async def process_chat_log(self, transcript: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Process a chat log and return recommendation results.
        
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            
        Returns:
            Dictionary containing recommendation results
        """
        try:
            logger.info("Starting recommendation agent processing")
            
            # Ensure base model is loaded
            if model_loader.base_model is None:
                success = model_loader.load_base_model()
                if not success:
                    logger.error("Failed to load base model")
                    return self._create_error_response("Failed to load base model")
            
            # Prepare transcript for model input
            formatted_transcript = self._format_transcript(transcript)
            
            # Generate recommendations using the model
            recommendation_result = await self._generate_recommendations(formatted_transcript)
            
            # Parse the model output
            parsed_result = self._parse_recommendation_output(recommendation_result)
            
            logger.info("Recommendation agent processing completed")
            return {
                "status": "completed",
                "agent_type": self.agent_type,
                "result": parsed_result
            }
            
        except Exception as e:
            logger.error(f"Error in recommendation agent: {e}")
            return {
                "status": "failed",
                "agent_type": self.agent_type,
                "error_message": str(e)
            }
    
    def _format_transcript(self, transcript: List[Dict[str, str]]) -> str:
        """
        Format transcript for model input.
        """
        formatted = "Chat Transcript:\n\n"
        for i, message in enumerate(transcript, 1):
            sender = message.get('sender', 'unknown')
            text = message.get('text', '')
            formatted += f"{i}. {sender.capitalize()}: {text}\n\n"
        
        return formatted
    
    async def _generate_recommendations(self, formatted_transcript: str) -> str:
        """
        Generate recommendations using the loaded model.
        """
        try:
            # Create prompt for recommendations
            prompt = f"""
            Please analyze the following customer service chat transcript and provide improvement recommendations:
            1. Identify the most problematic message from the agent
            2. Provide an improved version of that message
            3. Explain the reasoning for the improvement
            4. Provide coaching suggestions for the agent

            {formatted_transcript}

            Please respond in the following JSON format:
            {{
                "original_message": "The specific message that needs improvement",
                "improved_message": "The improved version of the message",
                "reasoning": "Explanation of why this improvement is better",
                "coaching_suggestions": [
                    "Be more concise and direct",
                    "Show more empathy towards the customer's situation",
                    "Provide specific next steps"
                ]
            }}
            """
            
            # Generate response using the current model_loader API
            response = model_loader.generate_response(prompt, self.agent_type, max_length=512)
            
            # Extract the JSON part from the response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start != -1 and json_end != 0:
                json_response = response[json_start:json_end]
                return json_response
            else:
                return response
                
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            raise e
    
    def _parse_recommendation_output(self, model_output: str) -> Dict[str, Any]:
        """
        Parse the model output into structured recommendation data.
        """
        try:
            # Try to parse as JSON
            if model_output.strip().startswith('{'):
                parsed = json.loads(model_output)
                
                return {
                    "original_message": parsed.get("original_message", "N/A"),
                    "improved_message": parsed.get("improved_message", "N/A"),
                    "reasoning": parsed.get("reasoning", "N/A"),
                    "coaching_suggestions": parsed.get("coaching_suggestions", []),
                    "error_message": None
                }
            else:
                # Fallback if JSON parsing fails
                return {
                    "original_message": "N/A",
                    "improved_message": "N/A",
                    "reasoning": "N/A",
                    "coaching_suggestions": [],
                    "error_message": "Failed to parse model output"
                }
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse recommendation output as JSON: {e}")
            return {
                "original_message": "N/A",
                "improved_message": "N/A",
                "reasoning": "N/A",
                "coaching_suggestions": [],
                "error_message": f"JSON parsing error: {str(e)}"
            }
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """
        Create a standardized error response.
        """
        return {
            "original_message": "N/A",
            "improved_message": "N/A",
            "reasoning": "N/A",
            "coaching_suggestions": [],
            "error_message": error_message
        }

# Global recommendation agent instance
recommendation_agent = RecommendationAgent() 