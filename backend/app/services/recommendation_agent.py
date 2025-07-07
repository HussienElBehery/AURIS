import logging
from typing import Dict, Any, List
from app.services.ollama_service import ollama_service
import re
import random
import json

logger = logging.getLogger(__name__)

class RecommendationAgent:
    """
    Recommendation agent that uses transcript, evaluation summary, and analysis summary to generate actionable feedback.
    """
    
    def __init__(self):
        self.name = "recommendation_agent"
    
    def _format_transcript_with_tokens(self, transcript: List[Dict[str, str]]) -> str:
        formatted = []
        for message in transcript:
            sender = message.get("sender", "Unknown").lower()
            text = message.get("text", "")
            if sender == "agent":
                formatted.append(f"<|AGENT|> {text}")
            elif sender == "customer":
                formatted.append(f"<|CUSTOMER|> {text}")
            else:
                formatted.append(f"{sender}: {text}")
        return "\n".join(formatted)

    async def generate_recommendations(self, transcript: List[Dict[str, str]], evaluation_summary: str, analysis_summary: str, model_name: str = None) -> Dict[str, Any]:
        """
        Generate recommendations using a dual-prompt approach: one for specific feedback, one for long-term coaching.
        """
        try:
            if not ollama_service.is_ollama_running():
                return {
                    "error_message": "Ollama is not running",
                    "specific_feedback": [],
                    "long_term_coaching": None,
                    "raw_output": ""
                }
            available_models = ollama_service.get_available_models()
            if not available_models:
                return {
                    "error_message": "No models available in Ollama",
                    "specific_feedback": [],
                    "long_term_coaching": None,
                    "raw_output": ""
                }
            model_names = [model.get("name", "") for model in available_models]
            if model_name and model_name in model_names:
                selected_model = model_name
            else:
                selected_model = ollama_service.get_agent_default_model("recommendation")
                if selected_model not in model_names:
                    selected_model = available_models[0]["name"]
            transcript_text = self._format_transcript_with_tokens(transcript)
            # --- Dual Prompt Approach ---
            feedback_prompt = (
                "INSTRUCTION:\n"
                "Given the following customer service conversation, identify 2-3 specific agent original messages that could be improved. For each, provide the original agent message and a suggested improved version. Only output the pairs, no extra commentary.\n\n"
                f"Agent Conversation:\n{transcript_text}\n\n"
                "EXAMPLE OUTPUT:\n"
                "Original message: We already shipped your order. If it's late, it's not our problem.\n"
                "Suggested message: I apologize for the delay. Let me check the status of your package and see how I can help.\n\n"
                "Original message: That's not something I can help with.\n"
                "Suggested message: I understand your concern. Let me see what options are available to resolve this for you.\n"
            )
            coaching_prompt = (
                "INSTRUCTION:\n"
                "Given the following evaluation summary and analysis summary, provide a short paragraph of long-term coaching advice for the agent's professional development. Focus on communication style, empathy, and customer service best practices. Be concise and actionable.\n\n"
                f"Evaluation Summary:\n{evaluation_summary}\n\n"
                f"Analysis Summary:\n{analysis_summary}\n\n"
                "EXAMPLE OUTPUT:\n"
                "Long-term Coaching: The agent should focus on active listening, empathy, and clear communication. Training in de-escalation techniques and maintaining professionalism, even under stress, will improve customer satisfaction and outcomes.\n"
            )
            logger.info(f"[RECOMMENDATION] Feedback prompt sent to model {selected_model}:\n{feedback_prompt}")
            feedback_response = ollama_service.test_generation(selected_model, feedback_prompt)
            logger.info(f"[RECOMMENDATION] Coaching prompt sent to model {selected_model}:\n{coaching_prompt}")
            coaching_response = ollama_service.test_generation(selected_model, coaching_prompt)
            logger.info(f"[RECOMMENDATION] Raw feedback response: {feedback_response}")
            logger.info(f"[RECOMMENDATION] Raw coaching response: {coaching_response}")
            # --- Parse feedback pairs ---
            feedback = []
            try:
                # Try to parse as JSON first (in case feedback_response is a JSON string)
                feedback_text = feedback_response
                try:
                    feedback_json = json.loads(feedback_response)
                    if isinstance(feedback_json, dict) and "feedback" in feedback_json:
                        feedback_text = feedback_json["feedback"]
                except Exception:
                    feedback_text = feedback_response

                # Flexible regex: match optional bullets/numbers/dashes, all 'Original'/'Suggested' variants, and tolerate whitespace
                pattern = re.compile(
                    r"(?:^|\n)[\-\d\.\s]*Original(?: message)?\s*:\s*(.*?)\n[\-\d\.\s]*Suggested(?: (?:improvement|message))?\s*:\s*(.*?)(?=\n[\-\d\.\s]*Original(?: message)?\s*:|\n*$)",
                    re.DOTALL | re.IGNORECASE
                )
                matches = pattern.findall(feedback_text)
                for orig, sugg in matches:
                    if orig.strip() and sugg.strip():
                        feedback.append({"original_text": orig.strip(), "suggested_text": sugg.strip()})
                # Fallback: try to parse at least one pair if the above fails
                if not feedback:
                    import re as _re
                    parts = _re.split(r'[\-\d\.\s]*Original(?: message)?\s*:', feedback_text)
                    for part in parts[1:]:
                        if 'Suggested message:' in part:
                            orig, sugg = part.split('Suggested message:', 1)
                            feedback.append({"original_text": orig.strip(), "suggested_text": sugg.strip()})
                        elif 'Suggested improvement:' in part:
                            orig, sugg = part.split('Suggested improvement:', 1)
                            feedback.append({"original_text": orig.strip(), "suggested_text": sugg.strip()})
                        elif 'Suggested:' in part:
                            orig, sugg = part.split('Suggested:', 1)
                            feedback.append({"original_text": orig.strip(), "suggested_text": sugg.strip()})
                if not feedback:
                    feedback = [{"original_text": "No feedback available.", "suggested_text": ""}]
            except Exception as e:
                logger.error(f"Failed to parse feedback pairs: {e}")
                feedback = [{"original_text": "No feedback available.", "suggested_text": ""}]
            # --- Parse coaching paragraph ---
            coaching = None
            try:
                match = re.search(r"Long-term Coaching:\s*(.*)", coaching_response, re.DOTALL | re.IGNORECASE)
                if match:
                    coaching = match.group(1).strip()
                else:
                    # Fallback: use the whole response if it looks like a paragraph
                    coaching = coaching_response.strip()
                if not coaching:
                    coaching = "No coaching available."
            except Exception as e:
                logger.error(f"Failed to parse coaching: {e}")
                coaching = "No coaching available."
            # Ensure output matches DB schema (specific_feedback: List[Dict], long_term_coaching: str or None)
            return {
                "specific_feedback": feedback,
                "long_term_coaching": coaching,
                "error_message": None,
                "model_used": selected_model,
                "agent": self.name,
                "raw_output": {
                    "feedback": feedback_response,
                    "coaching": coaching_response
                }
            }
        except Exception as e:
            logger.error(f"Error in recommendation agent: {e}")
            return {
                "error_message": str(e),
                "specific_feedback": [{"original_text": "No feedback available.", "suggested_text": ""}],
                "long_term_coaching": "No coaching available.",
                "raw_output": ""
            }

# Global recommendation agent instance
recommendation_agent = RecommendationAgent()

# Sample for testing
if __name__ == "__main__":
    import asyncio
    transcript = [
        {"sender": "customer", "text": "Hi! I'm calling about a really frustrating experience I had last week with one of your support agents. Honestly, I love your product, it's been a lifesaver, but the agent I spoke with was… not great. They were dismissive and didn't really try to help. I'm hoping we can get this sorted out."},
        {"sender": "agent", "text": "Oh, joy. Another complaint about 'feelings.' Look, we handle thousands of calls. Sometimes people have bad days. What exactly did this agent *do* that was so earth-shattering?"},
        {"sender": "customer", "text": "Well, I was having trouble connecting my device, and they just kept telling me to restart it, even after I explained I'd already tried that multiple times. They didn't offer any other solutions, and then they kind of rushed me off the phone."},
        {"sender": "agent", "text": "Restarting things is, like, 90% of tech support. Shocking, I know. Okay, so you want me to magically fix the problem the other agent couldn't? Fine. What device are we talking about?"},
        {"sender": "customer", "text": "It's a Stellar X500. And honestly, I'm not looking for you to 'magically fix' anything, just some understanding and a little help."},
        {"sender": "agent", "text": "Stellar X500. Right. Let me check… Yep, known issue. Firmware update. Download it. Problem solved. Is there anything *else* I can begrudgingly assist you with?"},
        {"sender": "customer", "text": "Oh! Okay, that's… great! I didn't realize there was an update. Thank you. I appreciate you finding that so quickly."},
        {"sender": "agent", "text": "Don't mention it. Just… try not to call back unless the world is ending, okay?"}
    ]
    evaluation_summary = "The interaction demonstrates poor coherence (score 3) due to the agent's abrupt transitions and sarcastic tone. Politeness is extremely low (score 2) as the agent is consistently rude and dismissive. Relevance (score 4) is good, as the agent ultimately provides a solution, but is overshadowed by the poor delivery. Resolution (score 1) is achieved, but at the cost of customer experience."
    analysis_summary = "Guideline 'Acknowledge and Empathize' failed due to the agent's dismissive tone. Guideline 'Set Clear Expectations' passed, as the solution was clearly stated. Guideline 'Proactive Help' failed as the agent offered no additional assistance. The agent's behavior is unacceptable and requires immediate attention."
    async def test():
        result = await recommendation_agent.generate_recommendations(transcript, evaluation_summary, analysis_summary)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    asyncio.run(test()) 