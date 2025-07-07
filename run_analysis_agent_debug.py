import asyncio
import json
from backend.app.services.analysis_agent import analysis_agent

# Load the test chat log
with open('test_privacy_breach_chatlog.json', 'r', encoding='utf-8') as f:
    transcript = json.load(f)

async def main():
    # You can pass guidelines=None to just test the default behavior
    result = await analysis_agent.analyze_chat(transcript, guidelines=None)
    print("AnalysisAgent output:")
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main()) 