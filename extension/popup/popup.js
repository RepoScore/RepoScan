let currentRepoUrl = null;
let walletAddress = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
});

async function initializePopup() {
  showLoading();

  const walletData = await chrome.storage.local.get(['walletAddress']);
  if (walletData.walletAddress) {
    walletAddress = walletData.walletAddress;
    updateWalletUI(walletAddress);
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  if (!currentTab || !currentTab.url) {
    showNotGithub();
    return;
  }

  const repoInfo = extractRepoFromUrl(currentTab.url);

  if (!repoInfo) {
    showNotGithub();
    return;
  }

  currentRepoUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}`;
  showRepoInfo(repoInfo);

  const scanData = await checkExistingScan(currentRepoUrl);

  if (scanData) {
    displayScanResults(scanData);
  } else {
    showNoScan();
  }
}

function setupEventListeners() {
  document.getElementById('scan-now-btn')?.addEventListener('click', initiateRepositoryScan);
  document.getElementById('view-full-report')?.addEventListener('click', openFullReport);
  document.getElementById('connect-wallet-btn')?.addEventListener('click', connectWallet);
  document.getElementById('disconnect-wallet-btn')?.addEventListener('click', disconnectWallet);
  document.getElementById('settings-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

function extractRepoFromUrl(url) {
  const githubPattern = /github\.com\/([^\/]+)\/([^\/\?#]+)/;
  const match = url.match(githubPattern);

  if (match) {
    return {
      owner: match[1],
      repo: match[2]
    };
  }

  return null;
}

async function checkExistingScan(repoUrl) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_SCAN',
      repoUrl: repoUrl
    });

    return response.data;
  } catch (error) {
    console.error('Error checking scan:', error);
    return null;
  }
}

async function initiateRepositoryScan() {
  if (!currentRepoUrl) return;

  showScanning();

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'INITIATE_SCAN',
      repoUrl: currentRepoUrl,
      walletAddress: walletAddress
    });

    if (response.success) {
      pollScanStatus(response.scanId);
    } else {
      showError('Failed to initiate scan');
    }
  } catch (error) {
    console.error('Error initiating scan:', error);
    showError('Failed to initiate scan');
  }
}

async function pollScanStatus(scanId) {
  const maxAttempts = 60;
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_SCAN_STATUS',
        scanId: scanId
      });

      if (response.status === 'completed') {
        clearInterval(interval);
        displayScanResults(response.data);
      } else if (response.status === 'failed' || attempts >= maxAttempts) {
        clearInterval(interval);
        showError('Scan failed or timed out');
      } else {
        updateScanProgress(attempts / maxAttempts * 100);
      }
    } catch (error) {
      console.error('Error polling scan status:', error);
      clearInterval(interval);
      showError('Error checking scan status');
    }
  }, 2000);
}

function displayScanResults(scanData) {
  hideAll();
  document.getElementById('repo-detected').classList.remove('hidden');
  document.getElementById('scan-results').classList.remove('hidden');

  const safetyScore = scanData.safety_score || 0;
  const legitimacyScore = scanData.legitimacy_score || 0;

  document.getElementById('safety-score').textContent = safetyScore;
  document.getElementById('legitimacy-score').textContent = legitimacyScore;

  document.getElementById('safety-fill').style.width = `${safetyScore}%`;
  document.getElementById('legitimacy-fill').style.width = `${legitimacyScore}%`;

  document.getElementById('last-updated').textContent = scanData.last_commit_date
    ? new Date(scanData.last_commit_date).toLocaleDateString()
    : 'N/A';

  document.getElementById('stars').textContent = scanData.stars?.toLocaleString() || '0';

  const vulnCount = (scanData.vulnerabilities?.critical || 0) +
                    (scanData.vulnerabilities?.high || 0) +
                    (scanData.vulnerabilities?.medium || 0);

  document.getElementById('vulnerabilities').textContent = vulnCount;
}

function openFullReport() {
  if (currentRepoUrl) {
    const encodedUrl = encodeURIComponent(currentRepoUrl);
    chrome.tabs.create({
      url: `https://reposcan.io?repo=${encodedUrl}`
    });
  }
}

async function connectWallet() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CONNECT_WALLET'
    });

    if (response.success && response.address) {
      walletAddress = response.address;
      await chrome.storage.local.set({ walletAddress: response.address });
      updateWalletUI(response.address);
    }
  } catch (error) {
    console.error('Error connecting wallet:', error);
  }
}

async function disconnectWallet() {
  walletAddress = null;
  await chrome.storage.local.remove(['walletAddress']);
  updateWalletUI(null);
}

function updateWalletUI(address) {
  if (address) {
    document.getElementById('wallet-disconnected').classList.add('hidden');
    document.getElementById('wallet-connected').classList.remove('hidden');
    document.getElementById('wallet-address').textContent =
      `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  } else {
    document.getElementById('wallet-connected').classList.add('hidden');
    document.getElementById('wallet-disconnected').classList.remove('hidden');
  }
}

function showRepoInfo(repoInfo) {
  hideAll();
  document.getElementById('repo-detected').classList.remove('hidden');
  document.getElementById('repo-name').textContent = `${repoInfo.owner}/${repoInfo.repo}`;
}

function showNoScan() {
  document.getElementById('scan-results').classList.add('hidden');
  document.getElementById('scanning').classList.add('hidden');
  document.getElementById('no-scan').classList.remove('hidden');
}

function showScanning() {
  document.getElementById('scan-results').classList.add('hidden');
  document.getElementById('no-scan').classList.add('hidden');
  document.getElementById('scanning').classList.remove('hidden');
}

function showLoading() {
  hideAll();
  document.getElementById('loading-state').classList.remove('hidden');
}

function showNotGithub() {
  hideAll();
  document.getElementById('not-github').classList.remove('hidden');
}

function showError(message) {
  hideAll();
  document.getElementById('not-github').classList.remove('hidden');
  document.querySelector('#not-github h3').textContent = 'Error';
  document.querySelector('#not-github p').textContent = message;
}

function updateScanProgress(percentage) {
  const progressBar = document.getElementById('scan-progress');
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }
}

function hideAll() {
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('not-github').classList.add('hidden');
  document.getElementById('repo-detected').classList.add('hidden');
  document.getElementById('scan-results').classList.add('hidden');
  document.getElementById('no-scan').classList.add('hidden');
  document.getElementById('scanning').classList.add('hidden');
}
