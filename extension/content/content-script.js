const REPOSCAN_BADGE_ID = 'reposcan-badge';
const REPOSCAN_PANEL_ID = 'reposcan-panel';

let currentRepoUrl = null;
let scanData = null;

function initialize() {
  if (isRepositoryPage()) {
    currentRepoUrl = extractCurrentRepoUrl();
    injectRepoScanBadge();
    checkAndDisplayScanData();
  }

  observePageChanges();
}

function isRepositoryPage() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  return pathParts.length >= 2 && !window.location.pathname.includes('/settings');
}

function extractCurrentRepoUrl() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2) {
    return `https://github.com/${pathParts[0]}/${pathParts[1]}`;
  }
  return null;
}

function injectRepoScanBadge() {
  if (document.getElementById(REPOSCAN_BADGE_ID)) {
    return;
  }

  const repoHeader = document.querySelector('[data-pjax-container]') ||
                     document.querySelector('.js-repo-nav') ||
                     document.querySelector('.pagehead');

  if (!repoHeader) {
    return;
  }

  const badge = createBadgeElement();

  const actionList = repoHeader.querySelector('.d-flex') || repoHeader;
  actionList.appendChild(badge);

  badge.addEventListener('click', toggleScanPanel);
}

function createBadgeElement() {
  const badge = document.createElement('div');
  badge.id = REPOSCAN_BADGE_ID;
  badge.className = 'reposcan-badge';
  badge.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>RepoScan</span>
    <span class="reposcan-badge-status" id="reposcan-status">
      <div class="reposcan-spinner"></div>
    </span>
  `;

  return badge;
}

function toggleScanPanel(e) {
  e.preventDefault();
  e.stopPropagation();

  let panel = document.getElementById(REPOSCAN_PANEL_ID);

  if (panel) {
    panel.remove();
  } else {
    createScanPanel();
  }
}

function createScanPanel() {
  const panel = document.createElement('div');
  panel.id = REPOSCAN_PANEL_ID;
  panel.className = 'reposcan-panel';

  if (scanData) {
    panel.innerHTML = createPanelWithResults(scanData);
  } else {
    panel.innerHTML = createPanelLoading();
  }

  document.body.appendChild(panel);

  document.addEventListener('click', handleOutsideClick);

  const scanButton = panel.querySelector('#reposcan-scan-btn');
  if (scanButton) {
    scanButton.addEventListener('click', initiateScan);
  }

  const viewReportButton = panel.querySelector('#reposcan-view-report');
  if (viewReportButton) {
    viewReportButton.addEventListener('click', () => {
      window.open(`https://reposcan.io?repo=${encodeURIComponent(currentRepoUrl)}`, '_blank');
    });
  }
}

function createPanelLoading() {
  return `
    <div class="reposcan-panel-header">
      <h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        RepoScan
      </h3>
      <button class="reposcan-close" onclick="document.getElementById('${REPOSCAN_PANEL_ID}').remove()">×</button>
    </div>
    <div class="reposcan-panel-body">
      <div class="reposcan-loading">
        <div class="reposcan-spinner"></div>
        <p>Checking for scan results...</p>
      </div>
    </div>
  `;
}

function createPanelWithResults(data) {
  const safetyScore = data.safety_score || 0;
  const legitimacyScore = data.legitimacy_score || 0;

  const safetyColor = safetyScore >= 70 ? '#10b981' : safetyScore >= 40 ? '#f59e0b' : '#ef4444';
  const legitimacyColor = legitimacyScore >= 70 ? '#10b981' : legitimacyScore >= 40 ? '#f59e0b' : '#ef4444';

  return `
    <div class="reposcan-panel-header">
      <h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        RepoScan Results
      </h3>
      <button class="reposcan-close" onclick="document.getElementById('${REPOSCAN_PANEL_ID}').remove()">×</button>
    </div>
    <div class="reposcan-panel-body">
      <div class="reposcan-scores">
        <div class="reposcan-score-card">
          <div class="reposcan-score-label">Safety Score</div>
          <div class="reposcan-score-value" style="color: ${safetyColor}">${safetyScore}</div>
          <div class="reposcan-score-bar">
            <div class="reposcan-score-fill" style="width: ${safetyScore}%; background: ${safetyColor}"></div>
          </div>
        </div>
        <div class="reposcan-score-card">
          <div class="reposcan-score-label">Legitimacy Score</div>
          <div class="reposcan-score-value" style="color: ${legitimacyColor}">${legitimacyScore}</div>
          <div class="reposcan-score-bar">
            <div class="reposcan-score-fill" style="width: ${legitimacyScore}%; background: ${legitimacyColor}"></div>
          </div>
        </div>
      </div>

      <div class="reposcan-details">
        <div class="reposcan-detail-row">
          <span>Last Updated:</span>
          <strong>${data.last_commit_date ? new Date(data.last_commit_date).toLocaleDateString() : 'N/A'}</strong>
        </div>
        <div class="reposcan-detail-row">
          <span>Stars:</span>
          <strong>${(data.stars || 0).toLocaleString()}</strong>
        </div>
        <div class="reposcan-detail-row">
          <span>Forks:</span>
          <strong>${(data.forks || 0).toLocaleString()}</strong>
        </div>
        <div class="reposcan-detail-row">
          <span>Open Issues:</span>
          <strong>${(data.open_issues || 0).toLocaleString()}</strong>
        </div>
      </div>

      ${data.vulnerabilities ? `
        <div class="reposcan-vulnerabilities">
          <h4>Vulnerabilities</h4>
          <div class="reposcan-vuln-grid">
            <span class="reposcan-vuln-badge critical">${data.vulnerabilities.critical || 0} Critical</span>
            <span class="reposcan-vuln-badge high">${data.vulnerabilities.high || 0} High</span>
            <span class="reposcan-vuln-badge medium">${data.vulnerabilities.medium || 0} Medium</span>
            <span class="reposcan-vuln-badge low">${data.vulnerabilities.low || 0} Low</span>
          </div>
        </div>
      ` : ''}

      <button id="reposcan-view-report" class="reposcan-btn-primary">
        View Full Report
      </button>
    </div>
  `;
}

function createPanelNoScan() {
  return `
    <div class="reposcan-panel-header">
      <h3>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        RepoScan
      </h3>
      <button class="reposcan-close" onclick="document.getElementById('${REPOSCAN_PANEL_ID}').remove()">×</button>
    </div>
    <div class="reposcan-panel-body">
      <div class="reposcan-no-scan">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h4>Repository Not Scanned</h4>
        <p>This repository hasn't been analyzed yet. Start a scan to get comprehensive security and quality insights.</p>
        <button id="reposcan-scan-btn" class="reposcan-btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Scan Repository
        </button>
      </div>
    </div>
  `;
}

function handleOutsideClick(e) {
  const panel = document.getElementById(REPOSCAN_PANEL_ID);
  const badge = document.getElementById(REPOSCAN_BADGE_ID);

  if (panel && !panel.contains(e.target) && !badge.contains(e.target)) {
    panel.remove();
    document.removeEventListener('click', handleOutsideClick);
  }
}

async function checkAndDisplayScanData() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_SCAN',
      repoUrl: currentRepoUrl
    });

    if (response && response.data) {
      scanData = response.data;
      updateBadgeStatus('success');
    } else {
      updateBadgeStatus('no-scan');
    }
  } catch (error) {
    console.error('RepoScan: Error checking scan data:', error);
    updateBadgeStatus('error');
  }
}

function updateBadgeStatus(status) {
  const statusElement = document.getElementById('reposcan-status');
  if (!statusElement) return;

  statusElement.className = 'reposcan-badge-status';

  switch (status) {
    case 'success':
      statusElement.innerHTML = '✓';
      statusElement.classList.add('success');
      break;
    case 'no-scan':
      statusElement.innerHTML = '?';
      statusElement.classList.add('warning');
      break;
    case 'error':
      statusElement.innerHTML = '!';
      statusElement.classList.add('error');
      break;
    default:
      statusElement.innerHTML = '<div class="reposcan-spinner"></div>';
  }
}

async function initiateScan() {
  const panel = document.getElementById(REPOSCAN_PANEL_ID);
  if (panel) {
    panel.querySelector('.reposcan-panel-body').innerHTML = `
      <div class="reposcan-loading">
        <div class="reposcan-spinner"></div>
        <p>Initiating scan...</p>
      </div>
    `;
  }

  try {
    await chrome.runtime.sendMessage({
      type: 'INITIATE_SCAN',
      repoUrl: currentRepoUrl
    });

    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('RepoScan: Error initiating scan:', error);
  }
}

function observePageChanges() {
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      onUrlChange();
    }
  }).observe(document, { subtree: true, childList: true });
}

function onUrlChange() {
  const existingBadge = document.getElementById(REPOSCAN_BADGE_ID);
  if (existingBadge) {
    existingBadge.remove();
  }

  const existingPanel = document.getElementById(REPOSCAN_PANEL_ID);
  if (existingPanel) {
    existingPanel.remove();
  }

  scanData = null;

  setTimeout(() => {
    initialize();
  }, 500);
}

initialize();
