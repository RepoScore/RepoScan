#!/usr/bin/env node

/**
 * This script deploys the scan-repo edge function to Supabase
 * using the Management API when the CLI is not available
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_REF = 'codfucoztjpnwjermiok';

async function deployFunction() {
  console.log('🚀 Starting deployment of scan-repo function...\n');

  // Check if supabase CLI is available
  const { execSync } = require('child_process');
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    console.log('✓ Supabase CLI detected. Using CLI for deployment...\n');

    // Check if logged in
    try {
      execSync('supabase projects list', { stdio: 'ignore' });
      console.log('✓ Already authenticated\n');
    } catch {
      console.log('⚠ Not logged in. Running supabase login...\n');
      execSync('supabase login', { stdio: 'inherit' });
    }

    // Deploy using CLI
    console.log('📦 Deploying function...\n');
    execSync('supabase functions deploy scan-repo --project-ref ' + PROJECT_REF, {
      stdio: 'inherit',
      cwd: __dirname
    });

    console.log('\n✅ Deployment complete!');
    console.log('\nYour scanner is now updated and ready to use.');
    process.exit(0);

  } catch (error) {
    console.log('⚠ Supabase CLI not found or not configured.\n');
    console.log('Please install the Supabase CLI and try again:');
    console.log('  https://supabase.com/docs/guides/cli\n');
    console.log('Or deploy manually via the Supabase Dashboard:');
    console.log(`  https://supabase.com/dashboard/project/${PROJECT_REF}/functions\n`);
    process.exit(1);
  }
}

deployFunction().catch(console.error);
