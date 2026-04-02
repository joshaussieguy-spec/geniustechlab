#!/usr/bin/env powershell
# GeniusTechLab Deploy Automation
# One command: .\deploy.ps1

param(
    [string]$GitHubRepo = "https://github.com/joshaussieguy-spec/geniustechlab.git",
    [string]$CloudflareProject = "geniustechlab"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 GeniusTechLab Deployment Automation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Step 1: Check dependencies
Write-Host "`n1️⃣ Checking dependencies..." -ForegroundColor Yellow
$git = Get-Command git -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue

if (-not $git) {
    Write-Host "❌ Git not found. Install from https://git-scm.com" -ForegroundColor Red
    exit 1
}

if (-not $npm) {
    Write-Host "❌ Node.js/npm not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Git + npm found" -ForegroundColor Green

# Step 2: Clone or update repo
$repoDir = Join-Path $PSScriptRoot "repo"
Write-Host "`n2️⃣ Setting up GitHub repo..." -ForegroundColor Yellow

if (Test-Path $repoDir) {
    Write-Host "Repository exists, pulling latest..."
    & git -C $repoDir pull origin main
} else {
    Write-Host "Cloning repository..."
    & git clone $GitHubRepo $repoDir
}

Write-Host "✅ Repo ready at: $repoDir" -ForegroundColor Green

# Step 3: Copy scaffold files
Write-Host "`n3️⃣ Copying scaffold files..." -ForegroundColor Yellow

$sourceDir = $PSScriptRoot
$destDir = $repoDir

# Copy posts, styles, build files
Copy-Item "$sourceDir\posts" "$destDir\" -Recurse -Force
Copy-Item "$sourceDir\styles" "$destDir\" -Recurse -Force
Copy-Item "$sourceDir\build.js" "$destDir\" -Force
if (Test-Path "$sourceDir\README.md") {
    Copy-Item "$sourceDir\README.md" "$destDir\" -Force
}

Write-Host "✅ Scaffold copied" -ForegroundColor Green

# Step 4: Install dependencies
Write-Host "`n4️⃣ Installing npm dependencies..." -ForegroundColor Yellow
& npm install -C $destDir marked
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Step 5: Build site
Write-Host "`n5️⃣ Building static site..." -ForegroundColor Yellow
& node "$destDir\build.js"
Write-Host "✅ Site built at: $destDir\public\" -ForegroundColor Green

# Step 6: Git commit + push
Write-Host "`n6️⃣ Committing to GitHub..." -ForegroundColor Yellow

& git -C $destDir add .
& git -C $destDir commit -m "Auto-deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
& git -C $destDir push origin main

Write-Host "✅ Pushed to GitHub" -ForegroundColor Green

# Step 7: Cloudflare Pages info
Write-Host "`n7️⃣ Cloudflare Pages Setup" -ForegroundColor Yellow
Write-Host "📋 Connect your repo manually (one-time setup):" -ForegroundColor Cyan
Write-Host "   1. Go to: https://dash.cloudflare.com/pages"
Write-Host "   2. Click 'Create a project'"
Write-Host "   3. Select: joshaussieguy-spec/geniustechlab"
Write-Host "   4. Build settings:"
Write-Host "      - Framework: None"
Write-Host "      - Build command: node build.js"
Write-Host "      - Output directory: public/"
Write-Host "   5. Deploy"
Write-Host ""
Write-Host "   After that, every git push auto-deploys! 🎉"

Write-Host "`n✅ Automation Complete!" -ForegroundColor Green
Write-Host "📁 Repo: $repoDir"
Write-Host "🌐 Site will be live at: https://$CloudflareProject.pages.dev"
Write-Host ""
Write-Host "Next: Run this script again to deploy future changes!" -ForegroundColor Cyan
