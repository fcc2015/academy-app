# ─── GOOGLE CLOUD RUN DEPLOYMENT SCRIPT (POWERSHELL) ───
# Run this script after installing Google Cloud SDK (gcloud CLI)
# Download gcloud: https://cloud.google.com/sdk/docs/install

$SERVICE_NAME = "academy-backend"
$REGION = "europe-west1" # Frankfurt (close to Morocco/Europe)

Write-Host "🚀 Starting Deployment to Google Cloud Run..." -ForegroundColor Green

# 1. Ensure Cwd is backend
Set-Location -Path "$PSScriptRoot\backend"

# 2. Deploy directly from source using Cloud Build & Cloud Run
gcloud run deploy $SERVICE_NAME `
    --source . `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --memory 2Gi `
    --cpu 2 `
    --min-instances 0 `
    --max-instances 10 `
    --timeout 120 `
    --set-env-vars ENVIRONMENT=production,DEV_MODE=false

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
