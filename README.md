# RepoScan

Comprehensive dual-score GitHub repository analyzer for safety and legitimacy assessment.

## Features

- **Dual Scoring System**: Separate safety and legitimacy scores for comprehensive repository evaluation
- **Vulnerability Detection**: Identifies security issues, configuration problems, and code patterns
- **Code Quality Analysis**: Analyzes file structure, testing practices, and maintainability
- **Community Metrics**: Evaluates repository activity, contributor engagement, and transparency
- **Detailed Reporting**: Provides actionable insights with risk factors and positive indicators

## Getting Started

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

## How It Works

RepoScan analyzes GitHub repositories across multiple dimensions:

### Safety Score (0-100)
- **Dependency Risks**: Evaluates dependency management and lock files
- **Code Security**: Scans for dangerous file types and security policies
- **Config Hygiene**: Checks for proper configuration and secret management
- **Code Quality**: Assesses documentation, tests, and licensing
- **Maintenance Posture**: Reviews commit activity and project status

### Legitimacy Score (0-100)
- **Working Evidence**: Verifies organized code structure and commit history
- **Transparency**: Reviews documentation and project descriptions
- **Community Signals**: Analyzes stars, forks, and engagement
- **Author Reputation**: Evaluates contributor profiles and experience
- **License Compliance**: Checks for proper open source licensing

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase
- Lucide Icons

## License

MIT
