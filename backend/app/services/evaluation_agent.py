import logging
import json
import re
from typing import Dict, Any, List, Optional
from .ollama_service import ollama_service

logger = logging.getLogger(__name__)

class EvaluationAgent:
    """
    Evaluation agent that generates four specific metrics with reasoning.
    """
    
    def __init__(self):
        self.name = "evaluation_agent"
    
    async def evaluate_chat(self, transcript: List[Dict[str, str]], model_name: str = None) -> Dict[str, Any]:
        """
        Evaluate a chat conversation using the evaluation agent.
        
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            model_name: Name of the model to use (optional, will use default if not provided)
            
        Returns:
            Dictionary containing evaluation results or error message
        """
        try:
            logger.info("Starting chat evaluation...")
            
            # Use provided model or get default model
            if not model_name:
                model_name = ollama_service.get_default_model()
            
            logger.info(f"Using model: {model_name}")
            
            # Format transcript for evaluation
            formatted_transcript = self._format_transcript(transcript)
            
            # Create evaluation prompt
            evaluation_prompt = self._create_evaluation_prompt(formatted_transcript)
            
            logger.info("Generating evaluation response...")
            
            # Generate evaluation using Ollama
            response = ollama_service.generate_evaluation(model_name, evaluation_prompt)
            
            if response.startswith("Error"):
                return {
                    "error_message": response,
                    "result": None
                }
            
            # Parse the response to extract metrics
            try:
                # Clean the response to extract JSON
                cleaned_response = response.strip()
                
                # Remove think tags if present
                if "<think>" in cleaned_response:
                    # Extract text after </think>
                    parts = cleaned_response.split("</think>")
                    if len(parts) > 1:
                        cleaned_response = parts[1].strip()
                    else:
                        # If no closing tag, remove everything before the first actual response
                        cleaned_response = cleaned_response.replace("<think>", "").strip()
                
                # Try to find JSON in the response
                json_start = cleaned_response.find('{')
                json_end = cleaned_response.rfind('}') + 1
                
                if json_start != -1 and json_end > json_start:
                    json_str = cleaned_response[json_start:json_end]
                    parsed_result = json.loads(json_str)
                else:
                    # If no JSON found, try to parse the entire response
                    parsed_result = json.loads(cleaned_response)
                
                # Validate the structure
                required_fields = ["coherence", "relevance", "politeness", "resolution"]
                for field in required_fields:
                    if field not in parsed_result:
                        raise ValueError(f"Missing required field: {field}")
                    
                    if not isinstance(parsed_result[field], dict):
                        raise ValueError(f"Field {field} must be an object")
                    
                    if "score" not in parsed_result[field] or "reasoning" not in parsed_result[field]:
                        raise ValueError(f"Field {field} must have 'score' and 'reasoning' properties")
                
                # Validate score ranges
                for field in ["coherence", "relevance", "politeness"]:
                    score = parsed_result[field]["score"]
                    if not isinstance(score, (int, float)) or score < 1 or score > 5:
                        raise ValueError(f"{field} score must be between 1 and 5, got {score}")
                
                # Validate resolution score (should be 0 or 1)
                resolution_score = parsed_result["resolution"]["score"]
                if not isinstance(resolution_score, (int, float)) or resolution_score not in [0, 1]:
                    raise ValueError(f"Resolution score must be 0 or 1, got {resolution_score}")
                
                logger.info(f"Successfully parsed evaluation response with scores: coherence={parsed_result['coherence']['score']}, relevance={parsed_result['relevance']['score']}, politeness={parsed_result['politeness']['score']}, resolution={parsed_result['resolution']['score']}")
                
                # Add raw_output to parsed_result
                parsed_result["raw_output"] = response
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {e}")
                logger.error(f"Raw response: {response}")
                logger.error(f"Cleaned response: {cleaned_response}")
                return {
                    "error_message": f"Failed to parse evaluation response as JSON: {str(e)}",
                    "result": None
                }
            except ValueError as e:
                logger.error(f"Invalid evaluation response structure: {e}")
                logger.error(f"Raw response: {response}")
                return {
                    "error_message": f"Invalid evaluation response structure: {str(e)}",
                    "result": None
                }
            
            # Generate evaluation summary
            evaluation_summary = self._generate_evaluation_summary(parsed_result, formatted_transcript, model_name)
            
            return {
                "result": {
                    **parsed_result,
                    "evaluation_summary": evaluation_summary,
                    "model_used": model_name,
                    "agent": self.name
                }
            }
            
        except Exception as e:
            logger.error(f"Error in evaluation agent: {e}")
            return {
                "error_message": str(e),
                "result": None
            }
        finally:
            # Automatically unload the model after evaluation
            try:
                logger.info(f"Auto-unloading model {model_name} after evaluation completion")
                ollama_service.unload_model()
            except Exception as e:
                logger.warning(f"Failed to auto-unload model after evaluation: {e}")
    
    def _create_evaluation_prompt(self, transcript_text: str) -> str:
        """Create a comprehensive evaluation prompt in Alpaca format with clear resolution criteria."""
        return f"""
You are an expert evaluator of customer service chatlogs. Assess the following conversation using these four metrics:

1. **Coherence (1–5)** — Does the conversation flow logically and stay on topic?
2. **Relevance (1–5)** — Does the agent respond directly and appropriately to the customer’s concerns?
3. **Politeness (1–5)** — Is the agent professional, respectful, and empathetic in tone?
4. **Resolution (0 or 1)** — Was the customer’s issue satisfactorily resolved? (1 = resolved, 0 = unresolved)

Example Conversation (Mediocre/Bad Agent):
Message 1 customer: I am absolutely furious! I was charged $75 for premium support last month, but I never requested premium support! I've been a loyal customer for five years, and this is unacceptable. I'm already stressed with everything going on, and now this?!
Message 2 agent: Okay. Let me check... uh... yeah, I see the charge. Did you... click something?
Message 3 customer: Click something?! No! I didn't click anything! I specifically remember reviewing my plan and it did not include premium support. I need this removed from my bill immediately. This is causing me so much anxiety!
Message 4 agent: Alright, alright. I'm processing a refund now. It'll probably take a few days. Anything else?
Message 5 customer: A few days?! Can you be more specific? I need to know exactly when I can expect to see the credit. And what's to stop this from happening again? I'm seriously considering switching providers.
Message 6 agent: It'll show up on your next bill. Look, I have other customers waiting. Bye.

Example Evaluation Output:
{{
  "coherence": {{"score": 2, "reasoning": "The agent’s responses are abrupt, lack follow-through, and do not clearly guide the customer through the resolution process."}},
  "politeness": {{"score": 1, "reasoning": "While the agent initially responds without hostility, they show little empathy and end the conversation dismissively."}},
  "relevance": {{"score": 3, "reasoning": "The agent acknowledges the issue and processes a refund, but fails to address important follow-up concerns raised by the customer."}},
  "resolution": {{"score": 0, "reasoning": "The resolution is vague, lacks clarity on timing or prevention of recurrence, and leaves the customer dissatisfied."}}
}}

Evaluate this Chatlog (Be strict and do not make assumptions):
{transcript_text}

### Response:
"""
    

# Return the result in the following JSON format:
# {{
#   "coherence": {{"score": <int 1-5>, "reasoning": "<1 sentence, breif explaination>"}},
#   "politeness": {{"score": <int 1-5>, "reasoning": "<1 sentence, breif explaination>"}},
#   "relevance": {{"score": <int 1-5>, "reasoning": "<1 sentence, breif explaination>"}},
#   "resolution": {{"score": <int 0 or 1>, "reasoning": "<1 sentence, breif explaination>"}}
# }}

    
    def _generate_evaluation_summary(self, parsed_result: Dict[str, Any], transcript_text: str, model_name: str) -> str:
        """Generate a summary paragraph for evaluation metrics and reasoning."""
        # Each metric is an integer (1-5), resolution is 0 or 1
        coherence = parsed_result.get("coherence", {"score": 3, "reasoning": "No reasoning provided."})
        relevance = parsed_result.get("relevance", {"score": 3, "reasoning": "No reasoning provided."})
        politeness = parsed_result.get("politeness", {"score": 3, "reasoning": "No reasoning provided."})
        resolution = parsed_result.get("resolution", {"score": 0, "reasoning": "No reasoning provided."})

        summary = (
            f"Coherence: {int(coherence['score'])}. {coherence['reasoning'].strip()} "
            f"Relevance: {int(relevance['score'])}. {relevance['reasoning'].strip()} "
            f"Politeness: {int(politeness['score'])}. {politeness['reasoning'].strip()} "
            f"Resolution: {int(resolution['score'])}. {resolution['reasoning'].strip()}"
        )
        return summary.strip()
    
    def _format_transcript(self, transcript: List[Dict[str, str]]) -> str:
        """Format transcript for evaluation."""
        formatted = []
        for i, message in enumerate(transcript, 1):
            sender = message.get("sender", "Unknown")
            text = message.get("text", "")
            timestamp = message.get("timestamp", "")
            
            if timestamp:
                formatted.append(f"Message {i} [{timestamp}] {sender}: {text}")
            else:
                formatted.append(f"Message {i} {sender}: {text}")
        return "\n".join(formatted)

# Global evaluation agent instance
evaluation_agent = EvaluationAgent() 