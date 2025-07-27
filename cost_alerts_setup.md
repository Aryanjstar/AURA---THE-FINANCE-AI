
# Setting Up Cost Alerts for AURA Platform

## 1. Budget Alert Setup:

### Via Console:
1. Go to: https://console.cloud.google.com/billing/aura-financial-assistant/budgets
2. Click "Create Budget"
3. Set budget name: "AURA Platform Monthly Budget"
4. Set amount: $50 (or your preferred limit)
5. Set alerts at: 50%, 90%, 100%
6. Add your email for notifications

### Via Command Line:
```bash
# Create a budget (replace with your billing account)
gcloud alpha billing budgets create \
    --billing-account=YOUR_BILLING_ACCOUNT \
    --display-name="AURA Platform Budget" \
    --budget-amount=50 \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.9 \
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
