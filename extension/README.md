# RepoScan Chrome Extension

A Chrome extension that provides instant security and code quality analysis for GitHub repositories directly in your browser.

## Overview

The RepoScan Chrome Extension seamlessly integrates with GitHub, allowing you to analyze any repository with a single click. Get instant access to safety scores, legitimacy ratings, vulnerability reports, and code quality metrics without leaving GitHub.

## Features

### 🎯 GitHub Integration
- **Inline Badge**: RepoScan badge appears on every GitHub repository page
- **Quick Panel**: Click the badge to view scan results in a beautiful overlay
- **Real-time Status**: See at a glance if a repository has been scanned
- **Seamless Navigation**: Works across all GitHub repository pages

### 📊 Instant Analysis
- **Safety Score**: Comprehensive security rating (0-100)
- **Legitimacy Score**: Project authenticity and trustworthiness rating (0-100)
- **Vulnerability Breakdown**: Critical, high, medium, and low severity issues
- **Repository Metrics**: Stars, forks, last update, and open issues

### 🔒 Wallet Integration (Coming Soon)
- Connect your Web3 wallet for advanced features
- Access token-gated premium scans
- Track your scan history
- Manage token locks and rewards

### ⚡ Performance
- **Smart Caching**: Results cached for 5 minutes to reduce API calls
- **Background Processing**: Scans run in the background without blocking your workflow
- **Instant Results**: Pre-scanned repositories load instantly

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the [RepoScan Chrome Web Store page](#)
2. Click "Add to Chrome"
3. Confirm installation

### Manual Installation (Development)
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd extension
   ```

2. Configure API settings:
   - Open `background/service-worker.js`
   - Update `API_BASE_URL` with your Supabase project URL
   - Update `SUPABASE_ANON_KEY` with your Supabase anon key

3. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension` directory

4. The RepoScan icon should appear in your extensions toolbar

## Usage

### Scanning a Repository

#### Method 1: GitHub Page Badge
1. Navigate to any GitHub repository
2. Look for the RepoScan badge near the repository name
3. Click the badge to view scan results
4. If not scanned, click "Scan Repository"

#### Method 2: Extension Popup
1. Navigate to a GitHub repository
2. Click the RepoScan icon in your toolbar
3. View results or initiate a scan

### Understanding Scores

**Safety Score (0-100)**
- **90-100**: Excellent - Very secure, minimal concerns
- **70-89**: Good - Generally secure with minor issues
- **50-69**: Fair - Some security concerns to address
- **0-49**: Poor - Significant security issues present

**Legitimacy Score (0-100)**
- **90-100**: Highly Trusted - Well-maintained, active project
- **70-89**: Trusted - Legitimate project with good practices
- **50-69**: Questionable - Limited activity or unclear purpose
- **0-49**: Suspicious - Potential red flags detected

## Architecture

### Components

#### 1. Popup Interface (`popup/`)
- `popup.html` - Extension popup UI
- `popup.css` - Styling for popup
- `popup.js` - Popup logic and interactions

**Features:**
- Repository detection
- Scan status display
- Score visualization
- Wallet connection interface

#### 2. Content Script (`content/`)
- `content-script.js` - Injected into GitHub pages
- Adds RepoScan badge to repository pages
- Creates overlay panel for scan results
- Handles user interactions on GitHub

#### 3. Background Service Worker (`background/`)
- `service-worker.js` - Background process
- Handles API communication
- Manages caching and storage
- Processes messages from popup and content scripts

#### 4. API Integration (`background/api.js`)
- `RepoScanAPI` class for all API interactions
- Supabase integration
- Error handling and retries
- Type-safe API methods

### Message Flow

```
Content Script <-> Background Worker <-> Supabase API
                         ^
                         |
                   Popup Interface
```

### Storage Structure

```javascript
{
  // Configuration
  apiBaseUrl: "https://project.supabase.co",
  supabaseKey: "anon-key",

  // User data
  walletAddress: "0x...",

  // Cache
  scanCache: {
    "https://github.com/user/repo": {
      data: { /* scan results */ },
      timestamp: 1234567890
    }
  }
}
```

## API Integration

### Supabase Configuration

The extension connects to your RepoScan Supabase backend:

1. **REST API** for data queries
2. **Edge Functions** for scan initiation
3. **Row Level Security** for data protection

### Required Environment Variables

Update in `background/service-worker.js`:

```javascript
const API_BASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
```

### API Endpoints Used

- `GET /rest/v1/repo_scans` - Fetch scan results
- `POST /functions/v1/scan-repo` - Initiate new scan
- `GET /rest/v1/vulnerabilities` - Get vulnerability details
- `GET /rest/v1/code_quality_issues` - Get code quality issues
- `GET /rest/v1/deep_scans` - Get deep scan results
- `GET /rest/v1/token_lock_tiers` - Get token lock tiers

## Development

### Project Structure

```
extension/
├── manifest.json              # Extension configuration
├── popup/
│   ├── popup.html            # Popup UI
│   ├── popup.css             # Popup styles
│   └── popup.js              # Popup logic
├── content/
│   └── content-script.js     # GitHub page injection
├── background/
│   ├── service-worker.js     # Background process
│   └── api.js                # API client
├── styles/
│   └── content.css           # Injected styles
├── assets/
│   └── icons/                # Extension icons
└── README.md
```

### Build Process

No build step required - the extension uses vanilla JavaScript.

To test changes:
1. Make your changes
2. Go to `chrome://extensions/`
3. Click the refresh icon on the RepoScan extension

### Debugging

**Popup:**
- Right-click the extension icon → "Inspect popup"
- Console logs appear in popup DevTools

**Content Script:**
- Open DevTools on any GitHub page
- Console logs appear in page DevTools
- Look for messages prefixed with "RepoScan:"

**Background Worker:**
- Go to `chrome://extensions/`
- Click "Inspect views: service worker"
- Console logs appear in worker DevTools

## Security & Privacy

### Data Handling
- No personal data collected without consent
- Wallet addresses stored locally only
- API keys never exposed to content scripts
- All API calls use HTTPS

### Permissions

Required permissions explained:

- **storage**: Cache scan results locally
- **activeTab**: Read current tab URL to detect GitHub repos
- **tabs**: Open new tabs for full reports
- **host_permissions (github.com)**: Inject badge and panel into GitHub
- **host_permissions (supabase.co)**: API communication

## Troubleshooting

### Extension Not Working

1. **Check GitHub URL**: Extension only works on `github.com/*/*` pages
2. **Refresh Extension**: Go to `chrome://extensions/` and refresh
3. **Check Console**: Look for errors in DevTools
4. **Verify API**: Ensure API_BASE_URL is correct

### Badge Not Appearing

1. **Reload Page**: Refresh the GitHub page
2. **Check DOM**: GitHub might have changed their layout
3. **Disable Other Extensions**: Conflicts with other GitHub extensions

### Scan Failing

1. **Check API Status**: Ensure Supabase is running
2. **Verify API Keys**: Check service-worker.js configuration
3. **Network Tab**: Look for failed API calls
4. **Rate Limiting**: GitHub API might be rate-limited

## Roadmap

### v1.1 - Wallet Integration
- [ ] MetaMask connection
- [ ] Token-gated scans
- [ ] User dashboard
- [ ] Scan history

### v1.2 - Advanced Features
- [ ] Deep scan initiation from extension
- [ ] Custom alerts and notifications
- [ ] Repository comparison
- [ ] Export scan reports

### v1.3 - Team Features
- [ ] Team workspaces
- [ ] Shared scan results
- [ ] Collaboration tools
- [ ] API quota management

### v2.0 - Beyond GitHub
- [ ] GitLab support
- [ ] Bitbucket support
- [ ] Self-hosted Git support

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

- **Documentation**: See main project README
- **Issues**: [GitHub Issues](#)
- **Email**: support@reposcan.io
- **Discord**: [Join our community](#)

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- Chrome Extension Manifest V3
- Supabase for backend
- GitHub API for repository data
- Vanilla JavaScript (no frameworks!)

---

**RepoScan** - Making open source safer, one repository at a time.
