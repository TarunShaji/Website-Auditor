# Verisite - Deterministic Website Auditing Tool

A deterministic website auditing tool that crawls websites, builds internal link graphs, and reports objective technical issues.

## Features

- **Deterministic Analysis**: Only reports objective, provable states
- **Comprehensive Crawling**: BFS-based crawler with robots.txt respect
- **Link Graph Analysis**: Internal link structure mapping
- **Sitemap Parsing**: Handles sitemap.xml and sitemap indexes
- **17 Issue Types**: Detects broken links, orphan pages, missing metadata, and more

## Architecture

```
Backend (Node.js + Express)
├── URL Normalization
├── Robots.txt Parser
├── Sitemap Parser
├── Crawler Engine (BFS)
├── Link Graph Builder
└── Issue Detectors

Frontend (React + Vite + TailwindCSS)
└── Modern UI for audit visualization
```

## Installation

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Usage

1. Start the backend server (port 3001)
2. Start the frontend dev server (port 5173)
3. Enter a website URL to audit
4. View deterministic technical issues

## Issue Types Detected

### Crawl & Accessibility
1. Broken Pages (4xx/5xx)
2. Broken Internal Links
3. Broken External Links
4. Redirect Chains
5. Redirect Loops

### Crawl Control & Indexing
6. Pages Blocked by robots.txt
7. Pages Marked noindex

### Link Graph
8. Sitemap-Based Orphan Pages
9. Zero Incoming Internal Links
10. Zero Outgoing Internal Links

### Page Structure
11. Missing `<title>`
12. Duplicate `<title>`
13. Duplicate Meta Descriptions
14. Missing `<h1>`
15. Multiple `<h1>`

### Security
16. Mixed Content (HTTPS → HTTP)
17. Resources Blocked by robots.txt

## Design Principles

- ❌ No AI inference
- ❌ No qualitative judgments
- ✅ Only objective, provable states
- ✅ Reproducible results
- ✅ Structured output
