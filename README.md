# 🧠 RepoScan

**RepoScan** is a comprehensive GitHub repository analyzer that evaluates open-source projects for **Safety** and **Legitimacy**. It helps developers, auditors, and security researchers quickly determine whether repositories are secure, authentic, and actually functional.

---

## 🚀 Overview

RepoScan combines static analysis, dependency scanning, and intelligent heuristics to produce two distinct scores:

| Score | Description |
|-------|-------------|
| 🛡️ **Safety Score** | Measures how secure, clean, and risk-free the repository's code and dependencies are. Answers: *"Is it safe to run this code?"* |
| ✅ **Legitimacy Score** | Measures whether the project is genuine, transparent, and functional. Answers: *"Can you trust the people behind it?"* |

Each score is represented on a scale from **0 to 100**, with a weighted **Overall Score** and detailed breakdown of contributing factors.

---

## ⚙️ Features

- **Dual-Score System**: Separate Safety and Legitimacy ratings with transparent weighting
- **Comprehensive Analysis**: Examines dependencies, code patterns, security policies, and community signals
- **Dependency Vulnerability Scanning**: Detects known CVEs in npm, Python, and Rust packages
- **AST-Based Code Pattern Detection**: Scans for hardcoded secrets, SQL injection, command injection, and insecure functions
- **Working Evidence Focus**: Legitimacy heavily weighted toward proof the code actually works (lock files, CI/CD, examples)
- **Confidence Scoring**: Quality metrics showing reliability of the analysis
- **Real-Time Scanning**: Instant analysis via Supabase Edge Functions
- **Modern UI**: Beautiful, responsive interface with detailed score breakdowns and vulnerability reports
- **Persistent Storage**: All scans saved to Supabase for historical analysis

---

## 🧩 Architecture

```
📦 RepoScan/
├── src/
│   ├── components/
│   │   ├── RepoScanner.tsx      # Main scanning interface
│   │   └── ScoreCard.tsx        # Score display component
│   ├── lib/
│   │   └── supabase.ts          # Database client & types
│   └── App.tsx
├── supabase/
│   ├── functions/
│   │   └── scan-repo/           # Edge function for analysis
│   │       └── index.ts
│   └── migrations/              # Database schema
└── README.md
```

**Technology Stack:**
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL with Row Level Security
- **APIs**: GitHub REST API v3

---

## 🧮 Scoring System

### 🛡️ Safety Score (45% of Overall)

Evaluates the technical integrity and security of the repository.

| Category | Weight | Focus |
|----------|--------|-------|
| **Dependency Risks** | 30% | Dependency files, lock files, version pinning |
| **Code Security** | 30% | Malicious patterns, binary files, security policies |
| **Configuration Hygiene** | 15% | .gitignore, secrets exposure, environment configs |
| **Code Quality** | 15% | README, tests, license, maintainability |
| **Maintenance Posture** | 10% | Commit frequency, update recency, contributor diversity |

### ✅ Legitimacy Score (55% of Overall)

Evaluates trustworthiness and functionality — whether the code works and the project is genuine.

| Category | Weight | Focus |
|----------|--------|-------|
| **Working Evidence** | 40% | Lock files, Docker, CI/CD, examples (proof it works) |
| **Transparency & Documentation** | 20% | README quality, contributing guidelines, changelog |
| **Community Signals** | 15% | Stars (log-scaled), forks, contributors, engagement |
| **Author Reputation** | 15% | Account age, organization status, repository history |
| **License & Compliance** | 10% | Valid SPDX license, popular license types |

### 📊 Overall Score

```
Overall Score = (Safety Score × 0.45) + (Legitimacy Score × 0.55)
```

The formula tilts toward legitimacy to emphasize "does it actually work?" over purely static checks.

---

## 🧠 Example Output

```json
{
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
  "analysis_summary": "This repository demonstrates strong safety practices and legitimate development patterns with solid community trust.",
  "positive_indicators": [
    "Has dependency management files",
    "Uses lock files for reproducible builds",
    "Has README documentation",
    "Licensed under MIT",
    "Recently updated (last 30 days)"
  ],
  "risk_factors": [
    "No test files detected"
  ]
}
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/reposcan.git
cd reposcan
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Configure Environment
Create a `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4️⃣ Run Development Server
```bash
npm run dev
```

### 5️⃣ Scan a Repository
1. Open the app in your browser
2. Paste any GitHub repository URL (e.g., `https://github.com/facebook/react`)
3. Click "Scan Repository"
4. View comprehensive safety and legitimacy analysis

---

## 🔧 Deployment

### Database Setup
The required database schema is automatically created via Supabase migrations:
- `repo_scans` table with RLS policies
- Columns for scores, breakdowns, confidence, and analysis results

### Edge Function Deployment
The scan-repo edge function is automatically deployed and handles:
- GitHub API integration
- Repository analysis
- Score calculation
- Result storage

---

## 🧪 Analysis Methodology

### Static Analysis
- **File Pattern Detection**: Identifies dependency files, config files, documentation
- **Extension Scanning**: Flags potentially dangerous binary files
- **Structure Analysis**: Evaluates project organization and completeness

### Vulnerability Scanning
- **Dependency Analysis**: Checks npm, Python, and Rust packages against known CVE databases
- **Code Pattern Detection**: Scans source code for:
  - Hardcoded secrets (API keys, passwords, tokens)
  - SQL injection vulnerabilities
  - Command injection risks
  - Insecure functions (eval, pickle, unsafe blocks)
  - XSS vulnerabilities (innerHTML, dangerouslySetInnerHTML)

### Metadata Analysis
- **GitHub API Data**: Repository stats, commit history, contributor info
- **Temporal Analysis**: Account age, update frequency, commit patterns
- **Community Metrics**: Log-scaled star counting to prevent gaming

### Weighted Scoring
Each category uses a normalized 0-100 scale with specific signals:

```typescript
// Example: Safety Score Calculation
safety_total =
  dependency_risks × 0.30 +
  code_security × 0.30 +
  config_hygiene × 0.15 +
  code_quality × 0.15 +
  maintenance_posture × 0.10
```

### Confidence Calculation
```typescript
confidence =
  (data_quality × 0.6) +
  (score_confidence × 0.4)
```

Confidence reflects how complete the analysis is based on available data.

---

## 🔒 Security & Privacy

- **No Code Execution**: RepoScan analyzes metadata and file listings only
- **Read-Only**: No modifications are made to scanned repositories
- **Row Level Security**: All database queries protected by Supabase RLS
- **Rate Limiting**: Respects GitHub API rate limits
- **No Authentication Required**: Public repositories can be scanned without login

---

## 🎯 Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| ✅ v1.0 | Dual-score static analysis engine | **Complete** |
| ✅ v1.0 | Modern React UI with detailed breakdowns | **Complete** |
| ✅ v1.0 | Supabase backend with persistent storage | **Complete** |
| ✅ v1.1 | Dependency vulnerability scanning (NVD/Snyk) | **Complete** |
| ✅ v1.2 | AST-based code pattern detection | **Complete** |
| 🔜 v2.0 | Sandboxed build/test execution | Planned |
| 🔜 v2.1 | AI-powered claim verification | Planned |
| 🔜 v3.0 | Browser extension for in-page scanning | Planned |
| 🔜 v3.1 | Public API with trust leaderboard | Planned |

---

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional language support for vulnerability scanning
- Integration with live CVE databases (NVD API)
- Machine learning model for pattern detection
- Additional scoring categories
- Performance optimizations
- Enhanced AST parsing for deeper code analysis

---

## 📊 Data Model

### RepoScan Database Schema

```sql
CREATE TABLE repo_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_url text NOT NULL,
  repo_name text,
  safety_score integer CHECK (safety_score >= 0 AND safety_score <= 100),
  legitimacy_score integer CHECK (legitimacy_score >= 0 AND legitimacy_score <= 100),
  overall_score integer CHECK (overall_score >= 0 AND overall_score <= 100),
  confidence numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  breakdown jsonb DEFAULT '{}'::jsonb,
  notes jsonb DEFAULT '[]'::jsonb,
  analysis_summary text,
  risk_factors jsonb DEFAULT '[]'::jsonb,
  positive_indicators jsonb DEFAULT '[]'::jsonb,
  vulnerabilities jsonb DEFAULT '[]'::jsonb,
  vulnerability_summary jsonb,
  scan_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

---

## 📜 License

MIT License © 2025 RepoScan

---

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev) - UI framework
- [Supabase](https://supabase.com) - Backend infrastructure
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Lucide Icons](https://lucide.dev) - Icon system
- [GitHub API](https://docs.github.com/en/rest) - Repository data

---

## 💡 FAQ

**Q: Does RepoScan execute code from repositories?**
A: No. Current version performs static analysis only using GitHub API metadata and file listings.

**Q: How accurate are the scores?**
A: Scores are heuristic-based and should be used as indicators, not absolute measures. The confidence score helps gauge reliability.

**Q: Can I scan private repositories?**
A: Currently only public repositories are supported. Private repo support requires authentication.

**Q: How often are scans updated?**
A: Each scan is a point-in-time analysis. Re-scan repositories to get updated scores.

**Q: What's the difference between Safety and Legitimacy?**
A: Safety focuses on technical security and code quality. Legitimacy focuses on whether the project is trustworthy and actually works.

---

**Made with ❤️ for the open-source community**
