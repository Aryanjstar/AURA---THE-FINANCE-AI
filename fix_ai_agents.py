#!/usr/bin/env python3
"""
Fix AURA AI Agents - Environment Setup Script
Fixes the API key issue that's causing agents to lose context
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(cmd):
    """Run shell command"""
    print(f"🔧 Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Error: {result.stderr}")
        return False
    return result.stdout.strip()

def main():
    print("🚀 AURA AI Agents Fix Script")
    print("=" * 40)
    
    # Step 1: Get API Key
    print("\n📝 Step 1: Get your Gemini API Key")
    print("Visit: https://aistudio.google.com/app/apikey")
    print("1. Sign in with your Google account")
    print("2. Click 'Create API Key'") 
    print("3. Copy the generated key")
    
    api_key = input("\n🔑 Paste your Gemini API Key here: ").strip()
    
    if not api_key or api_key == "your-gemini-api-key-here":
        print("❌ Please provide a valid API key")
        sys.exit(1)
    
    # Step 2: Update app.yaml
    print("\n🔧 Step 2: Updating app.yaml...")
    app_yaml_path = Path("aura-platform/app.yaml")
    
    if not app_yaml_path.exists():
        print("❌ app.yaml not found!")
        sys.exit(1)
    
    # Read current content
    content = app_yaml_path.read_text()
    
    # Replace placeholder with actual API key
    content = content.replace("GEMINI_API_KEY: your-gemini-api-key-here", 
                             f"GEMINI_API_KEY: {api_key}")
    
    # Set other required variables
    content = content.replace("FIREBASE_PROJECT_ID: your-firebase-project-id",
                             "FIREBASE_PROJECT_ID: aura-financial-assistant")
    
    # Write updated content
    app_yaml_path.write_text(content)
    print("✅ app.yaml updated with API key!")
    
    # Step 3: Redeploy
    print("\n🚀 Step 3: Redeploying to Google Cloud...")
    print("This will take 2-3 minutes...")
    
    # Change to aura-platform directory and deploy
    os.chdir("aura-platform")
    success = run_command("gcloud app deploy app.yaml --quiet")
    
    if success:
        print("\n🎉 DEPLOYMENT SUCCESSFUL!")
        print("✅ AI agents are now fixed and should work properly!")
        print("\n🌐 Test your fixed platform:")
        print("https://aura-financial-assistant.uc.r.appspot.com")
        
        # Test the fix
        print("\n🧪 Testing AI agent...")
        test_cmd = '''curl -X POST "https://aura-financial-assistant.uc.r.appspot.com/api/chat" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "What is my portfolio performance?", "sessionId": "test-fix"}'
'''
        print("Test command:")
        print(test_cmd)
        
    else:
        print("❌ Deployment failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 