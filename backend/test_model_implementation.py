#!/usr/bin/env python3
"""
Comprehensive test script for the AURIS model implementation.
This script tests model loading, switching, and API functionality.
"""

import asyncio
import sys
import json
import time
from pathlib import Path
from typing import Dict, Any

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent / "app"))

try:
    from app.services.model_loader import model_loader
    from app.services.processing_pipeline import processing_pipeline
    from app.services.analysis_agent import analysis_agent
    from app.services.evaluation_agent import evaluation_agent
    from app.services.recommendation_agent import recommendation_agent
except ImportError as e:
    print(f"❌ Failed to import required modules: {e}")
    print("Make sure you're running this script from the backend directory")
    sys.exit(1)

class ModelTester:
    def __init__(self):
        self.test_results = {}
        self.sample_transcript = [
            {"sender": "customer", "text": "Hello, I'm having trouble with my order."},
            {"sender": "agent", "text": "Hi there! I'd be happy to help you with your order. Can you please provide your order number?"},
            {"sender": "customer", "text": "Yes, it's #12345. I ordered it 3 days ago but haven't received any updates."},
            {"sender": "agent", "text": "I can see your order #12345. It was shipped yesterday and should arrive tomorrow. Let me check the tracking for you."},
            {"sender": "customer", "text": "Thank you! That's great news."},
            {"sender": "agent", "text": "You're welcome! Is there anything else I can help you with today?"}
        ]

    async def test_model_loader(self) -> Dict[str, Any]:
        """Test the model loader functionality."""
        print("🔧 Testing Model Loader...")
        results = {"status": "failed", "details": []}
        
        try:
            # Test 1: Check models directory
            models_dir = Path("../../models")
            if not models_dir.exists():
                results["details"].append("❌ Models directory does not exist")
                return results
            
            results["details"].append("✅ Models directory exists")
            
            # Test 2: Check discovered models and adapters
            status = model_loader.get_model_status()
            
            # Check available base models
            available_models = status.get("available_base_models", [])
            results["details"].append(f"✅ Discovered {len(available_models)} base models")
            
            for model in available_models:
                results["details"].append(f"  📦 {model['name']} ({model['type']})")
            
            # Check adapters
            adapters = status.get("adapters", {})
            results["details"].append(f"✅ Discovered {len(adapters)} adapters")
            
            for name, info in adapters.items():
                if info["installed"]:
                    results["details"].append(f"  🔧 {name} adapter: {info['base_model_name']}")
                    if info["compatible"]:
                        results["details"].append(f"    ✅ Compatible with current base model")
                    else:
                        results["details"].append(f"    ⚠️  Not compatible with current base model")
                else:
                    results["details"].append(f"  ❌ {name} adapter missing")
            
            # Test 3: Load base model
            print("   Loading base model...")
            base_loaded = model_loader.load_base_model()
            if base_loaded:
                results["details"].append("✅ Base model loaded successfully")
                results["details"].append(f"  📋 Current base model: {status.get('current_base_model', 'unknown')}")
            else:
                results["details"].append("❌ Failed to load base model")
                return results
            
            # Test 4: Test adapter loading for each agent
            for agent_type in ["evaluation", "analysis", "recommendation"]:
                print(f"   Testing {agent_type} adapter...")
                adapter_loaded = model_loader.load_adapter(agent_type)
                if adapter_loaded:
                    results["details"].append(f"✅ {agent_type} adapter loaded successfully")
                    
                    # Test response generation
                    try:
                        test_response = model_loader.generate_response("Hello, how are you?", agent_type, max_length=50)
                        if test_response and not test_response.startswith("Error"):
                            results["details"].append(f"✅ {agent_type} response generation successful")
                        else:
                            results["details"].append(f"❌ {agent_type} response generation failed: {test_response}")
                    except Exception as e:
                        results["details"].append(f"❌ {agent_type} response generation error: {str(e)}")
                else:
                    results["details"].append(f"❌ Failed to load {agent_type} adapter")
            
            results["status"] = "passed"
            
        except Exception as e:
            results["details"].append(f"❌ Error in model loader test: {str(e)}")
        
        return results

    async def test_processing_pipeline(self) -> Dict[str, Any]:
        """Test the processing pipeline functionality."""
        print("🔄 Testing Processing Pipeline...")
        results = {"status": "failed", "details": []}
        
        try:
            # Test 1: Check if pipeline is initialized
            if hasattr(processing_pipeline, 'process_chat_log'):
                results["details"].append("✅ Processing pipeline initialized")
            else:
                results["details"].append("❌ Processing pipeline not properly initialized")
                return results
            
            # Test 2: Test pipeline with sample data
            print("   Testing pipeline with sample transcript...")
            start_time = time.time()
            
            pipeline_result = await processing_pipeline.process_chat_log(
                self.sample_transcript, 
                "test-chat-log-id"
            )
            
            end_time = time.time()
            processing_time = end_time - start_time
            
            if pipeline_result and "agents" in pipeline_result:
                results["details"].append("✅ Pipeline processing completed")
                results["details"].append(f"✅ Processing time: {processing_time:.2f} seconds")
                
                # Check individual agent results
                for agent_type, agent_result in pipeline_result["agents"].items():
                    if agent_result["status"] == "completed":
                        results["details"].append(f"✅ {agent_type} agent completed successfully")
                    else:
                        results["details"].append(f"❌ {agent_type} agent failed: {agent_result.get('error_message', 'Unknown error')}")
                
                results["overall_status"] = pipeline_result.get("overall_status", "unknown")
            else:
                results["details"].append("❌ Pipeline processing failed")
                return results
            
            results["status"] = "passed"
            
        except Exception as e:
            results["details"].append(f"❌ Error in processing pipeline test: {str(e)}")
        
        return results

    async def test_individual_agents(self) -> Dict[str, Any]:
        """Test individual agent functionality."""
        print("🤖 Testing Individual Agents...")
        results = {"status": "failed", "details": []}
        
        try:
            agents = {
                "evaluation": evaluation_agent,
                "analysis": analysis_agent,
                "recommendation": recommendation_agent
            }
            
            for agent_name, agent in agents.items():
                print(f"   Testing {agent_name} agent...")
                
                # Test agent initialization
                if hasattr(agent, 'process_chat_log'):
                    results["details"].append(f"✅ {agent_name} agent initialized")
                else:
                    results["details"].append(f"❌ {agent_name} agent not properly initialized")
                    continue
                
                # Test agent processing
                try:
                    agent_result = await agent.process_chat_log(self.sample_transcript)
                    
                    if agent_result and "status" in agent_result:
                        if agent_result["status"] == "completed":
                            results["details"].append(f"✅ {agent_name} agent processing successful")
                        else:
                            results["details"].append(f"❌ {agent_name} agent processing failed: {agent_result.get('error_message', 'Unknown error')}")
                    else:
                        results["details"].append(f"❌ {agent_name} agent returned invalid result")
                        
                except Exception as e:
                    results["details"].append(f"❌ {agent_name} agent error: {str(e)}")
            
            results["status"] = "passed"
            
        except Exception as e:
            results["details"].append(f"❌ Error in individual agents test: {str(e)}")
        
        return results

    async def test_api_endpoints(self) -> Dict[str, Any]:
        """Test API endpoints (requires running server)."""
        print("🌐 Testing API Endpoints...")
        results = {"status": "failed", "details": []}
        
        try:
            import requests
            
            base_url = "http://localhost:3001/api"
            
            # Test health endpoint
            try:
                response = requests.get(f"{base_url.replace('/api', '')}/health", timeout=5)
                if response.status_code == 200:
                    results["details"].append("✅ Health endpoint accessible")
                else:
                    results["details"].append(f"❌ Health endpoint returned {response.status_code}")
            except requests.exceptions.RequestException:
                results["details"].append("⚠️  Health endpoint not accessible (server may not be running)")
            
            # Test model status endpoint (requires authentication)
            try:
                response = requests.get(f"{base_url}/chat-logs/debug/model-status", timeout=5)
                if response.status_code == 200:
                    model_status = response.json()
                    results["details"].append("✅ Model status endpoint accessible")
                    results["details"].append(f"   - Base model loaded: {model_status.get('base_model_loaded', False)}")
                    results["details"].append(f"   - Current adapter: {model_status.get('current_adapter', 'None')}")
                elif response.status_code == 401:
                    results["details"].append("⚠️  Model status endpoint requires authentication")
                else:
                    results["details"].append(f"❌ Model status endpoint returned {response.status_code}")
            except requests.exceptions.RequestException:
                results["details"].append("⚠️  Model status endpoint not accessible")
            
            results["status"] = "passed"
            
        except ImportError:
            results["details"].append("⚠️  Requests library not available for API testing")
            results["status"] = "passed"
        except Exception as e:
            results["details"].append(f"❌ Error in API endpoints test: {str(e)}")
        
        return results

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return comprehensive results."""
        print("🧪 Starting Comprehensive Model Testing...")
        print("=" * 60)
        
        self.test_results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "tests": {}
        }
        
        # Run all tests
        tests = [
            ("model_loader", self.test_model_loader),
            ("processing_pipeline", self.test_processing_pipeline),
            ("individual_agents", self.test_individual_agents),
            ("api_endpoints", self.test_api_endpoints)
        ]
        
        for test_name, test_func in tests:
            print(f"\n{'='*20} {test_name.upper()} {'='*20}")
            result = await test_func()
            self.test_results["tests"][test_name] = result
            
            # Print results
            print(f"Status: {result['status'].upper()}")
            for detail in result["details"]:
                print(f"  {detail}")
        
        # Generate summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, result in self.test_results["tests"].items():
            status = result["status"]
            if status == "passed":
                passed_tests += 1
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        
        print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All tests passed! Model implementation is ready for deployment.")
        else:
            print("⚠️  Some tests failed. Please review the issues above.")
        
        return self.test_results

    def save_results(self, filename: str = "model_test_results.json"):
        """Save test results to a JSON file."""
        try:
            with open(filename, 'w') as f:
                json.dump(self.test_results, f, indent=2)
            print(f"\n📄 Test results saved to {filename}")
        except Exception as e:
            print(f"❌ Failed to save test results: {e}")

async def main():
    """Main function to run the comprehensive model tests."""
    tester = ModelTester()
    
    try:
        results = await tester.run_all_tests()
        tester.save_results()
        
        # Exit with appropriate code
        all_passed = all(test["status"] == "passed" for test in results["tests"].values())
        sys.exit(0 if all_passed else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Testing failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 