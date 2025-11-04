class RepoScanAPI {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async getRepositoryScan(repoUrl) {
    const endpoint = `${this.baseUrl}/rest/v1/repo_scans`;
    const params = new URLSearchParams({
      repository_url: `eq.${repoUrl}`,
      order: 'created_at.desc',
      limit: '1'
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  async createScan(repoUrl, walletAddress = null) {
    const endpoint = `${this.baseUrl}/functions/v1/scan-repo`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        repository_url: repoUrl,
        wallet_address: walletAddress
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getScanById(scanId) {
    const endpoint = `${this.baseUrl}/rest/v1/repo_scans`;
    const params = new URLSearchParams({
      id: `eq.${scanId}`
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  async getVulnerabilities(scanId) {
    const endpoint = `${this.baseUrl}/rest/v1/vulnerabilities`;
    const params = new URLSearchParams({
      scan_id: `eq.${scanId}`,
      order: 'severity.asc'
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getCodeQualityIssues(scanId) {
    const endpoint = `${this.baseUrl}/rest/v1/code_quality_issues`;
    const params = new URLSearchParams({
      scan_id: `eq.${scanId}`,
      order: 'severity.asc'
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserScans(walletAddress, limit = 10) {
    const endpoint = `${this.baseUrl}/rest/v1/repo_scans`;
    const params = new URLSearchParams({
      wallet_address: `eq.${walletAddress}`,
      order: 'created_at.desc',
      limit: limit.toString()
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getDeepScan(scanId) {
    const endpoint = `${this.baseUrl}/rest/v1/deep_scans`;
    const params = new URLSearchParams({
      repo_scan_id: `eq.${scanId}`
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  async initiateDeepScan(repoUrl, scanType, walletAddress) {
    const endpoint = `${this.baseUrl}/functions/v1/deep-scan`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        repository_url: repoUrl,
        scan_type: scanType,
        initiated_by: walletAddress
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getTokenLockTiers() {
    const endpoint = `${this.baseUrl}/rest/v1/token_lock_tiers`;
    const params = new URLSearchParams({
      order: 'min_lock_amount.asc'
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserTokenLocks(walletAddress) {
    const endpoint = `${this.baseUrl}/rest/v1/token_locks`;
    const params = new URLSearchParams({
      wallet_address: `eq.${walletAddress}`,
      order: 'created_at.desc'
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getRecentScans(limit = 20) {
    const endpoint = `${this.baseUrl}/rest/v1/repo_scans`;
    const params = new URLSearchParams({
      order: 'created_at.desc',
      limit: limit.toString()
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async searchRepositories(query) {
    const endpoint = `${this.baseUrl}/rest/v1/repo_scans`;
    const params = new URLSearchParams({
      repository_url: `ilike.%${query}%`,
      order: 'created_at.desc',
      limit: '10'
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  getHeaders(includeAuth = false) {
    const headers = {
      'apikey': this.apiKey,
      'Content-Type': 'application/json'
    };

    if (includeAuth) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  static async fromStorage() {
    const result = await chrome.storage.local.get(['apiBaseUrl', 'supabaseKey']);
    return new RepoScanAPI(
      result.apiBaseUrl || 'https://your-project.supabase.co',
      result.supabaseKey || 'your-supabase-anon-key'
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RepoScanAPI;
}
