/**
 * RepoScan API Integration Examples
 *
 * This file demonstrates how to integrate RepoScan into your applications.
 */

// Example 1: Basic repository scan
async function scanRepository(githubUrl: string) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/scan-repo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ githubUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Scan failed');
  }

  const data = await response.json();
  return data.scan;
}

// Example 2: Batch scanning multiple repositories
async function batchScan(repoUrls: string[]) {
  const results = await Promise.allSettled(
    repoUrls.map(url => scanRepository(url))
  );

  return results.map((result, index) => ({
    url: repoUrls[index],
    status: result.status,
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
}

// Example 3: Score comparison
async function compareRepositories(repo1Url: string, repo2Url: string) {
  const [scan1, scan2] = await Promise.all([
    scanRepository(repo1Url),
    scanRepository(repo2Url),
  ]);

  return {
    repo1: {
      name: scan1.repo_name,
      overall: scan1.overall_score,
      safety: scan1.safety_score,
      legitimacy: scan1.legitimacy_score,
    },
    repo2: {
      name: scan2.repo_name,
      overall: scan2.overall_score,
      safety: scan2.safety_score,
      legitimacy: scan2.legitimacy_score,
    },
    winner: scan1.overall_score > scan2.overall_score ? 'repo1' : 'repo2',
    difference: Math.abs(scan1.overall_score - scan2.overall_score),
  };
}

// Example 4: Safety threshold checker
async function isSafeToUse(githubUrl: string, minSafetyScore = 70, minLegitimacy = 60) {
  const scan = await scanRepository(githubUrl);

  const isSafe = scan.safety_score >= minSafetyScore;
  const isLegitimate = scan.legitimacy_score >= minLegitimacy;
  const hasGoodConfidence = scan.confidence >= 0.7;

  return {
    recommended: isSafe && isLegitimate && hasGoodConfidence,
    details: {
      safety_score: scan.safety_score,
      legitimacy_score: scan.legitimacy_score,
      confidence: scan.confidence,
      passes_safety: isSafe,
      passes_legitimacy: isLegitimate,
      passes_confidence: hasGoodConfidence,
    },
    risk_factors: scan.risk_factors,
    positive_indicators: scan.positive_indicators,
  };
}

// Example 5: CI/CD integration
async function cicdCheck(githubUrl: string) {
  try {
    const scan = await scanRepository(githubUrl);

    if (scan.overall_score < 50) {
      console.error(`❌ Score too low: ${scan.overall_score}/100`);
      console.error('Risk Factors:', scan.risk_factors);
      process.exit(1);
    }

    if (scan.confidence < 0.6) {
      console.warn(`⚠️  Low confidence: ${scan.confidence}`);
    }

    console.log(`✅ Passed: ${scan.overall_score}/100 (confidence: ${scan.confidence})`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Scan failed:', error);
    process.exit(1);
  }
}

// Example 6: Monitoring score trends
interface ScanHistory {
  timestamp: Date;
  overall_score: number;
  safety_score: number;
  legitimacy_score: number;
}

function analyzeTrend(history: ScanHistory[]) {
  if (history.length < 2) {
    return { trend: 'insufficient_data' };
  }

  const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const overallChange = newest.overall_score - oldest.overall_score;
  const safetyChange = newest.safety_score - oldest.safety_score;
  const legitimacyChange = newest.legitimacy_score - oldest.legitimacy_score;

  return {
    trend: overallChange > 5 ? 'improving' : overallChange < -5 ? 'declining' : 'stable',
    changes: {
      overall: overallChange,
      safety: safetyChange,
      legitimacy: legitimacyChange,
    },
    current: newest,
    baseline: oldest,
  };
}

// Export functions for use in other modules
export {
  scanRepository,
  batchScan,
  compareRepositories,
  isSafeToUse,
  cicdCheck,
  analyzeTrend,
};

// Example usage in a script
if (import.meta.main) {
  const testUrl = 'https://github.com/facebook/react';

  console.log('Scanning repository...');
  const result = await scanRepository(testUrl);

  console.log('\n📊 Scan Results:');
  console.log(`Repository: ${result.repo_name}`);
  console.log(`Overall Score: ${result.overall_score}/100`);
  console.log(`Safety Score: ${result.safety_score}/100`);
  console.log(`Legitimacy Score: ${result.legitimacy_score}/100`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

  if (result.risk_factors.length > 0) {
    console.log('\n⚠️  Risk Factors:');
    result.risk_factors.forEach((risk: string) => console.log(`  - ${risk}`));
  }

  if (result.positive_indicators.length > 0) {
    console.log('\n✅ Positive Indicators:');
    result.positive_indicators.forEach((indicator: string) => console.log(`  - ${indicator}`));
  }
}
