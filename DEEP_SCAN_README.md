# Deep Scan with Claude AI - Documentation

## Overview

The Deep Scan feature provides advanced, AI-powered repository analysis using Claude AI. It goes beyond basic security scanning to offer comprehensive insights into code architecture, quality, performance, and maintainability.

## Status: Skeleton Complete - Claude Integration Pending

All database schema, service layer, components, and UI are built and ready. The system needs Claude API integration to become fully functional.

## Architecture

### Database Schema

The Deep Scan system uses six interconnected tables:

#### 1. **deep_scans** (Main scan records)
- Tracks scan metadata and status
- Links to basic repo_scans
- Records processing metrics (files, lines, tokens, duration)
- Status tracking: pending → processing → completed/failed

#### 2. **deep_scan_findings** (Individual issues)
- Detailed findings from code analysis
- Categories: security, architecture, code_quality, performance, maintainability, documentation
- Severity levels: critical, high, medium, low, info
- Includes file location, code snippets, and AI explanations
- Confidence scores for each finding

#### 3. **deep_scan_insights** (Strategic recommendations)
- High-level architectural and design insights
- Types: architecture_pattern, design_flaw, best_practice, optimization, technical_debt
- Impact and effort assessments
- Priority scoring (automatically calculated)
- Affected files and code examples

#### 4. **deep_scan_metrics** (Quantitative measurements)
- Measurable code metrics
- Threshold-based status (pass/warning/fail)
- Contextual information
- Categorized by analysis type

#### 5. **deep_scan_reports** (Generated documentation)
- Executive summaries
- Technical details
- Remediation plans
- Multiple formats: markdown, html, json, pdf

#### 6. **deep_scan_comparisons** (Historical analysis)
- Compare two scans
- Track improvements and regressions
- Overall trend analysis
- Detailed change tracking

### Security Features

- **Row Level Security (RLS)** enabled on all tables
- Users can only view their own scans
- Wallet address verification
- Automated timestamp tracking
- Priority score calculation via triggers

### Service Layer (`src/lib/deepScan.ts`)

The `DeepScanService` class provides comprehensive methods:

**Scan Management:**
- `createScan()` - Initialize new deep scan
- `getScanById()` - Retrieve specific scan
- `getUserScans()` - Get user's scan history
- `updateScanStatus()` - Update scan progress

**Findings Management:**
- `addFinding()` - Record individual issue
- `getFindings()` - Get all findings for scan
- `getFindingsByCategory()` - Filter by category

**Insights Management:**
- `addInsight()` - Record strategic insight
- `getInsights()` - Get all insights (priority sorted)

**Metrics Management:**
- `addMetric()` - Record code metric
- `getMetrics()` - Get all metrics

**Reports & Analysis:**
- `generateReport()` - Create formatted reports
- `getReports()` - Retrieve generated reports
- `createComparison()` - Compare two scans
- `getScanSummary()` - Get comprehensive overview

**Helper Methods:**
- `getSeverityColor()` - UI color coding
- `getSeverityBgColor()` - Background colors
- `getImpactColor()` - Impact level colors
- `formatDuration()` - Human-readable durations

## Scan Types

### 1. Full Deep Scan
Comprehensive analysis covering all aspects:
- Security vulnerability detection
- Architecture evaluation
- Code quality assessment
- Performance analysis
- Best practices review

### 2. Security Focused
In-depth security analysis:
- Vulnerability detection
- Threat analysis
- Dependency audit
- Security best practices

### 3. Architecture Analysis
System design evaluation:
- Design patterns
- Code structure
- Modularity assessment
- Scalability review

### 4. Code Quality
Maintainability assessment:
- Code smells
- Technical debt
- Maintainability metrics
- Documentation quality

### 5. Performance Analysis
Optimization opportunities:
- Performance bottlenecks
- Memory issues
- Optimization tips
- Efficiency metrics

## Components

### DeepScanInitiator (`src/components/DeepScanInitiator.tsx`)

**Purpose:** User interface for starting deep scans

**Features:**
- Visual scan type selection
- Repository information display
- Wallet connection requirement
- Scan type descriptions with feature lists
- Coming soon indicators

**Props:**
- `repositoryUrl`: Repository to scan
- `walletAddress`: User's wallet (required)
- `repoScanId`: Optional link to basic scan
- `onScanCreated`: Callback when scan starts

### DeepScanResults (`src/components/DeepScanResults.tsx`)

**Purpose:** Display comprehensive scan results

**Features:**
- Scan overview with metrics
- Severity-based issue categorization
- Expandable finding details
- Code snippets and recommendations
- AI explanations
- Confidence scores
- Key insights display
- Priority scoring
- Affected files tracking

**Props:**
- `scanId`: Scan ID to display

## Claude AI Integration Plan

### Required Configuration

Add to `.env`:
```env
VITE_CLAUDE_API_KEY=sk-ant-...
VITE_CLAUDE_MODEL=claude-3-sonnet-20240229
VITE_CLAUDE_MAX_TOKENS=4096
VITE_CLAUDE_TEMPERATURE=0.7
VITE_DEEP_SCAN_ENABLED=false
```

### Integration Points

#### 1. Repository Code Fetching
```typescript
// Fetch repository files via GitHub API
const repoData = await fetchRepositoryCode(repositoryUrl);
```

#### 2. Code Analysis with Claude
```typescript
// Send code to Claude for analysis
const analysis = await analyzeWithClaude({
  code_samples: repoData.files,
  scan_type: selectedScanType,
  focus_areas: ['security', 'architecture', 'quality']
});
```

#### 3. Results Processing
```typescript
// Store findings in database
for (const finding of analysis.findings) {
  await DeepScanService.addFinding({
    deep_scan_id: scanId,
    ...finding
  });
}
```

### Claude Prompt Structure

**System Prompt:**
```
You are an expert code reviewer and security analyst. Analyze the provided code
for security vulnerabilities, architectural issues, code quality problems, and
performance concerns. Provide specific, actionable recommendations.
```

**Analysis Prompt Template:**
```
Repository: {repo_url}
Language: {primary_language}
Scan Type: {scan_type}

Files to analyze:
{file_list}

Please analyze this code and provide:
1. Security vulnerabilities with severity levels
2. Architectural insights and design patterns
3. Code quality issues and technical debt
4. Performance optimization opportunities
5. Best practice recommendations

For each finding, include:
- Category and severity
- Specific file and line number
- Description of the issue
- Why it's a problem
- How to fix it
- Confidence level (0-100)
```

### Response Parsing

Claude's response should be structured JSON:
```json
{
  "findings": [
    {
      "category": "security",
      "severity": "high",
      "title": "SQL Injection Vulnerability",
      "description": "...",
      "file_path": "src/db.ts",
      "line_number": 42,
      "code_snippet": "...",
      "recommendation": "...",
      "confidence_score": 95,
      "explanation": "..."
    }
  ],
  "insights": [...],
  "metrics": [...],
  "summary": "Overall analysis summary"
}
```

## Edge Function Implementation

Create: `supabase/functions/process-deep-scan/index.ts`

```typescript
import { serve } from 'std/http/server.ts';
import Anthropic from '@anthropic-ai/sdk';

serve(async (req: Request) => {
  const { scan_id, repository_url, scan_type } = await req.json();

  // 1. Fetch repository code
  const repoData = await fetchRepo(repository_url);

  // 2. Analyze with Claude
  const claude = new Anthropic({ apiKey: Deno.env.get('CLAUDE_API_KEY') });
  const analysis = await claude.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: buildAnalysisPrompt(repoData, scan_type)
    }]
  });

  // 3. Parse and store results
  await storeAnalysisResults(scan_id, analysis);

  return new Response(JSON.stringify({ success: true }));
});
```

## Usage Examples

### Creating a Deep Scan

```typescript
import { DeepScanService } from './lib/deepScan';

const scan = await DeepScanService.createScan({
  repository_url: 'https://github.com/user/repo',
  initiated_by: walletAddress,
  scan_type: 'full',
  repo_scan_id: existingScanId
});
```

### Retrieving Results

```typescript
const summary = await DeepScanService.getScanSummary(scanId);

console.log(`Findings: ${summary.findings_count.critical} critical`);
console.log(`Insights: ${summary.insights_count} strategic insights`);
console.log(`Top issues:`, summary.top_issues);
```

### Comparing Scans

```typescript
const comparison = await DeepScanService.createComparison(
  oldScanId,
  newScanId,
  {
    comparison_summary: 'Security improved, performance declined',
    improvements: [...],
    regressions: [...],
    overall_trend: 'improved'
  }
);
```

## Integration Checklist

### Phase 1: Claude API Setup
- [ ] Obtain Claude API key
- [ ] Add environment variables
- [ ] Test API connectivity
- [ ] Implement rate limiting
- [ ] Add error handling

### Phase 2: Code Fetching
- [ ] GitHub API integration
- [ ] File filtering (size, type)
- [ ] Code extraction
- [ ] Syntax detection
- [ ] Dependency parsing

### Phase 3: Analysis Engine
- [ ] Implement Claude prompt builder
- [ ] Create analysis pipeline
- [ ] Parse Claude responses
- [ ] Store results in database
- [ ] Handle errors and retries

### Phase 4: UI Activation
- [ ] Enable scan initiation
- [ ] Add progress tracking
- [ ] Implement real-time updates
- [ ] Add result visualization
- [ ] Create export functionality

### Phase 5: Testing
- [ ] Test with various repositories
- [ ] Validate finding accuracy
- [ ] Test different scan types
- [ ] Performance testing
- [ ] Load testing

### Phase 6: Production
- [ ] Deploy edge function
- [ ] Enable feature flag
- [ ] Monitor token usage
- [ ] Track scan success rates
- [ ] Gather user feedback

## Cost Considerations

### Claude API Pricing (approximate)
- Input: $3 per million tokens
- Output: $15 per million tokens

### Typical Scan Estimates
- Small repo (< 10k lines): ~50k tokens = $0.15
- Medium repo (10k-50k lines): ~200k tokens = $0.60
- Large repo (50k+ lines): ~500k tokens = $1.50

### Optimization Strategies
1. File filtering (exclude tests, dependencies)
2. Incremental scanning (changed files only)
3. Caching previous results
4. Batch processing
5. Summary generation instead of full analysis

## Future Enhancements

- [ ] Incremental scans (only changed files)
- [ ] Scheduled periodic scans
- [ ] CI/CD integration
- [ ] PR comment automation
- [ ] Custom rule creation
- [ ] Multi-language support
- [ ] Historical trend analysis
- [ ] Team collaboration features
- [ ] Export to PDF/SARIF
- [ ] Integration with issue trackers

## Support

- Technical Documentation: This file
- Database Schema: See migration file
- API Reference: See service layer
- UI Components: See component files

## License

MIT License - See LICENSE file for details
