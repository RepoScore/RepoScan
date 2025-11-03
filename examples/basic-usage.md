# RepoScan Basic Usage Examples

This guide shows you how to use RepoScan to analyze GitHub repositories.

## Web Interface Usage

### 1. Scanning a Repository

1. Open RepoScan in your browser
2. Paste a GitHub repository URL in the input field:
   ```
   https://github.com/facebook/react
   ```
3. Click "Scan Repository"
4. View the comprehensive results

### 2. Understanding the Results

The scan will return three scores:

- **Safety Score (0-100)**: How secure and well-maintained the code is
- **Legitimacy Score (0-100)**: How trustworthy and functional the project is
- **Overall Score (0-100)**: Weighted combination (45% safety + 55% legitimacy)

### 3. Reading the Breakdown

Each score shows its component categories with weights:

**Safety Score Components:**
- Dependency Risks (30%)
- Code Security (30%)
- Config Hygiene (15%)
- Code Quality (15%)
- Maintenance (10%)

**Legitimacy Score Components:**
- Working Evidence (40%) - Lock files, CI/CD, examples
- Transparency (20%) - Documentation quality
- Community (15%) - Stars, contributors
- Author Reputation (15%) - Account age, history
- License (10%) - Valid license present

## Example Scans

### High-Quality Repository (e.g., React)

```
Expected Results:
- Safety Score: 85-95
- Legitimacy Score: 95-100
- Overall Score: 90-98

Positive Indicators:
✓ Has dependency management files
✓ Uses lock files for reproducible builds
✓ Has README documentation
✓ Includes test files
✓ Licensed under MIT
✓ Active development (5+ commits in 90 days)
✓ Has CI/CD configuration
✓ Includes example code/demos
✓ Multiple contributors
✓ Owned by an organization
```

### New/Small Repository

```
Expected Results:
- Safety Score: 40-60
- Legitimacy Score: 30-50
- Overall Score: 35-55

Risk Factors:
⚠ No test files detected
⚠ No example code found
⚠ Very low star count
⚠ Single contributor project
⚠ Relatively new account
⚠ No license specified
```

## API Integration Example

If you want to integrate RepoScan into your own applications:

```javascript
// Example API call to the edge function
const scanRepository = async (githubUrl) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/scan-repo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ githubUrl }),
  });

  const data = await response.json();
  return data.scan;
};

// Usage
const results = await scanRepository('https://github.com/owner/repo');
console.log(`Safety: ${results.safety_score}`);
console.log(`Legitimacy: ${results.legitimacy_score}`);
console.log(`Overall: ${results.overall_score}`);
console.log(`Confidence: ${results.confidence}`);
```

## Response Format

```json
{
  "id": "uuid",
  "repo_name": "owner/repository",
  "safety_score": 82,
  "legitimacy_score": 91,
  "overall_score": 87,
  "confidence": 0.94,
  "breakdown": {
    "safety": {
      "total": 82,
      "dependency_risks": 80,
      "code_security": 85,
      "config_hygiene": 75,
      "code_quality": 90,
      "maintenance_posture": 85
    },
    "legitimacy": {
      "total": 91,
      "working_evidence": 95,
      "transparency_docs": 88,
      "community_signals": 92,
      "author_reputation": 85,
      "license_compliance": 100
    }
  },
  "positive_indicators": [
    "Has dependency management files",
    "Uses lock files for reproducible builds"
  ],
  "risk_factors": [
    "No test files detected"
  ],
  "analysis_summary": "This repository demonstrates strong safety practices...",
  "scan_date": "2025-11-03T10:30:00.000Z"
}
```

## Tips for Better Scores

### Improving Safety Score

1. **Add dependency lock files** (package-lock.json, yarn.lock, etc.)
2. **Include a SECURITY.md** file with vulnerability reporting instructions
3. **Add .gitignore** to prevent committing sensitive files
4. **Include tests** in your repository
5. **Add a LICENSE** file
6. **Keep dependencies updated** regularly

### Improving Legitimacy Score

1. **Add comprehensive README** with setup instructions
2. **Include example code** in an `examples/` directory
3. **Set up CI/CD** (GitHub Actions, etc.)
4. **Add CONTRIBUTING.md** with contribution guidelines
5. **Maintain a CHANGELOG.md**
6. **Use Docker** for reproducible builds
7. **Engage with the community** (respond to issues, accept PRs)

## Common Questions

**Q: Why is my score lower than expected?**
A: Check the risk factors section. Common issues include missing tests, no license, or lack of documentation.

**Q: Can I improve my score?**
A: Yes! Follow the tips above. Re-scan after making improvements to see updated scores.

**Q: What's a good confidence score?**
A: 0.8 or higher indicates high-quality data was available for analysis. Lower confidence suggests limited information.

**Q: How often should I scan?**
A: Scan after major releases or significant changes. Scores reflect point-in-time status.
