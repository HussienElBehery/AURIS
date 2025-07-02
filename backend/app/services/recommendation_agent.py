import logging
from typing import Dict, Any, List
from .ollama_service import ollama_service
import re
import random

logger = logging.getLogger(__name__)

class RecommendationAgent:
    """
    Recommendation agent that uses transcript, evaluation summary, and analysis summary to generate actionable feedback.
    """
    
    def __init__(self):
        self.name = "recommendation_agent"
    
    async def generate_recommendations(self, transcript: List[Dict[str, str]], evaluation_summary: str, analysis_summary: str, model_name: str = None) -> Dict[str, Any]:
        """
        Generate recommendations based on a chat conversation, evaluation summary, and analysis summary using Ollama.
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            evaluation_summary: String summary from evaluation agent
            analysis_summary: String summary from analysis agent
            model_name: Name of the model to use (optional, will use first available if not provided)
        Returns:
            Dictionary containing recommendation results
        """
        try:
            if not ollama_service.is_ollama_running():
                return {
                    "error_message": "Ollama is not running",
                    "specific_feedback": [],
                    "long_term_coaching": ""
                }
            available_models = ollama_service.get_available_models()
            if not available_models:
                return {
                    "error_message": "No models available in Ollama",
                    "specific_feedback": [],
                    "long_term_coaching": ""
                }
            model_names = [model.get("name", "") for model in available_models]
            if model_name and model_name in model_names:
                selected_model = model_name
            else:
                selected_model = random.choice(model_names)
            transcript_text = self._format_transcript(transcript)
            # Refined prompt for DB schema
            recommendation_prompt = f"""
You are a customer service coaching agent. Given the following:
- Conversation transcript
- Evaluation summary
- Analysis summary

Your job is to:
1. Identify up to 2-3 short agent messages that could be improved. For each, provide:
   - The original_text (the problematic part, short)
   - A suggested_text (a short, improved rewrite)
2. Provide a long_term_coaching string with a few actionable suggestions for the agent, based on the summaries.

Respond ONLY with valid JSON inside triple backticks, and nothing else. The JSON MUST have ONLY these two fields:
- "specific_feedback": a list of objects with "original_text" and "suggested_text"
- "long_term_coaching": a string
Example:
```
{{
  "specific_feedback": [
    {{"original_text": "...", "suggested_text": "..."}},
    ...
  ],
  "long_term_coaching": "..."
}}
```
---
TRANSCRIPT:
{transcript_text}

EVALUATION SUMMARY:
{evaluation_summary}

ANALYSIS SUMMARY:
{analysis_summary}
"""
            logger.info(f"[RECOMMENDATION] Prompt sent to model {selected_model}:\n{recommendation_prompt}")
            response = ollama_service.test_generation(selected_model, recommendation_prompt)
            logger.info(f"[RECOMMENDATION] Raw model response: {response}")
            if response.startswith("Error"):
                return {
                    "error_message": response,
                    "specific_feedback": [],
                    "long_term_coaching": ""
                }
            import json
            try:
                cleaned = response.strip()
                # Extract JSON inside triple backticks if present
                match = re.search(r'```[\s\S]*?({[\s\S]*?})[\s\S]*?```', cleaned)
                if match:
                    json_str = match.group(1)
                else:
                    # Fallback: find first { and last }
                    json_start = cleaned.find('{')
                    json_end = cleaned.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        json_str = cleaned[json_start:json_end]
                    else:
                        json_str = cleaned
                data = json.loads(json_str)
                # Only extract the two fields for DB
                specific_feedback = data.get("specific_feedback", [])
                long_term_coaching = data.get("long_term_coaching", "")
                if not isinstance(specific_feedback, list):
                    specific_feedback = []
                if not isinstance(long_term_coaching, str):
                    long_term_coaching = ""
                logger.info(f"[RECOMMENDATION] Parsed output: specific_feedback={specific_feedback}, long_term_coaching={long_term_coaching}")
                return {
                    "specific_feedback": specific_feedback,
                    "long_term_coaching": long_term_coaching,
                    "error_message": None,
                    "model_used": selected_model,
                    "agent": self.name
                }
            except Exception as e:
                logger.error(f"Failed to parse recommendation JSON. Raw response: {response}")
                return {
                    "error_message": f"Failed to parse recommendation JSON: {str(e)}",
                    "specific_feedback": [],
                    "long_term_coaching": ""
                }
        except Exception as e:
            logger.error(f"Error in recommendation agent: {e}")
            return {
                "error_message": str(e),
                "specific_feedback": [],
                "long_term_coaching": ""
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