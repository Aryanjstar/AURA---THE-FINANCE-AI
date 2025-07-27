#!/usr/bin/env python3
"""
AURA Platform - Google Cloud App Engine Deployment Script
Deploys both Node.js backend and Go MCP service to App Engine
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path

class AuraDeployment:
    def __init__(self):
        self.project_id = None
        self.region = "us-central1"
        self.services = {
            "default": "./aura-platform",
            "fi-mcp": "./fi-mcp-dev"
        }
    
    def run_command(self, cmd, check=True, capture_output=False):
        """Run shell command with error handling"""
        print(f"🔧 Running: {cmd}")
        try:
            if capture_output:
                result = subprocess.run(cmd, shell=True, check=check, 
                                      capture_output=True, text=True)
                return result.stdout.strip()
            else:
                subprocess.run(cmd, shell=True, check=check)
                return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Command failed: {e}")
            if capture_output and e.stdout:
                print(f"Output: {e.stdout}")
            if capture_output and e.stderr:
                print(f"Error: {e.stderr}")
            return False if not check else sys.exit(1)
    
    def check_gcloud_auth(self):
        """Check if user is authenticated with gcloud"""
        print("🔐 Checking gcloud authentication...")
        try:
            result = self.run_command("gcloud auth list --filter=status:ACTIVE --format='value(account)'", 
                                    capture_output=True)
            if result:
                print(f"✅ Authenticated as: {result}")
                return True
            else:
                print("❌ Not authenticated with gcloud")
                return False
        except:
            return False
    
    def authenticate(self):
        """Authenticate with Google Cloud"""
        if not self.check_gcloud_auth():
            print("🔐 Please authenticate with Google Cloud...")
            self.run_command("gcloud auth login")
            
            # Set application default credentials
            print("🔑 Setting up application default credentials...")
            self.run_command("gcloud auth application-default login")
    
    def setup_project(self):
        """Create or select GCP project"""
        print("🏗️ Setting up GCP project...")
        
        # List existing projects
        try:
            projects = self.run_command("gcloud projects list --format='value(projectId)'", 
                                      capture_output=True)
            if projects:
                print("📋 Existing projects:")
                for i, project in enumerate(projects.split('\n'), 1):
                    print(f"  {i}. {project}")
        except:
            pass
        
        # Get project ID from user
        self.project_id = input("\n📝 Enter your GCP Project ID (or create new): ").strip()
        
        if not self.project_id:
            # Generate project ID
            import random
            suffix = ''.join(random.choices('0123456789', k=6))
            self.project_id = f"aura-platform-{suffix}"
            print(f"🆕 Creating new project: {self.project_id}")
            
            # Create project
            self.run_command(f"gcloud projects create {self.project_id} --name='AURA Platform'")
            
            # Enable billing (you'll need to do this manually in console)
            print(f"⚠️ Please enable billing for project {self.project_id} in the GCP Console")
            input("Press Enter when billing is enabled...")
        
        # Set current project
        self.run_command(f"gcloud config set project {self.project_id}")
        print(f"✅ Using project: {self.project_id}")
    
    def enable_apis(self):
        """Enable required GCP APIs"""
        print("🔌 Enabling required APIs...")
        apis = [
            "appengine.googleapis.com",
            "cloudresourcemanager.googleapis.com",
            "cloudbuild.googleapis.com",
            "storage-component.googleapis.com",
            "logging.googleapis.com",
            "monitoring.googleapis.com"
        ]
        
        for api in apis:
            print(f"  Enabling {api}...")
            self.run_command(f"gcloud services enable {api}")
        
        print("✅ All APIs enabled")
    
    def create_app_engine_app(self):
        """Create App Engine application"""
        print("🚀 Creating App Engine application...")
        try:
            # Check if app already exists
            self.run_command("gcloud app describe", capture_output=True)
            print("✅ App Engine application already exists")
        except:
            # Create new app
            self.run_command(f"gcloud app create --region={self.region}")
            print("✅ App Engine application created")
    
    def update_environment_variables(self):
        """Update app.yaml files with correct project ID"""
        print("🔧 Updating environment variables...")
        
        # Update main service app.yaml
        app_yaml_path = Path("aura-platform/app.yaml")
        if app_yaml_path.exists():
            content = app_yaml_path.read_text()
            content = content.replace("your-project-id", self.project_id)
            content = content.replace("FI_MCP_URL: https://fi-mcp-dot-your-project-id.appspot.com", 
                                    f"FI_MCP_URL: https://fi-mcp-dot-{self.project_id}.appspot.com")
            app_yaml_path.write_text(content)
            print("  ✅ Updated aura-platform/app.yaml")
    
    def deploy_services(self):
        """Deploy both services to App Engine"""
        print("🚀 Deploying services...")
        
        # Deploy Fi MCP service first (dependency)
        print("📦 Deploying Fi MCP service...")
        os.chdir("fi-mcp-dev")
        self.run_command("gcloud app deploy app.yaml --quiet")
        os.chdir("..")
        print("✅ Fi MCP service deployed")
        
        # Deploy main service
        print("📦 Deploying main AURA service...")
        os.chdir("aura-platform")
        self.run_command("gcloud app deploy app.yaml --quiet")
        os.chdir("..")
        print("✅ Main service deployed")
        
        # Deploy dispatch rules
        print("📦 Deploying dispatch rules...")
        self.run_command("gcloud app deploy dispatch.yaml --quiet")
        print("✅ Dispatch rules deployed")
    
    def get_service_urls(self):
        """Get the URLs of deployed services"""
        print("🔗 Getting service URLs...")
        
        main_url = f"https://{self.project_id}.appspot.com"
        fi_mcp_url = f"https://fi-mcp-dot-{self.project_id}.appspot.com"
        
        return {
            "main": main_url,
            "fi_mcp": fi_mcp_url
        }
    
    def create_example_requests(self, urls):
        """Create example API requests"""
        examples = f"""
# AURA Platform - API Examples

## Main Application
🌐 **URL**: {urls['main']}

### Test the main application:
curl -X GET "{urls['main']}"

### Login and access dashboard:
curl -X GET "{urls['main']}/dashboard.html"

### Test AI chat:
curl -X POST "{urls['main']}/api/chat" \\
  -H "Content-Type: application/json" \\
  -d '{{"message": "What is my portfolio performance?", "sessionId": "test-session"}}'

## Fi MCP Service  
🌐 **URL**: {urls['fi_mcp']}

### Test Fi MCP health:
curl -X GET "{urls['fi_mcp']}/health"

### Fetch net worth:
curl -X POST "{urls['main']}/api/fi-mcp/fetch-net-worth" \\
  -H "Content-Type: application/json" \\
  -d '{{"phone_number": "1234567890"}}'

### Fetch transactions:
curl -X POST "{urls['main']}/api/fi-mcp/fetch-bank-transactions" \\
  -H "Content-Type: application/json" \\
  -d '{{"phone_number": "1234567890"}}'

## Cost Optimization Tips:
1. **Auto-scaling**: Services scale to 0 when not in use
2. **Monitoring**: Set up budget alerts in GCP Console
3. **Free tier**: App Engine offers generous free quotas
4. **Logs**: Monitor logs to optimize performance
"""
        
        with open("deployment_guide.md", "w") as f:
            f.write(examples)
        
        print("📝 Created deployment_guide.md with API examples")
    
    def deploy(self):
        """Main deployment function"""
        print("🚀 Starting AURA Platform deployment to Google Cloud App Engine")
        print("=" * 60)
        
        try:
            # Step 1: Authentication  
            self.authenticate()
            
            # Step 2: Project setup
            self.setup_project()
            
            # Step 3: Enable APIs
            self.enable_apis()
            
            # Step 4: Create App Engine app
            self.create_app_engine_app()
            
            # Step 5: Update configuration
            self.update_environment_variables()
            
            # Step 6: Deploy services
            self.deploy_services()
            
            # Step 7: Get URLs and create examples
            urls = self.get_service_urls()
            self.create_example_requests(urls)
            
            print("\n" + "=" * 60)
            print("🎉 DEPLOYMENT SUCCESSFUL!")
            print("=" * 60)
            print(f"🌐 Main Application: {urls['main']}")
            print(f"🔧 Fi MCP Service: {urls['fi_mcp']}")
            print(f"📊 Dashboard: {urls['main']}/dashboard.html")
            print("\n📝 Check deployment_guide.md for API examples")
            print("💰 Monitor costs at: https://console.cloud.google.com/billing")
            
        except KeyboardInterrupt:
            print("\n❌ Deployment cancelled by user")
            sys.exit(1)
        except Exception as e:
            print(f"\n❌ Deployment failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    deployer = AuraDeployment()
    deployer.deploy() 