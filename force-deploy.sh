#!/bin/bash

# Force Deploy Script - Eliminates all caching issues
echo "🚀 FORCING FRESH DEPLOYMENT..."

# Generate unique timestamp
TIMESTAMP=$(date +%s)
echo "📅 Deployment timestamp: $TIMESTAMP"

# Create deploy directory
mkdir -p deploy

# Replace timestamp placeholders and copy files
sed "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" index.html > deploy/index.html
sed "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" style.css > deploy/style.css
cp app.js deploy/app.js
cp _headers deploy/_headers
cp _redirects deploy/_redirects

# Add unique deployment marker
echo "/* DEPLOYMENT_ID: $TIMESTAMP */" >> deploy/style.css
echo "// DEPLOYMENT_ID: $TIMESTAMP" >> deploy/app.js

echo "✅ Files prepared with timestamp: $TIMESTAMP"
echo "📁 Deploy directory contents:"
ls -la deploy/

# Git operations
git add -A
git commit -m "🔥 FORCE DEPLOY $TIMESTAMP: Nuclear cache-busting deployment"
git push origin main

echo "🚀 Deployment pushed! Timestamp: $TIMESTAMP"
echo "🔄 Wait 30 seconds then check: https://cornwells-services.netlify.app/" 