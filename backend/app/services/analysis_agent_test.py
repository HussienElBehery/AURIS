import logging
import json
import re
import ast
from app.services.ollama_service import ollama_service
from app.services.analysis_agent import AnalysisAgent

logger = logging.getLogger(__name__)

# Alpaca-style prompt without few-shot examples
def get_analysis_prompt(transcript, guidelines=None, case_hint=None, extra_instructions=None):
    agent = AnalysisAgent()
    transcript_text = agent._format_transcript(transcript)
    guidelines_list = agent.get_guidelines(guidelines)
    guidelines_str = "\n".join([
        f"- {g['guideline']}: {g['description']}" for g in guidelines_list
    ])
    instruction = (
        "Analyze the customer service conversation and return ONLY valid JSON with these exact keys: "
        "'key_issues' (list of short strings), 'positive_highlights' (list of short strings), "
        "and 'guideline_adherence' (list of objects with keys: guideline, status (Passed/Failed), details (1 sentence max)). "
        "Always include ALL keys, even if empty. Do not include any explanation or text outside the JSON."
    )
    if extra_instructions:
        instruction += f" {extra_instructions}"
    if case_hint:
        instruction += f" Special Note: {case_hint}"
    alpaca_prompt = f"""
### Instruction:
{instruction}

### Input:
Guidelines:
{guidelines_str}

Conversation:
{transcript_text}

### Output:
"""
    return alpaca_prompt

def extract_first_valid_json(text):
    import json
    import ast
    required_keys = ["key_issues", "positive_highlights", "guideline_adherence"]
    # Remove code block markers and whitespace
    cleaned = text.strip().replace('```json', '').replace('```', '').strip()

    # Helper: Find all top-level JSON objects using brace matching
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

    # Try to parse each candidate as JSON or Python dict
    for candidate in find_json_candidates(cleaned):
        try:
            # Try JSON first
            obj = json.loads(candidate)
        except Exception:
            try:
                # Try to fix common issues: single quotes, trailing commas
                fixed = candidate.replace("'", '"')
                fixed = re.sub(r',\s*([}\]])', r'\1', fixed)
                obj = json.loads(fixed)
            except Exception:
                try:
                    obj = ast.literal_eval(candidate)
                except Exception:
                    continue
        # Flexible key matching
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
        # Fill missing keys with empty lists and warn
        for k in required_keys:
            if key_map[k] is None:
                obj[k] = []
            elif key_map[k] != k:
                obj[k] = obj.pop(key_map[k])
        # All required keys must be present and lists (guideline_adherence can be list of dicts)
        if all(k in obj and isinstance(obj[k], list) for k in required_keys):
            return obj
    # If nothing found, try to parse the whole cleaned string as a last resort
    try:
        obj = json.loads(cleaned)
        # Same key normalization as above
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

def is_valid_analysis(parsed):
    if not parsed:
        return False
    if not isinstance(parsed, dict):
        return False
    if "key_issues" not in parsed or "positive_highlights" not in parsed or "guideline_adherence" not in parsed:
        return False
    if not parsed["key_issues"] or not parsed["positive_highlights"]:
        return False
    return True

async def run_test_case(transcript, case_name, case_hint=None):
    print(f"\n==================== {case_name} ====================\n")
    model_name = 'agent2:latest'  # Always use agent2:latest
    ollama_service.load_model(model_name)
    agent = AnalysisAgent()
    # Get guidelines list for checking
    guidelines_list = agent.get_guidelines()
    guideline_names = [g['guideline'] for g in guidelines_list]
    
    def missing_guidelines(parsed):
        if not parsed or 'guideline_adherence' not in parsed:
            return guideline_names
        present = set()
        for g in parsed['guideline_adherence']:
            # Try to match by lower/space-insensitive
            for ref in guideline_names:
                if g.get('guideline', '').lower().replace(' ', '') == ref.lower().replace(' ', ''):
                    present.add(ref)
        return [g for g in guideline_names if g not in present]

    # Retry logic
    max_retries = 3
    attempt = 0
    parsed = None
    while attempt < max_retries:
        print(f"\n--- ANALYSIS PROMPT (Attempt {attempt+1}) ---\n")
        extra_instructions = None
        if attempt > 0:
            extra_instructions = (
                "You must always include at least one key issue or one positive highlight. "
                "All guidelines must be present in the 'guideline_adherence' list. Do not leave any required field empty."
            )
        analysis_prompt = get_analysis_prompt(transcript, case_hint=case_hint, extra_instructions=extra_instructions)
        print(analysis_prompt)
        print("\n--- RAW ANALYSIS RESPONSE ---\n")
        analysis_response = ollama_service.test_generation(model_name, analysis_prompt)
        print(analysis_response)
        print("\n--- PARSED ANALYSIS OUTPUT ---\n")
        parsed = extract_first_valid_json(analysis_response)
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
        # Check for retry condition
        if parsed and (
            (parsed.get('key_issues') and len(parsed['key_issues']) > 0) or (parsed.get('positive_highlights') and len(parsed['positive_highlights']) > 0)
        ):
            missing = missing_guidelines(parsed)
            if not missing:
                break  # All guidelines present, success
            else:
                print(f"Warning: Missing guidelines in output: {missing}. Retrying...")
        else:
            print("Warning: No key issues or positive highlights found. Retrying...")
        attempt += 1
    if attempt == max_retries:
        print("\nERROR: Model failed to include all guidelines after 3 attempts. Last output shown above.\n")
    ollama_service.unload_model()

async def main():
    # Test case 1 (sarcastic agent)
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
    await run_test_case(transcript1, "Test Case 1: Sarcastic Agent")

    # Test case 2 (package delay, dismissive agent)
    transcript2 = [
        {"sender": "customer", "text": "Hi, my package was supposed to arrive yesterday, and it still hasn't shown up. Can you check what's going on?"},
        {"sender": "agent", "text": "If it's late, it's probably the courier's fault. We shipped it on our end."},
        {"sender": "customer", "text": "I get that, but can you look it up for me? I need this for an event tomorrow."},
        {"sender": "agent", "text": "You can check the tracking link we emailed you. We don't have more info than that."},
        {"sender": "customer", "text": "The tracking page says it's stuck in transit for two days!"},
        {"sender": "agent", "text": "That's out of our hands. You can call the shipping company if it's that urgent."}
    ]
    case_hint2 = "The agent does not take responsibility and fails to help the customer with the package delay."
    await run_test_case(transcript2, "Test Case 2: Package Delay - Dismissive Agent", case_hint=case_hint2)

    # Test case 3 (subscription issue, helpful agent)
    transcript3 = [
        {"sender": "customer", "text": "Hey, I just bought a subscription but the app crashed and I can't even use the features I paid for."},
        {"sender": "agent", "text": "Sorry to hear that. Can you tell me when you made the purchase?"},
        {"sender": "customer", "text": "This morning, around 9 AM. I have the receipt."},
        {"sender": "agent", "text": "Alright, I'll escalate this to the billing team. You should hear back within 24–48 hours. In the meantime, try reinstalling the app."},
        {"sender": "customer", "text": "Okay, I'll wait. Thanks for helping so quickly."},
        {"sender": "agent", "text": "You're welcome! We'll make sure it's sorted."}
    ]
    case_hint3 = "The agent is helpful and polite, but the issue is not fully resolved yet."
    await run_test_case(transcript3, "Test Case 3: Subscription Issue - Helpful Agent", case_hint=case_hint3)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 