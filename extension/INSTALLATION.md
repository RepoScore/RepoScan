# RepoScan Chrome Extension - Installation Guide

## Quick Start

### Prerequisites
- Google Chrome browser (version 88 or higher)
- Active internet connection
- RepoScan backend API access (Supabase)

## Installation Methods

### Method 1: Chrome Web Store (Recommended - Coming Soon)

Once published:

1. Visit the Chrome Web Store
2. Search for "RepoScan"
3. Click "Add to Chrome"
4. Click "Add extension" in the confirmation dialog
5. The RepoScan icon will appear in your toolbar

### Method 2: Manual Installation (Development)

For developers or early access:

#### Step 1: Get the Extension Files

**Option A: From GitHub**
```bash
git clone <repository-url>
cd reposcan/extension
```

**Option B: Download ZIP**
1. Download the extension folder
2. Extract to a location on your computer

#### Step 2: Configure API Settings

1. Open `extension/background/service-worker.js`

2. Update the configuration:
```javascript
const API_BASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
```

3. Save the file

**Getting Your Supabase Credentials:**
- Log in to your Supabase dashboard
- Go to Settings → API
- Copy your project URL and anon/public key

#### Step 3: Load Extension in Chrome

1. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

2. Enable "Developer mode" (toggle in the top-right corner)

3. Click "Load unpacked"

4. Select the `extension` directory

5. The extension should now appear in your list with a unique ID

6. Pin the extension to your toolbar (optional but recommended):
   - Click the puzzle piece icon in Chrome toolbar
   - Find "RepoScan - GitHub Security Scanner"
   - Click the pin icon

#### Step 4: Verify Installation

1. Navigate to any GitHub repository (e.g., https://github.com/facebook/react)

2. You should see:
   - A RepoScan badge near the repository name
   - The RepoScan icon in your toolbar (if pinned)

3. Click either the badge or toolbar icon to test

## Configuration

### Initial Setup

After installation, configure the extension:

1. Click the RepoScan icon in your toolbar

2. If on a non-GitHub page:
   - You'll see "Not a GitHub Repository"
   - Navigate to a GitHub repo to continue

3. Click the settings link (footer of popup)

4. Configure optional settings:
   - Auto-scan on page load
   - Cache duration
   - Notification preferences

### Wallet Connection (Optional)

For premium features:

1. Click the RepoScan icon
2. Click "Connect Wallet"
3. Follow MetaMask prompts to connect
4. Your wallet address will be stored locally

## Updating the Extension

### Chrome Web Store Version
- Updates automatically
- Check version in `chrome://extensions/`

### Manual Version

1. Pull latest changes:
   ```bash
   git pull origin main
   ```

2. Go to `chrome://extensions/`

3. Click the refresh icon on the RepoScan card

4. Verify the version number has updated

## Troubleshooting Installation

### Extension Not Loading

**Problem**: "Load unpacked" doesn't work

**Solutions**:
1. Ensure you selected the correct directory (should contain `manifest.json`)
2. Check for syntax errors in `manifest.json`
3. Verify all files are present
4. Try disabling other extensions temporarily

### API Configuration Issues

**Problem**: "Failed to fetch scan data"

**Solutions**:
1. Verify `API_BASE_URL` is correct (no trailing slash)
2. Check `SUPABASE_ANON_KEY` is valid
3. Test API endpoint directly in browser
4. Check browser console for specific error messages

### Badge Not Appearing

**Problem**: RepoScan badge doesn't show on GitHub

**Solutions**:
1. Refresh the GitHub page
2. Check if content script loaded (DevTools → Sources)
3. Verify GitHub page matches pattern in manifest
4. Check for conflicts with other GitHub extensions
5. Clear browser cache and reload

### Popup Not Opening

**Problem**: Clicking icon does nothing

**Solutions**:
1. Check for JavaScript errors (right-click icon → Inspect)
2. Verify popup files exist and are valid
3. Try reloading the extension
4. Check if popup.html has syntax errors

### Permission Denied Errors

**Problem**: Extension requests denied

**Solutions**:
1. Grant required permissions in `chrome://extensions/`
2. Remove and reinstall the extension
3. Check enterprise policies (corporate environments)
4. Try incognito mode to isolate issue

## Uninstallation

### Remove Extension

1. Go to `chrome://extensions/`
2. Find "RepoScan - GitHub Security Scanner"
3. Click "Remove"
4. Confirm removal

### Clean Up Data

Extension data is automatically removed, but to manually clear:

1. Open DevTools (F12)
2. Go to Application tab
3. Storage → Clear storage
4. Select "Extension" storage
5. Click "Clear site data"

## Security Notes

### API Keys
- Never commit real API keys to version control
- Use environment-specific configuration
- Rotate keys if exposed

### Permissions
- Extension only requests necessary permissions
- Review permissions before installation
- Permissions explained in main README

### Data Storage
- Scan results cached locally for 5 minutes
- Wallet address stored in Chrome local storage
- No data sent to third parties
- Clear cache by removing extension

## System Requirements

### Minimum
- Chrome 88+
- 10 MB free disk space
- Active internet connection

### Recommended
- Chrome 100+
- 50 MB free disk space
- Stable internet (5+ Mbps)

## Platform Support

### Supported
- ✅ Chrome 88+ on Windows
- ✅ Chrome 88+ on macOS
- ✅ Chrome 88+ on Linux
- ✅ Chrome 88+ on ChromeOS

### Not Supported
- ❌ Firefox (different extension format)
- ❌ Safari (different extension format)
- ❌ Edge Legacy (EOL)
- ❌ Internet Explorer (EOL)

## Next Steps

After successful installation:

1. Visit [Getting Started Guide](README.md#usage)
2. Try scanning your first repository
3. Explore advanced features
4. Connect your wallet for premium features

## Support

Need help with installation?

- 📧 Email: support@reposcan.io
- 💬 Discord: [Join our community](#)
- 📚 Documentation: [Full docs](README.md)
- 🐛 Bug Reports: [GitHub Issues](#)

## Feedback

Help us improve! Share your installation experience:
- Easy installation? ⭐⭐⭐⭐⭐
- Encountered issues? Tell us how to make it better
- Suggestions? We're listening!
