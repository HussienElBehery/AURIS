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
You are a customer service QA bot. Analyze the conversation and return JSON like:
{{
  "key_issues": ["short issue 1", ...],
  "positive_highlights": ["short highlight 1", ...],
  "guideline_adherence": [
    {{"guideline": "<name>", "status": "Passed" or "Failed", "details": "one-line reason"}}, ...
  ]
}}
Guidelines:
{guidelines_str}
Rules:
- Always include all guidelines above in guideline_adherence. If you can't judge one, set status to "Failed" and details to "Not provided by model.".
- key_issues and positive_highlights must each have at least 1 item (never both empty).
- Only include agent-related points.
- Respond with valid JSON only.
Conversation:
{transcript_text}
"""
            max_retries = 3
            for attempt in range(max_retries):
                response = ollama_service.test_generation(model_name, analysis_prompt)
                parsed = self._parse_response(response, guidelines_list)
                if parsed is not None:
                    # Check if both arrays are empty
                    if parsed["key_issues"] or parsed["highlights"]:
                        parsed["model_used"] = model_name
                        parsed["agent"] = self.name
                        parsed["error_message"] = None
                        parsed["analysis_summary"] = self._generate_analysis_summary(parsed["guidelines"])
                        return parsed
                # else: both are empty, retry
            # If we get here, all attempts failed
            return self._fallback_result("Model failed to provide key issues or highlights after retries.", guidelines_list)
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
            for key in ["key_issues", "positive_highlights", "guideline_adherence"]:
                if key not in data:
                    return None
            def to_str_list(lst):
                result = []
                for item in lst:
                    if isinstance(item, dict) and "text" in item:
                        result.append(str(item["text"]))
                    elif isinstance(item, str):
                        result.append(item)
                    else:
                        result.append(str(item))
                return result
            key_issues = to_str_list(data["key_issues"])
            highlights = to_str_list(data["positive_highlights"])
            # Ensure all default guidelines are present
            default_names = set(g["guideline"] for g in guidelines)
            guidelines_out = []
            found_names = set()
            for g in data["guideline_adherence"]:
                if isinstance(g, dict):
                    name = g.get("guideline", "Unknown")
                    found_names.add(name)
                    guidelines_out.append({
                        "name": name,
                        "passed": g.get("status") == "Passed",
                        "description": g.get("details", "")
                    })
                else:
                    guidelines_out.append({
                        "name": str(g),
                        "passed": False,
                        "description": "Invalid guideline format."
                    })
            # Add missing guidelines as Unknown
            for g in guidelines:
                if g["guideline"] not in found_names:
                    guidelines_out.append({
                        "name": g["guideline"],
                        "passed": "Unknown",
                        "description": "Unknown"
                    })
            return {
                "key_issues": key_issues,
                "highlights": highlights,
                "guidelines": guidelines_out
            }
        except Exception as e:
            logger.error(f"Failed to parse analysis response: {e}")
            # Try to salvage summary and guidelines if possible
            try:
                data = json.loads(cleaned)
                def to_str_list(lst):
                    result = []
                    for item in lst:
                        if isinstance(item, dict) and "text" in item:
                            result.append(str(item["text"]))
                        elif isinstance(item, str):
                            result.append(item)
                        else:
                            result.append(str(item))
                    return result
                key_issues = to_str_list(data.get("key_issues", []))
                highlights = to_str_list(data.get("positive_highlights", []))
                guidelines_out = []
                for g in data.get("guideline_adherence", []):
                    if isinstance(g, dict):
                        guidelines_out.append({
                            "name": g.get("guideline", "Unknown"),
                            "passed": g.get("status") == "Passed",
                            "description": g.get("details", "")
                        })
                    else:
                        guidelines_out.append({
                            "name": str(g),
                            "passed": False,
                            "description": "Invalid guideline format."
                        })
                return {
                    "key_issues": key_issues,
                    "highlights": highlights,
                    "guidelines": guidelines_out
                }
            except Exception as e2:
                logger.error(f"Failed to salvage analysis response: {e2}")
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

    def _generate_analysis_summary(self, guidelines: List[Dict[str, Any]]) -> str:
        """Generate a summary paragraph for each guideline, its status, and details."""
        summary_sentences = []
        for g in guidelines:
            status = "Passed" if g.get("passed") else "Failed"
            name = g.get("name", "Unknown Guideline")
            desc = g.get("description", "No details provided.")
            summary_sentences.append(f"Guideline '{name}': {status}. {desc.strip()}")
        return " ".join(summary_sentences)

# Global analysis agent instance
analysis_agent = AnalysisAgent() 