#!/bin/bash

# Deploy the updated edge function to Supabase
# This script requires the Supabase CLI to be installed and configured

echo "Deploying scan-repo edge function with all fixes..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed"
    echo "Install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Deploy the function
supabase functions deploy scan-repo

if [ $? -eq 0 ]; then
    echo "✓ Edge function deployed successfully!"
    echo "The scanner should now work correctly without false positives."
else
    echo "✗ Deployment failed. Please check your Supabase CLI configuration."
    echo "Run 'supabase login' if you haven't authenticated yet."
fi
