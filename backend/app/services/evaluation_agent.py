import logging
import json
from typing import Dict, Any, List, Optional
from .model_loader import model_loader

logger = logging.getLogger(__name__)

class EvaluationAgent:
    """
    Agent responsible for evaluating chat logs and generating evaluation metrics.
    """
    
    def __init__(self):
        self.agent_type = "evaluation"
        self.guidelines = [
            "Acknowledge and Empathize",
            "Set Clear Expectations", 
            "Proactive Help"
        ]
    
    async def process_chat_log(self, transcript: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Process a chat log and return evaluation results.
        
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            
        Returns:
            Dictionary containing evaluation results
        """
        try:
            logger.info("Starting evaluation agent processing")
            
            # Ensure base model is loaded
            if model_loader.base_model is None:
                success = model_loader.load_base_model()
                if not success:
                    logger.error("Failed to load base model")
                    return self._create_error_response("Failed to load base model")
            
            # Prepare transcript for model input
            formatted_transcript = self._format_transcript(transcript)
            
            # Generate evaluation using the model
            evaluation_result = await self._generate_evaluation(formatted_transcript)
            
            # Parse the model output
            parsed_result = self._parse_evaluation_output(evaluation_result)
            
            logger.info("Evaluation agent processing completed")
            return {
                "status": "completed",
                "agent_type": self.agent_type,
                "result": parsed_result
            }
            
        except Exception as e:
            logger.error(f"Error in evaluation agent: {e}")
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
    
    async def _generate_evaluation(self, formatted_transcript: str) -> str:
        """
        Generate evaluation using the loaded model.
        """
        try:
            # Create prompt for evaluation
            prompt = f"""
            Please evaluate the following customer service chat transcript and provide:
            1. Coherence score (0-5): How well the conversation flows
            2. Relevance score (0-5): How relevant the responses are to customer needs
            3. Politeness score (0-5): How polite and professional the agent is
            4. Resolution score (0-1): Whether the customer's issue was resolved
            5. Reasoning for each score
            6. Overall evaluation summary

            {formatted_transcript}

            Please respond in the following JSON format:
            {{
                "coherence": 4.2,
                "relevance": 3.8,
                "politeness": 4.5,
                "resolution": 0.8,
                "reasoning": {{
                    "coherence": "The conversation flows well with logical progression...",
                    "relevance": "The agent addresses the customer's concerns...",
                    "politeness": "The agent maintains a professional and courteous tone...",
                    "resolution": "The customer's issue appears to be resolved..."
                }},
                "evaluation_summary": "Overall, this was a good customer service interaction..."
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
            logger.error(f"Error generating evaluation: {e}")
            raise e
    
    def _parse_evaluation_output(self, model_output: str) -> Dict[str, Any]:
        """
        Parse the model output into structured evaluation data.
        """
        try:
            # Try to parse as JSON
            if model_output.strip().startswith('{'):
                parsed = json.loads(model_output)
                
                return {
                    "coherence": parsed.get("coherence", 0.0),
                    "relevance": parsed.get("relevance", 0.0),
                    "politeness": parsed.get("politeness", 0.0),
                    "resolution": parsed.get("resolution", 0.0),
                    "reasoning": {
                        "coherence": parsed.get("reasoning", {}).get("coherence", "N/A"),
                        "relevance": parsed.get("reasoning", {}).get("relevance", "N/A"),
                        "politeness": parsed.get("reasoning", {}).get("politeness", "N/A"),
                        "resolution": parsed.get("reasoning", {}).get("resolution", "N/A")
                    },
                    "evaluation_summary": parsed.get("evaluation_summary", "N/A"),
                    "error_message": None
                }
            else:
                # Fallback if JSON parsing fails
                return {
                    "coherence": 0.0,
                    "relevance": 0.0,
                    "politeness": 0.0,
                    "resolution": 0.0,
                    "reasoning": {
                        "coherence": "N/A",
                        "relevance": "N/A", 
                        "politeness": "N/A",
                        "resolution": "N/A"
                    },
                    "evaluation_summary": "N/A",
                    "error_message": "Failed to parse model output"
                }
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse evaluation output as JSON: {e}")
            return {
                "coherence": 0.0,
                "relevance": 0.0,
                "politeness": 0.0,
                "resolution": 0.0,
                "reasoning": {
                    "coherence": "N/A",
                    "relevance": "N/A",
                    "politeness": "N/A", 
                    "resolution": "N/A"
                },
                "evaluation_summary": "N/A",
                "error_message": f"JSON parsing error: {str(e)}"
            }
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """
        Create a standardized error response.
        """
        return {
            "coherence": 0.0,
            "relevance": 0.0,
            "politeness": 0.0,
            "resolution": 0.0,
            "reasoning": {
                "coherence": "N/A",
                "relevance": "N/A",
                "politeness": "N/A",
                "resolution": "N/A"
            },
            "evaluation_summary": "N/A",
            "error_message": error_message
        }

# Global evaluation agent instance
evaluation_agent = EvaluationAgent() 