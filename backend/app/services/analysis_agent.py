import os
import logging
from typing import Dict, Any, List, Optional
from .ollama_service import ollama_service

logger = logging.getLogger(__name__)

DEFAULT_GUIDELINES = [
    {
        "guideline": "Acknowledge and Empathize",
        "description": "Agent should acknowledge the customer's concern and show empathy."
    },
    {
        "guideline": "Set Clear Expectations",
        "description": "Agent should set clear, actionable expectations for the customer."
    },
    {
        "guideline": "Proactive Help",
        "description": "Agent should offer proactive solutions and explore alternatives."
    },
]

def get_default_guidelines() -> List[Dict[str, str]]:
    # In the future, load from config or env if needed
    return DEFAULT_GUIDELINES.copy()

class AnalysisAgent:
    """
    Analysis agent that works with Ollama and outputs structured analysis.
    """
    
    def __init__(self):
        self.name = "analysis_agent"
        self._default_guidelines = get_default_guidelines()

    @staticmethod
    def set_default_guidelines(guidelines: List[Dict[str, str]]):
        global DEFAULT_GUIDELINES
        DEFAULT_GUIDELINES = guidelines

    def get_guidelines(self, override: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, str]]:
        return override if override is not None else get_default_guidelines()

    async def analyze_chat(self, transcript: List[Dict[str, str]], guidelines: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Analyze a chat conversation using Ollama.
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            guidelines: Optional list of guidelines to use (otherwise use default)
        Returns:
            Dictionary containing analysis results
        """
        try:
            if not ollama_service.is_ollama_running():
                return self._fallback_result("Ollama is not running", guidelines)
            available_models = ollama_service.get_available_models()
            if not available_models:
                return self._fallback_result("No models available in Ollama", guidelines)
            model_name = available_models[0]["name"]
            transcript_text = self._format_transcript(transcript)
            guidelines_list = self.get_guidelines(guidelines)
            guidelines_str = "\n".join([
                f"- {g['guideline']}: {g['description']}" for g in guidelines_list
            ])
            analysis_prompt = f"""
You are an expert customer service QA analyst. Analyze the following conversation and provide your response in the following JSON format:

{{
  "key_issues": ["<0-3 short, agent-related issues>"],
  "positive_highlights": ["<0-3 short, agent-related highlights>"],
  "guideline_adherence": [
    {{
      "guideline": "<guideline name>",
      "status": "Passed" or "Failed",
      "details": "<short explanation>"
    }}
    ...
  ],
  "analysis_summary": "<summary that combines guideline, status, and details>"
}}

Guidelines to check:
{guidelines_str}

Rules:
- Only include issues and highlights related to the AGENT, not the customer.
- For each guideline, status must be either Passed or Failed (nothing else).
- Details should be concise and specific.
- If a section is not applicable, return an empty array for it.
- Respond ONLY with valid JSON, no extra text.

Conversation:
{transcript_text}
"""
            response = ollama_service.test_generation(model_name, analysis_prompt)
            parsed = self._parse_response(response, guidelines_list)
            if parsed is not None:
                parsed["model_used"] = model_name
                parsed["agent"] = self.name
                parsed["error_message"] = None
                return parsed
            else:
                return self._fallback_result("Failed to parse model output", guidelines_list)
        except Exception as e:
            logger.error(f"Error in analysis agent: {e}")
            return self._fallback_result(str(e), guidelines)

    def _parse_response(self, response: str, guidelines: List[Dict[str, str]]) -> Optional[Dict[str, Any]]:
        import json
        try:
            cleaned = response.strip()
            json_start = cleaned.find('{')
            json_end = cleaned.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_str = cleaned[json_start:json_end]
                data = json.loads(json_str)
            else:
                data = json.loads(cleaned)
            # Validate structure
            if not isinstance(data, dict):
                return None
            for key in ["key_issues", "positive_highlights", "guideline_adherence", "analysis_summary"]:
                if key not in data:
                    return None
            # Validate guideline adherence
            for g in data["guideline_adherence"]:
                if g["status"] not in ("Passed", "Failed"):
                    return None
            return {
                "key_issues": data["key_issues"],
                "highlights": data["positive_highlights"],
                "guidelines": [
                    {
                        "name": g["guideline"],
                        "passed": g["status"] == "Passed",
                        "description": g["details"]
                    } for g in data["guideline_adherence"]
                ],
                "analysis_summary": data["analysis_summary"]
            }
        except Exception as e:
            logger.error(f"Failed to parse analysis response: {e}")
            return None

    def _fallback_result(self, error_message: str, guidelines: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        guidelines_list = self.get_guidelines(guidelines)
        return {
            "key_issues": [],
            "highlights": [],
            "guidelines": [
                {
                    "name": g["guideline"],
                    "passed": False,
                    "description": "Unable to analyze due to error."
                } for g in guidelines_list
            ],
            "analysis_summary": f"Analysis could not be completed: {error_message}",
            "model_used": None,
            "agent": self.name,
            "error_message": error_message
        }

    def _format_transcript(self, transcript: List[Dict[str, str]]) -> str:
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