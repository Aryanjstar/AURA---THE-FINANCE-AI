#!/usr/bin/env python3
"""
AURA Platform - GCP Cost Monitoring Script
Monitors spending and provides cost optimization recommendations
"""

import subprocess
import json
import sys
from datetime import datetime, timedelta

class CostMonitor:
    def __init__(self):
        self.project_id = None
    
    def run_command(self, cmd, capture_output=True):
        """Run shell command and return output"""
        try:
            result = subprocess.run(cmd, shell=True, check=True, 
                                  capture_output=capture_output, text=True)
            return result.stdout.strip() if capture_output else True
        except subprocess.CalledProcessError as e:
            print(f"❌ Command failed: {e}")
            return None
    
    def get_current_project(self):
        """Get current GCP project"""
        project = self.run_command("gcloud config get-value project")
        if project and project != "(unset)":
            self.project_id = project
            return project
        else:
            print("❌ No active GCP project found. Run 'gcloud config set project PROJECT_ID'")
            return None
    
    def get_billing_info(self):
        """Get billing information for the project"""
        print(f"💰 Getting billing information for project: {self.project_id}")
        
        # Get billing account
        billing_cmd = f"gcloud beta billing projects describe {self.project_id} --format='value(billingAccountName)'"
        billing_account = self.run_command(billing_cmd)
        
        if billing_account:
            print(f"📋 Billing Account: {billing_account}")
            return billing_account
        else:
            print("⚠️ No billing account found or billing not enabled")
            return None
    
    def get_app_engine_usage(self):
        """Get App Engine usage statistics"""
        print("📊 Getting App Engine usage...")
        
        # Get App Engine services
        services_cmd = "gcloud app services list --format='value(id)'"
        services = self.run_command(services_cmd)
        
        if services:
            service_list = services.split('\n')
            print(f"🚀 Active services: {', '.join(service_list)}")
            
            for service in service_list:
                # Get versions for each service
                versions_cmd = f"gcloud app versions list --service={service} --format='value(id,traffic_split)'"
                versions = self.run_command(versions_cmd)
                if versions:
                    print(f"  📦 {service} versions: {versions}")
        else:
            print("❌ No App Engine services found")
    
    def get_storage_usage(self):
        """Get Cloud Storage usage"""
        print("💾 Checking Cloud Storage usage...")
        
        # List buckets
        buckets_cmd = "gsutil ls -p " + self.project_id
        buckets = self.run_command(buckets_cmd)
        
        if buckets:
            bucket_list = buckets.split('\n')
            print(f"🪣 Storage buckets: {len(bucket_list)}")
            
            for bucket in bucket_list:
                if bucket.strip():
                    # Get bucket size
                    size_cmd = f"gsutil du -s {bucket.strip()}"
                    size = self.run_command(size_cmd)
                    if size:
                        print(f"  📁 {bucket}: {size}")
        else:
            print("📦 No storage buckets found")
    
    def get_quota_usage(self):
        """Check quota and limits"""
        print("📈 Checking quotas and limits...")
        
        # App Engine quotas
        quotas = [
            "appengine.googleapis.com/daily_bandwidth",
            "appengine.googleapis.com/requests",
            "compute.googleapis.com/instances"
        ]
        
        for quota in quotas:
            quota_cmd = f"gcloud compute project-info describe --format='value(quotas[metric={quota}].usage,quotas[metric={quota}].limit)'"
            result = self.run_command(quota_cmd)
            if result:
                print(f"  📊 {quota}: {result}")
    
    def provide_optimization_tips(self):
        """Provide cost optimization recommendations"""
        print("\n💡 COST OPTIMIZATION RECOMMENDATIONS:")
        print("=" * 50)
        
        tips = [
            "🔧 **Auto-scaling**: Your App Engine services automatically scale to 0 when idle",
            "📊 **Monitoring**: Set up budget alerts in GCP Console to track spending",
            "🆓 **Free Tier**: App Engine includes generous free quotas:",
            "   • 28 frontend instance hours per day",
            "   • 9 backend instance hours per day",
            "   • 1GB outgoing bandwidth per day",
            "   • 1GB incoming bandwidth per day",
            "🏃 **Performance**: Optimize cold start times to reduce costs:",
            "   • Keep dependencies minimal",
            "   • Use efficient database connections",
            "   • Implement proper caching",
            "📱 **Traffic Management**: Use traffic splitting for gradual rollouts",
            "🗄️ **Storage**: Clean up unused Cloud Storage buckets and files",
            "📝 **Logs**: Set log retention policies to avoid unnecessary charges",
            "⏰ **Scheduling**: Use Cloud Scheduler for periodic tasks instead of always-on instances"
        ]
        
        for tip in tips:
            print(tip)
    
    def create_cost_alert_setup(self):
        """Create instructions for setting up cost alerts"""
        alert_instructions = f"""
# Setting Up Cost Alerts for AURA Platform

## 1. Budget Alert Setup:

### Via Console:
1. Go to: https://console.cloud.google.com/billing/{self.project_id}/budgets
2. Click "Create Budget"
3. Set budget name: "AURA Platform Monthly Budget"
4. Set amount: $50 (or your preferred limit)
5. Set alerts at: 50%, 90%, 100%
6. Add your email for notifications

### Via Command Line:
```bash
# Create a budget (replace with your billing account)
gcloud alpha billing budgets create \\
    --billing-account=YOUR_BILLING_ACCOUNT \\
    --display-name="AURA Platform Budget" \\
    --budget-amount=50 \\
    --threshold-rule=percent=0.5 \\
    --threshold-rule=percent=0.9 \\
    --threshold-rule=percent=1.0
```

## 2. Monitoring Dashboard:

### Key Metrics to Watch:
- App Engine instance hours
- Bandwidth usage  
- Storage costs
- API calls

### Useful Commands:
```bash
# Check current month costs
gcloud billing budgets list --billing-account=YOUR_BILLING_ACCOUNT

# Monitor App Engine usage
gcloud app services list
gcloud app instances list

# Check logs for errors (costly)
gcloud logging read "resource.type=gae_app" --limit=10
```

## 3. Free Tier Limits:
- Monitor these closely to stay within free limits
- App Engine: 28 frontend + 9 backend hours/day
- Bandwidth: 1GB outgoing/day
- Storage: 5GB free

## 4. Emergency Stop:
If costs exceed expectations:
```bash
# Stop all traffic (emergency only)
gcloud app services set-traffic default --splits=STOPPED=1

# Delete unused versions
gcloud app versions delete VERSION_ID --service=SERVICE_NAME
```
"""
        
        with open("cost_alerts_setup.md", "w") as f:
            f.write(alert_instructions)
        
        print(f"\n📝 Created cost_alerts_setup.md with detailed budget setup instructions")
    
    def monitor(self):
        """Main monitoring function"""
        print("💰 AURA Platform - GCP Cost Monitor")
        print("=" * 40)
        
        # Get project info
        if not self.get_current_project():
            return
        
        print(f"🏗️ Project: {self.project_id}")
        print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Gather usage information
        self.get_billing_info()
        print()
        
        self.get_app_engine_usage()
        print()
        
        self.get_storage_usage()
        print()
        
        # Provide recommendations
        self.provide_optimization_tips()
        
        # Create alert setup guide
        self.create_cost_alert_setup()
        
        print(f"\n🎯 Quick Links:")
        print(f"📊 Billing Console: https://console.cloud.google.com/billing")
        print(f"📈 App Engine Console: https://console.cloud.google.com/appengine")
        print(f"💾 Storage Console: https://console.cloud.google.com/storage")
        print(f"📝 Logs: https://console.cloud.google.com/logs")

if __name__ == "__main__":
    monitor = CostMonitor()
    monitor.monitor() 