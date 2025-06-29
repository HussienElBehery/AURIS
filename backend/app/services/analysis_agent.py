import logging
import json
from typing import Dict, Any, List, Optional
from .model_loader import model_loader

logger = logging.getLogger(__name__)

class AnalysisAgent:
    """
    Agent responsible for analyzing chat logs against guidelines and generating insights.
    """
    
    def __init__(self):
        self.agent_type = "analysis"
        self.guidelines = [
            "Acknowledge and Empathize",
            "Set Clear Expectations", 
            "Proactive Help"
        ]
    
    async def process_chat_log(self, transcript: List[Dict[str, str]], guidelines: List[str] = None) -> Dict[str, Any]:
        """
        Process a chat log and return analysis results.
        
        Args:
            transcript: List of messages with 'sender' and 'text' keys
            guidelines: List of guidelines to check against (uses default if None)
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            logger.info("Starting analysis agent processing")
            
            # Use default guidelines if none provided
            if guidelines is None:
                guidelines = self.guidelines
            
            # Ensure base model is loaded
            if model_loader.base_model is None:
                success = model_loader.load_base_model()
                if not success:
                    logger.error("Failed to load base model")
                    return self._create_error_response("Failed to load base model")
            
            # Prepare transcript for model input
            formatted_transcript = self._format_transcript(transcript)
            formatted_guidelines = self._format_guidelines(guidelines)
            
            # Generate analysis using the model
            analysis_result = await self._generate_analysis(formatted_transcript, formatted_guidelines)
            
            # Parse the model output
            parsed_result = self._parse_analysis_output(analysis_result, guidelines)
            
            logger.info("Analysis agent processing completed")
            return {
                "status": "completed",
                "agent_type": self.agent_type,
                "result": parsed_result
            }
            
        except Exception as e:
            logger.error(f"Error in analysis agent: {e}")
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
    
    def _format_guidelines(self, guidelines: List[str]) -> str:
        """
        Format guidelines for model input.
        """
        formatted = "Guidelines to analyze against:\n"
        for i, guideline in enumerate(guidelines, 1):
            formatted += f"{i}. {guideline}\n"
        return formatted
    
    async def _generate_analysis(self, formatted_transcript: str, formatted_guidelines: str) -> str:
        """
        Generate analysis using the loaded model.
        """
        try:
            # Create prompt for analysis
            prompt = f"""
            Please analyze the following customer service chat transcript against the provided guidelines and provide:
            1. Guideline compliance results (pass/fail for each guideline)
            2. Key issues identified
            3. Positive highlights
            4. Overall analysis summary

            {formatted_guidelines}

            {formatted_transcript}

            Please respond in the following JSON format:
            {{
                "guidelines": [
                    {{
                        "name": "Acknowledge and Empathize",
                        "passed": true,
                        "description": "The agent acknowledged the customer's frustration and showed empathy..."
                    }}
                ],
                "issues": [
                    "The agent was overly enthusiastic and may have seemed insincere",
                    "Response was too long and could overwhelm the customer"
                ],
                "highlights": [
                    "The agent provided specific information about Salesforce integration",
                    "The agent showed enthusiasm for helping the customer"
                ],
                "analysis_summary": "Overall analysis of the interaction..."
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
            logger.error(f"Error generating analysis: {e}")
            raise e
    
    def _parse_analysis_output(self, model_output: str, guidelines: List[str]) -> Dict[str, Any]:
        """
        Parse the model output into structured analysis data.
        """
        try:
            # Try to parse as JSON
            if model_output.strip().startswith('{'):
                parsed = json.loads(model_output)
                
                # Process guidelines
                guidelines_results = []
                for guideline in guidelines:
                    # Find matching guideline in parsed output
                    guideline_result = None
                    for parsed_guideline in parsed.get("guidelines", []):
                        if parsed_guideline.get("name") == guideline:
                            guideline_result = parsed_guideline
                            break
                    
                    if guideline_result:
                        guidelines_results.append({
                            "name": guideline_result.get("name", guideline),
                            "passed": guideline_result.get("passed", False),
                            "description": guideline_result.get("description", "N/A")
                        })
                    else:
                        # Fallback if guideline not found in output
                        guidelines_results.append({
                            "name": guideline,
                            "passed": False,
                            "description": "N/A"
                        })
                
                return {
                    "guidelines": guidelines_results,
                    "issues": parsed.get("issues", []),
                    "highlights": parsed.get("highlights", []),
                    "analysis_summary": parsed.get("analysis_summary", "N/A"),
                    "error_message": None
                }
            else:
                # Fallback if JSON parsing fails
                return {
                    "guidelines": [
                        {
                            "name": guideline,
                            "passed": False,
                            "description": "N/A"
                        } for guideline in guidelines
                    ],
                    "issues": [],
                    "highlights": [],
                    "analysis_summary": "N/A",
                    "error_message": "Failed to parse model output"
                }
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse analysis output as JSON: {e}")
            return {
                "guidelines": [
                    {
                        "name": guideline,
                        "passed": False,
                        "description": "N/A"
                    } for guideline in guidelines
                ],
                "issues": [],
                "highlights": [],
                "analysis_summary": "N/A",
                "error_message": f"JSON parsing error: {str(e)}"
            }
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """
        Create a standardized error response.
        """
        return {
            "guidelines": [
                {
                    "name": guideline,
                    "passed": False,
                    "description": "N/A"
                } for guideline in self.guidelines
            ],
            "issues": [],
            "highlights": [],
            "analysis_summary": "N/A",
            "error_message": error_message
        }

# Global analysis agent instance
analysis_agent = AnalysisAgent() 