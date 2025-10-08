# Setting Up Google Analytics MCP Server

This guide walks you through setting up the official Python-based Google Analytics MCP server to work with your Next.js chatbot.

## Prerequisites

- Python 3.10 or higher
- pipx (Python package runner)
- Google Cloud project with Analytics Admin API and Analytics Data API enabled

## Step 1: Install pipx

### Windows
```powershell
python -m pip install --user pipx
python -m pipx ensurepath
```

### macOS/Linux
```bash
python3 -m pip install --user pipx
python3 -m pipx ensurepath
```

Restart your terminal after installation.

## Step 2: Install Google Analytics MCP Server

```bash
pipx install analytics-mcp
```

## Step 3: Set Up Google Cloud Credentials

### Option A: Using OAuth (Recommended for Development)

1. Create OAuth credentials in Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID (Desktop application type)
   - Download the JSON file

2. Run the following command and follow the authentication flow:

```bash
gcloud auth application-default login \
  --scopes https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform \
  --client-id-file=YOUR_CLIENT_JSON_FILE
```

3. Note the credentials file path shown in the output (e.g., `~/.config/gcloud/application_default_credentials.json`)

### Option B: Using Service Account

1. Create a service account in Google Cloud Console
2. Download the service account key JSON
3. Set environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

## Step 4: Enable Required APIs

In your Google Cloud Console, enable:
- Google Analytics Admin API
- Google Analytics Data API

## Step 5: Test the Installation

Run this command to verify the server works:

```bash
pipx run analytics-mcp
```

You should see the MCP server start up without errors.

## Step 6: Update Your .env.local

Add the path to your credentials file:

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/credentials.json
GOOGLE_PROJECT_ID=your-google-cloud-project-id
```

## Troubleshooting

### Error: "pipx: command not found"
- Make sure you restarted your terminal after installing pipx
- Try running `python -m pipx` or `python3 -m pipx` directly

### Error: "Permission denied"
- Make sure your Google account has access to the GA4 properties
- Verify the OAuth scopes include `analytics.readonly`

### Error: "API not enabled"
- Enable both Analytics Admin API and Analytics Data API in Google Cloud Console

## How It Works

1. The chatbot sends your OAuth tokens to the backend
2. The backend starts the Python MCP server with your credentials
3. The server connects to Google Analytics APIs
4. Tools are dynamically retrieved from the MCP server
5. When you ask analytics questions, the chatbot calls the appropriate tools

## Available Tools (Retrieved Dynamically)

The official Google Analytics MCP server provides these tools:

- `get_account_summaries` - List GA4 accounts and properties
- `get_property_details` - Get details about a property
- `list_google_ads_links` - List Google Ads links
- `run_report` - Run GA4 reports
- `get_custom_dimensions_and_metrics` - Get custom dimensions/metrics
- `run_realtime_report` - Run realtime reports

These are **automatically discovered** by the chatbot - no hardcoding needed!

