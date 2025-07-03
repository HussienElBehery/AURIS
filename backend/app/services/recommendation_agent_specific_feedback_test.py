import logging
import json
from app.services.ollama_service import ollama_service
from app.services.recommendation_agent import RecommendationAgent

logger = logging.getLogger(__name__)

def get_feedback_prompt(transcript):
    transcript_text = RecommendationAgent()._format_transcript_with_tokens(transcript)
    example_output = (
        "Original message: We already shipped your order. If it's late, it's not our problem.\n"
        "Suggested message: I apologize for the delay. Let me check the status of your package and see how I can help.\n\n"
        "Original message: That's not something I can help with.\n"
        "Suggested message: I understand your concern. Let me see what options are available to resolve this for you."
    )
    return f"""
INSTRUCTION:
Given the following customer service conversation, identify AT LEAST 2-3 specific agent original messages that could be improved. For each, provide the original agent message and a suggested improved version. Focus on actionable, message-level feedback. Do not include general commentary—just the pairs.

Agent Conversation:
{transcript_text}

EXAMPLE OUTPUT:

{example_output}
"""

def get_coaching_prompt(evaluation_summary, analysis_summary):
    return f"""
INSTRUCTION:
Given the following evaluation summary and analysis summary, provide a paragraph of long-term coaching advice (recommendation) for the agent's professional development. Focus on communication style, empathy, and customer service best practices. Be concise and actionable.

Evaluation Summary:
{evaluation_summary}

Analysis Summary:
{analysis_summary}

EXAMPLE OUTPUT:

Long-term Coaching:
The agent should focus on active listening, empathy, and clear communication. Training in de-escalation techniques and maintaining professionalism, even under stress, will improve customer satisfaction and outcomes.
"""

async def run_test_case(transcript, evaluation_summary, analysis_summary, case_name):
    print(f"\n==================== {case_name} ====================\n")
    model_name = 'deepseek-r1:latest'
    ollama_service.load_model(model_name)
    print("\n--- FEEDBACK PROMPT ---\n")
    feedback_prompt = get_feedback_prompt(transcript)
    print(feedback_prompt)
    print("\n--- RAW FEEDBACK RESPONSE ---\n")
    feedback_response = ollama_service.test_generation(model_name, feedback_prompt)
    print(feedback_response)

    print("\n--- COACHING PROMPT ---\n")
    coaching_prompt = get_coaching_prompt(evaluation_summary, analysis_summary)
    print(coaching_prompt)
    print("\n--- RAW COACHING RESPONSE ---\n")
    coaching_response = ollama_service.test_generation(model_name, coaching_prompt)
    print(coaching_response)
    ollama_service.unload_model()

async def main():
    # Test case 1 (existing)
    transcript1 = [
        {"sender": "customer", "text": "Hi! I'm calling about a really frustrating experience I had last week with one of your support agents. Honestly, I love your product, it's been a lifesaver, but the agent I spoke with was… not great. They were dismissive and didn't really try to help. I'm hoping we can get this sorted out."},
        {"sender": "agent", "text": "Oh, joy. Another complaint about 'feelings.' Look, we handle thousands of calls. Sometimes people have bad days. What exactly did this agent *do* that was so earth-shattering?"},
        {"sender": "customer", "text": "Well, I was having trouble connecting my device, and they just kept telling me to restart it, even after I explained I'd already tried that multiple times. They didn't offer any other solutions, and then they kind of rushed me off the phone."},
        {"sender": "agent", "text": "Restarting things is, like, 90% of tech support. Shocking, I know. Okay, so you want me to magically fix the problem the other agent couldn't? Fine. What device are we talking about?"},
        {"sender": "customer", "text": "It's a Stellar X500. And honestly, I'm not looking for you to 'magically fix' anything, just some understanding and a little help."},
        {"sender": "agent", "text": "Stellar X500. Right. Let me check… Yep, known issue. Firmware update. Download it. Problem solved. Is there anything *else* I can begrudgingly assist you with?"},
        {"sender": "customer", "text": "Oh! Okay, that's… great! I didn't realize there was an update. Thank you. I appreciate you finding that so quickly."},
        {"sender": "agent", "text": "Don't mention it. Just… try not to call back unless the world is ending, okay?"}
    ]
    evaluation_summary1 = "The interaction demonstrates poor coherence (score 3) due to the agent's abrupt transitions and sarcastic tone. Politeness is extremely low (score 2) as the agent is consistently rude and dismissive. Relevance (score 4) is good, as the agent ultimately provides a solution, but is overshadowed by the poor delivery. Resolution (score 1) is achieved, but at the cost of customer experience."
    analysis_summary1 = "Guideline 'Acknowledge and Empathize' failed due to the agent's dismissive tone. Guideline 'Set Clear Expectations' passed, as the solution was clearly stated. Guideline 'Proactive Help' failed as the agent offered no additional assistance. The agent's behavior is unacceptable and requires immediate attention."
    await run_test_case(transcript1, evaluation_summary1, analysis_summary1, "Test Case 1: Sarcastic Agent")

    # Test case 2 (user provided)
    transcript2 = [
        {"sender": "customer", "text": "Hi, my package was supposed to arrive yesterday, and it still hasn't shown up. Can you check what's going on?"},
        {"sender": "agent", "text": "If it's late, it's probably the courier's fault. We shipped it on our end."},
        {"sender": "customer", "text": "I get that, but can you look it up for me? I need this for an event tomorrow."},
        {"sender": "agent", "text": "You can check the tracking link we emailed you. We don't have more info than that."},
        {"sender": "customer", "text": "The tracking page says it's stuck in transit for two days!"},
        {"sender": "agent", "text": "That's out of our hands. You can call the shipping company if it's that urgent."}
    ]
    evaluation_summary2 = "This interaction is disjointed and dismissive. Coherence is 3, as the agent responds logically but lacks conversational flow. Politeness is 2 due to the agent's defensive and indifferent tone. Relevance is 2, as the agent avoids directly helping. Resolution is 0, as the issue remains unresolved."
    analysis_summary2 = "Guideline 'Acknowledge and Empathize' Failed: The agent made no attempt to recognize the customer's urgency. Guideline 'Set Clear Expectations' Failed: No specific timeline or next steps were provided. Guideline 'Proactive Help' Failed: The agent redirected responsibility instead of offering assistance."
    await run_test_case(transcript2, evaluation_summary2, analysis_summary2, "Test Case 2: Package Delay - Dismissive Agent")

    # Test case 3 (user provided)
    transcript3 = [
        {"sender": "customer", "text": "Hey, I just bought a subscription but the app crashed and I can't even use the features I paid for."},
        {"sender": "agent", "text": "Sorry to hear that. Can you tell me when you made the purchase?"},
        {"sender": "customer", "text": "This morning, around 9 AM. I have the receipt."},
        {"sender": "agent", "text": "Alright, I'll escalate this to the billing team. You should hear back within 24–48 hours. In the meantime, try reinstalling the app."},
        {"sender": "customer", "text": "Okay, I'll wait. Thanks for helping so quickly."},
        {"sender": "agent", "text": "You're welcome! We'll make sure it's sorted."}
    ]
    evaluation_summary3 = "This is a fairly positive interaction. Coherence scores 5 as the agent follows the issue clearly. Politeness is 5 with respectful and helpful tone. Relevance is 5 with directly helpful responses. Resolution is 1, as the issue was not fully solved yet but properly escalated."
    analysis_summary3 = "Guideline 'Acknowledge and Empathize' Passed: Agent responded quickly and acknowledged the problem. Guideline 'Set Clear Expectations' Passed: Clear timeline and next steps were communicated. Guideline 'Proactive Help' Passed: Immediate troubleshooting and escalation were provided."
    await run_test_case(transcript3, evaluation_summary3, analysis_summary3, "Test Case 3: Subscription Issue - Helpful Agent")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 