# 🧠 RepoScan

**AI-Powered Safety & Legitimacy Scoring for GitHub Repositories**
Version 1.2 — 2025

📍 **Website:** [https://reposcan.pro](https://reposcan.pro)
📧 **Email:** jeremy@reposcan.pro
🐦 **Twitter (X):** [@RepoScanner](https://twitter.com/RepoScanner)
💻 **GitHub:** [https://github.com/RepoScore/RepoScan](https://github.com/RepoScore/RepoScan)

---

## 🔹 Abstract

Open-source software is the backbone of modern technology—but with openness comes risk. Projects can contain hidden vulnerabilities, malicious code, or non-functional components. RepoScan addresses this growing concern by providing an AI-powered trust framework for evaluating GitHub repositories.

RepoScan helps developers, auditors, and security professionals assess open-source projects across two critical dimensions: **Safety** and **Legitimacy**.
It delivers real-time, data-driven scores that quantify whether a repository is secure, authentic, and functional—without ever executing its code.

---

## 🔹 Mission

RepoScan's mission is to bring **transparency and trust** back to open-source software.
It bridges the gap between static analysis and real-world reliability, empowering developers and organizations to make confident decisions about the code they depend on.

Two key questions guide its design:

- 🛡️ **Is it safe to run this code?**
- ✅ **Can I trust the people behind it?**

By providing a quantifiable answer to both, RepoScan establishes a new trust layer for the open-source ecosystem.

---

## 🔹 Overview

RepoScan performs automated repository analysis using static code inspection, dependency vulnerability scanning, and metadata heuristics. The platform produces two distinct scores:

| Score | Description |
|-------|-------------|
| ��️ **Safety Score** | Measures code and dependency security, cleanliness, and technical integrity. |
| ✅ **Legitimacy Score** | Evaluates transparency, documentation quality, and evidence that the project actually works. |

Each repository receives a score from **0 to 100** in both categories, along with a weighted **Overall Score** that combines both dimensions:

```
Overall Score = (Safety × 0.45) + (Legitimacy × 0.55)
```

This weighting prioritizes functionality and transparency slightly more than static code security, reflecting RepoScan's philosophy that "code that works and can be trusted" is the ultimate measure of quality.

---

## 🔹 Key Features

- **Dual-Score System**: Separate, transparent metrics for Safety and Legitimacy
- **Vulnerability Detection**: Scans npm, Python, and Rust dependencies for known CVEs
- **AST-Based Code Pattern Analysis**: Detects insecure code patterns and hardcoded secrets
- **Proof of Functionality**: Emphasizes working evidence such as lock files, CI/CD configurations, and example outputs
- **Confidence Metric**: Indicates the reliability of each analysis based on data completeness
- **Real-Time Scanning**: Powered by Supabase Edge Functions for instant results
- **Persistent Results**: Stores historical scans for longitudinal tracking and auditing
- **Modern UI**: Built with React and Tailwind for speed, clarity, and accessibility

---

## 🔹 Scoring Methodology

### 🛡️ Safety Score (45%)

The Safety Score measures the security posture of a repository. It includes:

- **Dependency Risks (30%)** – Evaluates dependency files, version pinning, and outdated packages.
- **Code Security (30%)** – Detects malicious patterns, unsafe functions, and binary anomalies.
- **Configuration Hygiene (15%)** – Reviews .gitignore, secret handling, and environment safety.
- **Code Quality (15%)** – Considers presence of tests, documentation, and maintainability.
- **Maintenance Posture (10%)** – Tracks update frequency and contributor diversity.

### ✅ Legitimacy Score (55%)

The Legitimacy Score determines whether a project is genuine, transparent, and demonstrably functional. It includes:

- **Working Evidence (40%)** – Validates that the repository builds or runs correctly (e.g., lock files, CI/CD, examples).
- **Transparency & Documentation (20%)** – Assesses README clarity, changelogs, and contribution guidelines.
- **Community Signals (15%)** – Weighs stars, forks, and engagement using log-scaled metrics.
- **Author Reputation (15%)** – Considers account age, activity history, and organization affiliation.
- **License & Compliance (10%)** – Checks for valid SPDX licensing and open-source alignment.

Each analysis includes a **confidence score**, reflecting data quality and signal completeness.

---

## 🔹 Methodology Summary

RepoScan employs a multi-layered analytical approach:

1. **Static File Analysis**: Detects dependency definitions, configuration quality, and project structure.
2. **Vulnerability Scanning**: Cross-references known vulnerabilities in npm, Python, and Rust ecosystems.
3. **AST-Based Pattern Recognition**: Uses abstract syntax tree analysis to detect insecure or malicious code constructs.
4. **Metadata Analysis**: Gathers repository statistics, contributor patterns, and historical activity via the GitHub API.
5. **Community & Transparency Assessment**: Evaluates engagement and documentation authenticity to measure project health.

The combination of these factors produces a comprehensive trust profile for every repository.

---

## 🔹 Security & Privacy Principles

RepoScan is designed with security as a foundational principle:

- **No Code Execution**: Analysis is metadata-based and never runs repository code.
- **Read-Only Scanning**: No modifications or writes to repositories.
- **Data Protection**: All stored data is safeguarded under Supabase Row-Level Security (RLS).
- **Rate Compliance**: Adheres strictly to GitHub API rate limits and privacy policies.
- **Anonymous Use**: Public repositories can be scanned without authentication or account creation.

---

## 🔹 Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| v1.0 | Dual-score static analysis engine | ✅ Complete |
| v1.0 | React UI with detailed breakdowns | ✅ Complete |
| v1.0 | Supabase backend with persistent storage | ✅ Complete |
| v1.1 | Dependency vulnerability scanning (NVD/Snyk integration) | ✅ Complete |
| v1.2 | AST-based pattern detection | ✅ Complete |
| v2.0 | LLM-enhanced deep scanning with Claude API | 🔜 Planned |
| v2.1 | Hybrid Quick Scan vs Deep Scan modes | 🔜 Planned |
| v2.2 | Natural language risk summaries and insights | 🔜 Planned |
| v2.3 | Intelligent code pattern analysis via LLM | 🔜 Planned |
| v3.0 | Browser extension for in-page GitHub scanning | 🔜 Planned |
| v3.1 | Public API with open trust leaderboard | 🔜 Planned |

---

## 🔹 Technology Stack

RepoScan is built on a modern, scalable architecture:

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL with Row-Level Security
- **APIs**: GitHub REST API v3
- **Infrastructure**: Real-time scanning and persistent storage for reproducible analyses

---

## 🔹 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

---

## 🔹 Governance & Licensing

RepoScan is fully open-source under the **MIT License** (© 2025 RepoScan).
All code, methodologies, and contributions are publicly auditable on GitHub.

The project is maintained by the open-source community and welcomes contributions in:

- Language-specific vulnerability modules
- Machine learning–based risk scoring
- Expanded AST parsing
- Performance and efficiency optimizations

---

## 🔹 Frequently Asked Questions

**Does RepoScan run repository code?**
No. RepoScan performs only static and metadata analysis.

**How accurate are the scores?**
Scores are heuristic-based and should be interpreted as risk indicators, not absolute truth. The confidence metric helps gauge result reliability.

**Can private repositories be scanned?**
Not yet. Private repository support will be introduced in a future authenticated release.

**What's the difference between Safety and Legitimacy?**
Safety measures technical security; Legitimacy measures authenticity, transparency, and functional proof.

---

## ❤️ Built for the Open-Source Community

RepoScan exists to make open-source safer, more transparent, and more reliable.
By combining advanced analysis with accessible design, it brings professional-grade code review intelligence to everyone.

📍 **Website:** [https://reposcan.pro](https://reposcan.pro)
📧 **Email:** jeremy@reposcan.pro
🐦 **Twitter (X):** [@RepoScanner](https://twitter.com/RepoScanner)
💻 **GitHub:** [https://github.com/RepoScore/RepoScan](https://github.com/RepoScore/RepoScan)
