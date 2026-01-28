# LML Flex Consumption API - Monitoring and Alerts Setup

## Overview

Application monitoring has been configured for the new `lml-api-flex` Function App using Azure Monitor and Application Insights.

## Monitoring Components Configured

### 1. Application Insights
- **Name:** lml-api-flex
- **Location:** lml-rg resource group
- **Status:** ✅ Active and collecting telemetry

### 2. Action Group Created
- **Name:** lml-api-alerts
- **Short Name:** LiftAPI
- **Purpose:** Central routing for all alert notifications
- **Status:** ✅ Created and ready to use

## Manual Setup Instructions (Complete in Azure Portal)

### Step 1: Create Alert Rule for HTTP 5xx Errors

1. Navigate to Azure Portal
2. Go to **Monitor → Alerts → New Alert Rule**
3. Configure as follows:
   - **Resource:** Select `lml-api-flex` Function App
   - **Condition:**
     - Metric: `Http5xx`
     - Operator: Greater than
     - Threshold: 5
     - Aggregation: Total
     - Time window: 5 minutes
     - Frequency: Every 1 minute
   - **Actions:** Select `lml-api-alerts` action group
   - **Alert name:** `lml-api-flex-http-5xx-errors`
   - **Severity:** 2 (Warning)

### Step 2: Create Alert Rule for High Response Time

1. **Monitor → Alerts → New Alert Rule**
2. Configure:
   - **Resource:** `lml-api-flex` Function App
   - **Condition:**
     - Metric: `AverageResponseTime`
     - Operator: Greater than
     - Threshold: 5000 (milliseconds)
     - Aggregation: Average
     - Time window: 5 minutes
     - Frequency: Every 1 minute
   - **Actions:** Select `lml-api-alerts`
   - **Alert name:** `lml-api-flex-slow-response`
   - **Severity:** 2 (Warning)

### Step 3: Create Smart Detection Rule

Smart Detection is automatically enabled for Application Insights. It will alert on:
- **Failure rate anomalies**
- **Performance degradation**
- **Memory leak patterns**
- **Exception volume anomalies**

### Step 4: Configure Action Group Recipients (Optional)

To actually receive alerts, add notification channels to `lml-api-alerts`:

1. Go to **Monitor → Action Groups → lml-api-alerts**
2. Click **Edit** (pencil icon)
3. Add notification types:
   - **Email/SMS:** Add email address for critical alerts
   - **Webhook:** Configure for integration with incident management
   - **Automation:** Connect to runbooks for auto-remediation

## Key Metrics to Monitor

### Critical Metrics

| Metric | Description | Alert Threshold | Check Frequency |
|--------|-------------|-----------------|-----------------|
| Http5xx | Server errors | > 5 per 5 min | Every 1 min |
| Http4xx | Client errors | > 20 per 5 min | Every 5 min |
| AvailabilityPercentage | Uptime | < 99.9% per day | Every 1 hour |
| AverageResponseTime | Performance | > 5000 ms | Every 1 min |
| FunctionExecutionUnitsConsumed | Cost/Load | > 1000000 per hour | Every 5 min |

### Informational Metrics

| Metric | Description |
|--------|-------------|
| FunctionExecutionCount | Total function invocations |
| FunctionExecutionUnits | Compute units consumed |
| SuccessfulHandledHttpRequest | Successful requests |

## Application Insights Queries

### Query 1: Recent Errors

```kusto
requests
| where timestamp > ago(1h)
| where success == false
| summarize count() by resultCode, name
| order by count_ desc
```

### Query 2: Slowest Functions

```kusto
requests
| where timestamp > ago(1h)
| summarize AvgDuration = avg(duration), MaxDuration = max(duration), count() by name
| order by AvgDuration desc
```

### Query 3: Error Rate by Endpoint

```kusto
requests
| where timestamp > ago(24h)
| summarize Requests = count(), Failures = sumif(1, success == false) by name
| extend ErrorRate = (Failures / Requests) * 100
| order by ErrorRate desc
```

## Logs and Diagnostics

### View Logs in Azure Portal

1. Go to **lml-api-flex** Function App
2. Select **Monitoring → Logs**
3. Run built-in queries or custom KQL (Kusto Query Language)

### Enable Diagnostic Settings

1. Go to **lml-api-flex → Diagnostic settings**
2. Click **+ Add diagnostic setting**
3. Configure:
   - **Name:** `lml-api-flex-diagnostics`
   - **Logs:** Check all Azure Functions categories
   - **Metrics:** Check all metrics
   - **Destination:** Send to Log Analytics workspace
4. Save

## Cost Optimization

### Application Insights Pricing

The new `lml-api-flex` App Insights instance:
- **Data ingestion:** First 5 GB free per month
- **Retention:** 30 days retention (free tier)
- **Beyond free tier:** $2.99 per GB per month

### Ways to Optimize

1. **Filter unnecessary logs:** Remove verbose debug logging in production
2. **Set sampling:** Configure adaptive sampling to reduce data volume
3. **Set retention:** Adjust data retention to required period (7-30 days)

To configure sampling:
1. Go to **Application Insights → Configure → Sampling**
2. Set initial sampling percentage (typically 10-20% in high-volume production)

## Health Check Dashboard

### Quick Health Check

Run this query to get a health overview:

```kusto
requests
| where timestamp > ago(24h)
| summarize
    TotalRequests = count(),
    SuccessfulRequests = sumif(1, success == true),
    FailedRequests = sumif(1, success == false),
    AvgResponseTime = avg(duration),
    P95ResponseTime = percentile(duration, 95),
    P99ResponseTime = percentile(duration, 99)
| extend SuccessRate = (SuccessfulRequests / TotalRequests) * 100
```

## Next Steps

1. **Add notification recipients** to `lml-api-alerts` action group
2. **Create metric alerts** in Azure Portal (as described in Steps 1-3 above)
3. **Configure Smart Detection** email recipients
4. **Set up custom dashboards** in Application Insights
5. **Monitor for first 24 hours** after go-live to validate alert thresholds

## Monitoring Architecture

```
┌─────────────────────────────────────┐
│  lml-api-flex Function App    │
├─────────────────────────────────────┤
│          HTTP Requests              │
│   Authorization Requests            │
│   Database Operations               │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Application Insights              │
│  (lml-api-flex)               │
├─────────────────────────────────────┤
│   • Requests & Performance          │
│   • Failures & Exceptions           │
│   • Custom Metrics                  │
│   • Dependency Tracking             │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│    Azure Monitor Alerts             │
│  (Metric & Smart Detection Rules)   │
├─────────────────────────────────────┤
│   • Http5xx > 5 per 5 min           │
│   • Response time > 5 sec           │
│   • Failure rate anomalies          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Action Group                      │
│  (lml-api-alerts)             │
├─────────────────────────────────────┤
│   • Email notifications             │
│   • SMS alerts                      │
│   • Webhook integration             │
│   • Automation runbooks             │
└─────────────────────────────────────┘
```

## Testing Alerts

To test alert functionality:

1. Temporarily set a very low threshold (e.g., Http5xx > 0)
2. Wait for the evaluation frequency (1 minute)
3. Verify you receive the test alert
4. Reset the threshold to production value

---

**Created:** November 11, 2025
**Function App:** lml-api-flex
**Status:** Monitoring configured and ready



