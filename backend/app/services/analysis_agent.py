import os
import logging
import re
import ast
from typing import Dict, Any, List, Optional
from .ollama_service import ollama_service
import json

logger = logging.getLogger(__name__)
if not logger.hasHandlers():
    logger.setLevel(logging.INFO)
    log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    log_path = os.path.join(log_dir, 'analysis_agent.log')
    file_handler = logging.FileHandler(log_path)
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

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

    def _extract_first_valid_json(self, text):
        required_keys = ["key_issues", "positive_highlights", "guideline_adherence"]
        cleaned = text.strip().replace('```json', '').replace('```', '').strip()
        def find_json_candidates(s):
            stack = []
            start = None
            for i, c in enumerate(s):
                if c == '{':
                    if not stack:
                        start = i
                    stack.append(c)
                elif c == '}':
                    if stack:
                        stack.pop()
                        if not stack and start is not None:
                            yield s[start:i+1]
            return
        for candidate in find_json_candidates(cleaned):
            try:
                obj = json.loads(candidate)
            except Exception:
                try:
                    fixed = candidate.replace("'", '"')
                    fixed = re.sub(r',\s*([}\]])', r'\1', fixed)
                    obj = json.loads(fixed)
                except Exception:
                    try:
                        obj = ast.literal_eval(candidate)
                    except Exception:
                        continue
            key_map = {}
            for k in required_keys:
                for candidate_key in obj.keys():
                    if candidate_key == k:
                        key_map[k] = candidate_key
                        break
                    if candidate_key.lower().replace('_', '').replace(' ', '') == k.lower().replace('_', '').replace(' ', ''):
                        key_map[k] = candidate_key
                        break
                else:
                    key_map[k] = None
            for k in required_keys:
                if key_map[k] is None:
                    obj[k] = []
                elif key_map[k] != k:
                    obj[k] = obj.pop(key_map[k])
            if all(k in obj and isinstance(obj[k], list) for k in required_keys):
                return obj
        try:
            obj = json.loads(cleaned)
            key_map = {}
            for k in required_keys:
                for candidate_key in obj.keys():
                    if candidate_key == k:
                        key_map[k] = candidate_key
                        break
                    if candidate_key.lower().replace('_', '').replace(' ', '') == k.lower().replace('_', '').replace(' ', ''):
                        key_map[k] = candidate_key
                        break
                else:
                    key_map[k] = None
            for k in required_keys:
                if key_map[k] is None:
                    obj[k] = []
                elif key_map[k] != k:
                    obj[k] = obj.pop(key_map[k])
            if all(k in obj and isinstance(obj[k], list) for k in required_keys):
                return obj
        except Exception:
            pass
        return None

    async def analyze_chat(self, transcript: List[Dict[str, str]], guidelines: Optional[List[Dict[str, str]]] = None, model_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze a chat conversation using Ollama.
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            guidelines: Optional list of guidelines to use (otherwise use default)
            model_name: Name of the model to use (optional, will use first available if not provided)
        Returns:
            Dictionary containing analysis results
        """
        try:
            if not ollama_service.is_ollama_running():
                return self._fallback_result("Ollama is not running", guidelines)
            available_models = ollama_service.get_available_models()
            if not available_models:
                return self._fallback_result("No models available in Ollama", guidelines)
            model_names = [model.get("name", "") for model in available_models]
            if model_name and model_name in model_names:
                selected_model = model_name
            else:
                selected_model = ollama_service.get_agent_default_model("analysis")
                if selected_model not in model_names:
                    selected_model = available_models[0]["name"]
            transcript_text = self._format_transcript(transcript)
            guidelines_list = self.get_guidelines(guidelines)
            guidelines_str = "\n".join([
                f"- {g['guideline']}: {g['description']}" for g in guidelines_list
            ])
            def missing_guidelines(parsed):
                if not parsed or 'guideline_adherence' not in parsed:
                    return [g['guideline'] for g in guidelines_list]
                present = set()
                for g in parsed['guideline_adherence']:
                    for ref in [g2['guideline'] for g2 in guidelines_list]:
                        if g.get('guideline', '').lower().replace(' ', '') == ref.lower().replace(' ', ''):
                            present.add(ref)
                return [g['guideline'] for g in guidelines_list if g['guideline'] not in present]
            max_retries = 3
            attempt = 0
            parsed = None
            response = None
            while attempt < max_retries:
                extra_instructions = None
                if attempt > 0:
                    extra_instructions = (
                        "You must always include at least one key issue or one positive highlight. "
                        "All guidelines must be present in the 'guideline_adherence' list. Do not leave any required field empty."
                    )
                instruction = (
                    "Analyze the customer service conversation and return ONLY valid JSON with these exact keys: "
                    "'key_issues' (list of short strings), 'positive_highlights' (list of short strings), "
                    "and 'guideline_adherence' (list of objects with keys: guideline, status (Passed/Failed), details (1 sentence max)). "
                    "Always include ALL keys, even if empty. Do not include any explanation or text outside the JSON."
                )
                if extra_instructions:
                    instruction += f" {extra_instructions}"
                analysis_prompt = f"""
### Instruction:
{instruction}

### Input:
Guidelines:
{guidelines_str}

Conversation:
{transcript_text}

### Output:
"""
                response = ollama_service.test_generation(selected_model, analysis_prompt)
                logger.info(f"Raw model response (attempt {attempt+1}): {response}")
                parsed = self._extract_first_valid_json(response)
                logger.info(f"Parsed model response (attempt {attempt+1}): {parsed}")
                if parsed and ((parsed.get('key_issues') and len(parsed['key_issues']) > 0) or (parsed.get('positive_highlights') and len(parsed['positive_highlights']) > 0)):
                    missing = missing_guidelines(parsed)
                    if not missing:
                        # Structure output for frontend
                        return {
                            "key_issues": parsed["key_issues"],
                            "highlights": parsed["positive_highlights"],
                            "guidelines": [
                                {
                                    "name": g["guideline"],
                                    "passed": g["status"] == "Passed",
                                    "description": g.get("details", "")
                                } for g in parsed["guideline_adherence"]
                            ],
                            "model_used": selected_model,
                            "agent": self.name,
                            "error_message": None,
                            "analysis_summary": self._generate_analysis_summary([
                                {
                                    "name": g["guideline"],
                                    "passed": g["status"] == "Passed",
                                    "description": g.get("details", "")
                                } for g in parsed["guideline_adherence"]
                            ])
                        }
                    else:
                        logger.warning(f"Missing guidelines in output: {missing}. Retrying...")
                else:
                    logger.warning("No key issues or positive highlights found. Retrying...")
                attempt += 1
            return self._fallback_result(f"Model failed to include all guidelines after {max_retries} attempts. Last raw response: {response}", guidelines_list)
        except Exception as e:
            logger.error(f"Error in analysis agent: {e}")
            return self._fallback_result(str(e), guidelines)
        return self._fallback_result("Unknown error in analysis agent.", guidelines)

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
            # Use the correct keys and handle missing/malformed entries
            name = g.get("name") or g.get("guideline") or "Unknown Guideline"
            status = "Passed" if g.get("passed") or g.get("status") == "Passed" else "Failed"
            desc = g.get("description") or g.get("details") or "No details provided."
            summary_sentences.append(f"Guideline '{name}': {status}. {desc.strip()}")
        return " ".join(summary_sentences)

# Global analysis agent instance
analysis_agent = AnalysisAgent() 