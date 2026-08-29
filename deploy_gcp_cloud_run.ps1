# ─── GOOGLE CLOUD RUN DEPLOYMENT SCRIPT (POWERSHELL) ───
$GCLOUD_PATH = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $GCLOUD_PATH)) {
    $GCLOUD_PATH = "gcloud"
}

$PROJECT_ID = "fcc-academy"
$SERVICE_NAME = "academy-backend"
$REGION = "europe-west1" # Frankfurt (fast & close to Morocco)

Write-Host "🚀 Setting Google Cloud Project: $PROJECT_ID..." -ForegroundColor Cyan
& $GCLOUD_PATH config set project $PROJECT_ID

Write-Host "🚀 Starting Deployment to Google Cloud Run..." -ForegroundColor Green

# Deploy directly from backend directory using Cloud Build
& $GCLOUD_PATH run deploy $SERVICE_NAME `
    --source "$PSScriptRoot\backend" `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --memory 2Gi `
    --cpu 2 `
    --min-instances 0 `
    --max-instances 10 `
    --timeout 120 `
    --set-env-vars "ENVIRONMENT=production,DEV_MODE=false,SUPABASE_URL=https://kbhnqntteexatihidhkn.supabase.co"

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
