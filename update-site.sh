#!/bin/bash

echo "🚀 UPDATING SITE WITH GUARANTEED CACHE BUST..."

# Generate unique timestamp
TIMESTAMP=$(date +%s)
echo "📅 Update timestamp: $TIMESTAMP"

# Add cache-busting comments to force file changes
echo "/* CACHE_BUST: $TIMESTAMP */" >> style.css
echo "// CACHE_BUST: $TIMESTAMP" >> app.js

# Update any timestamp placeholders if they exist
if grep -q "TIMESTAMP_PLACEHOLDER" index.html; then
    sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" index.html && rm index.html.bak
fi

if grep -q "TIMESTAMP_PLACEHOLDER" style.css; then
    sed -i.bak "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" style.css && rm style.css.bak
fi

# Git operations
git add -A
git commit -m "🔄 SITE UPDATE $TIMESTAMP: Guaranteed cache-busting deployment"
git push origin main

echo "✅ Site updated! Timestamp: $TIMESTAMP"
echo "🔄 Changes will be live in 30-60 seconds"
echo "🌐 Check: https://cornwells-services.netlify.app/" 