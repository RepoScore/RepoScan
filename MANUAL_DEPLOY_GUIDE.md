# Manual Deployment Guide

Since the automated deployment tools are having issues, here's how to deploy the fixed scanner manually.

## Problem
The scanner has false positives in the currently deployed version. The fixes are in your local codebase but need to be deployed to Supabase.

## Solution: Manual File Upload via Supabase Dashboard

### Step 1: Access Your Supabase Project
1. Go to https://supabase.com/dashboard
2. Find and open your project (the one with URL: `https://codfucoztjpnwjermiok.supabase.co`)

### Step 2: Navigate to Edge Functions
1. Click **"Edge Functions"** in the left sidebar
2. You should see the `scan-repo` function listed

### Step 3: Update the Function

**Important:** Supabase Dashboard doesn't allow direct editing of deployed functions. You have two options:

#### Option A: Use Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   brew install supabase/tap/supabase  # macOS
   # OR
   npm install -g supabase             # npm (any OS)
   # OR download from: https://github.com/supabase/cli/releases
   ```

2. Login:
   ```bash
   supabase login
   ```

3. Navigate to your project directory:
   ```bash
   cd /path/to/your/reposcan/project
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy scan-repo
   ```

   When prompted for project ref, enter: `codfucoztjpnwjermiok`

#### Option B: Contact Supabase Support

If the CLI doesn't work, you can:
1. Go to https://supabase.com/dashboard/support
2. Request help deploying your edge function
3. Mention that you need to update the `scan-repo` function with fixes

### Step 4: Verify the Deployment

After deployment, test by:
1. Going back to your app
2. Running a scan on a GitHub repository
3. Checking that the false positives (like "typescript looks similar to typescript") are gone

## What Was Fixed

The following issues were resolved in your local code:

1. **Typosquatting False Positive**
   - File: `supabase/functions/_shared/supplyChainScanner.ts`
   - Fix: Now checks if dependency name matches legitimate package before flagging

2. **Removed Non-Security Warnings**
   - File: `supabase/functions/_shared/githubSecurityScanner.ts`
   - Fix: Removed checks for SECURITY.md, CODEOWNERS, GitHub Discussions, etc.

3. **Fixed Boolean Logic**
   - File: `supabase/functions/_shared/githubSecurityScanner.ts`
   - Fix: Changed `!status === 'enabled'` to `status !== 'enabled'`

## Alternative: Use VS Code Extension

Supabase also has a VS Code extension that can deploy functions:
1. Install "Supabase" extension in VS Code
2. Connect to your project
3. Right-click on the function and select "Deploy"

## Need Help?

If you're still having trouble, you can:
- Share your screen and I'll guide you through it
- Use the Supabase Discord: https://discord.supabase.com
- Email Supabase support: support@supabase.io
