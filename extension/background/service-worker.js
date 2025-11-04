const API_BASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';

chrome.runtime.onInstalled.addListener(() => {
  console.log('RepoScan extension installed');

  chrome.storage.local.set({
    apiBaseUrl: API_BASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
    scanCache: {}
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });

  return true;
});

async function handleMessage(request, sender) {
  switch (request.type) {
    case 'CHECK_SCAN':
      return await checkScan(request.repoUrl);

    case 'INITIATE_SCAN':
      return await initiateScan(request.repoUrl, request.walletAddress);

    case 'CHECK_SCAN_STATUS':
      return await checkScanStatus(request.scanId);

    case 'CONNECT_WALLET':
      return await connectWallet();

    case 'GET_SETTINGS':
      return await getSettings();

    case 'UPDATE_SETTINGS':
      return await updateSettings(request.settings);

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

async function checkScan(repoUrl) {
  try {
    const cache = await getCachedScan(repoUrl);
    if (cache && !isCacheExpired(cache.timestamp)) {
      return { success: true, data: cache.data };
    }

    const settings = await getSettings();

    const response = await fetch(`${settings.apiBaseUrl}/rest/v1/repo_scans?repository_url=eq.${encodeURIComponent(repoUrl)}&order=created_at.desc&limit=1`, {
      headers: {
        'apikey': settings.supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch scan data');
    }

    const data = await response.json();

    if (data && data.length > 0) {
      await cacheScan(repoUrl, data[0]);
      return { success: true, data: data[0] };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error checking scan:', error);
    return { success: false, error: error.message };
  }
}

async function initiateScan(repoUrl, walletAddress) {
  try {
    const settings = await getSettings();

    const response = await fetch(`${settings.apiBaseUrl}/functions/v1/scan-repo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repository_url: repoUrl,
        wallet_address: walletAddress
      })
    });

    if (!response.ok) {
      throw new Error('Failed to initiate scan');
    }

    const result = await response.json();

    await clearScanCache(repoUrl);

    return {
      success: true,
      scanId: result.scan_id,
      message: 'Scan initiated successfully'
    };
  } catch (error) {
    console.error('Error initiating scan:', error);
    return { success: false, error: error.message };
  }
}

async function checkScanStatus(scanId) {
  try {
    const settings = await getSettings();

    const response = await fetch(`${settings.apiBaseUrl}/rest/v1/repo_scans?id=eq.${scanId}`, {
      headers: {
        'apikey': settings.supabaseKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check scan status');
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const scan = data[0];
      return {
        success: true,
        status: scan.status || 'pending',
        data: scan
      };
    }

    return { success: false, error: 'Scan not found' };
  } catch (error) {
    console.error('Error checking scan status:', error);
    return { success: false, error: error.message };
  }
}

async function connectWallet() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tabs[0]) {
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'WALLET_CONNECT_REQUEST'
      });

      if (response && response.address) {
        await chrome.storage.local.set({ walletAddress: response.address });
        return { success: true, address: response.address };
      }
    }

    return { success: false, error: 'Failed to connect wallet' };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return { success: false, error: error.message };
  }
}

async function getSettings() {
  const result = await chrome.storage.local.get(['apiBaseUrl', 'supabaseKey']);
  return {
    apiBaseUrl: result.apiBaseUrl || API_BASE_URL,
    supabaseKey: result.supabaseKey || SUPABASE_ANON_KEY
  };
}

async function updateSettings(settings) {
  try {
    await chrome.storage.local.set(settings);
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: error.message };
  }
}

async function getCachedScan(repoUrl) {
  const result = await chrome.storage.local.get(['scanCache']);
  const cache = result.scanCache || {};
  return cache[repoUrl] || null;
}

async function cacheScan(repoUrl, scanData) {
  const result = await chrome.storage.local.get(['scanCache']);
  const cache = result.scanCache || {};

  cache[repoUrl] = {
    data: scanData,
    timestamp: Date.now()
  };

  await chrome.storage.local.set({ scanCache: cache });
}

async function clearScanCache(repoUrl) {
  const result = await chrome.storage.local.get(['scanCache']);
  const cache = result.scanCache || {};

  if (cache[repoUrl]) {
    delete cache[repoUrl];
    await chrome.storage.local.set({ scanCache: cache });
  }
}

function isCacheExpired(timestamp, maxAge = 5 * 60 * 1000) {
  return Date.now() - timestamp > maxAge;
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('github.com')) {
    chrome.action.openPopup();
  } else {
    chrome.tabs.create({ url: 'https://github.com' });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('github.com')) {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }
});
