import sys
import json
import asyncio
from app.services.recommendation_agent import recommendation_agent
import nest_asyncio

# Load transcript from file or use a minimal example
try:
    with open('test_privacy_breach_chatlog.json', 'r', encoding='utf-8') as f:
        chatlog = json.load(f)
        if isinstance(chatlog, list):
            transcript = chatlog
        elif isinstance(chatlog, dict) and 'transcript' in chatlog:
            transcript = chatlog['transcript']
        else:
            transcript = []
except Exception as e:
    print(f"Could not load test_privacy_breach_chatlog.json: {e}")
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

# Dummy summaries (replace with real ones if needed)
evaluation_summary = "The interaction demonstrates poor coherence (score 3) due to the agent's abrupt transitions and sarcastic tone. Politeness is extremely low (score 2) as the agent is consistently rude and dismissive. Relevance (score 4) is good, as the agent ultimately provides a solution, but is overshadowed by the poor delivery. Resolution (score 1) is achieved, but at the cost of customer experience."
analysis_summary = "Guideline 'Acknowledge and Empathize' failed due to the agent's dismissive tone. Guideline 'Set Clear Expectations' passed, as the solution was clearly stated. Guideline 'Proactive Help' failed as the agent offered no additional assistance. The agent's behavior is unacceptable and requires immediate attention."

nest_asyncio.apply()

async def main():
    print("Calling recommendation agent...")
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(recommendation_agent.generate_recommendations(transcript, evaluation_summary, analysis_summary))
    # Print the raw model output if available
    if 'raw_output' in result:
        print("Raw model output:")
        print(result['raw_output'])
    print("Recommendation agent output:")
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    print("Calling recommendation agent...")
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(recommendation_agent.generate_recommendations(transcript, evaluation_summary, analysis_summary))
    if 'raw_output' in result:
        print("Raw model output:")
        print(result['raw_output'])
    print("Recommendation agent output:")
    print(json.dumps(result, indent=2, ensure_ascii=False)) 