# AI Link Intent Mismatch Detection

> **Feature Status:** ✅ Implemented  
> **Last Updated:** January 30, 2026  
> **AI Model:** Claude Haiku 3.5 (Anthropic)

---

## Table of Contents
1. [Overview](#overview)
2. [How to Enable/Disable](#how-to-enabledisable)
3. [Complete Workflow](#complete-workflow)
4. [Data Flow Detailed](#data-flow-detailed)
5. [Output Files](#output-files)
6. [Debugging](#debugging)
7. [Configuration](#configuration)

---

## Overview

This feature detects **link intent mismatches** where the anchor text of a link sets user expectations that the destination page does not fulfill.

**Example Mismatch:**
```
Anchor: "View Pricing"  →  Destination: Blog article about CBD benefits
```
The user expects pricing info but lands on a blog post — that's a mismatch.

### Key Principles

1. **Crawl everything, analyze selectively** — Only content links are analyzed, not nav/footer
2. **Conservative detection** — Only flags clear mismatches, not vague links
3. **Modular** — Can be disabled for any run without affecting deterministic checks
4. **Batched AI calls** — 5 workers × 5 links per request for efficiency

---

## How to Enable/Disable

### Enable AI (Default)

AI runs automatically if `ANTHROPIC_API_KEY` is set in `.env`:

```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Disable AI

**Method 1: Environment Variable**
```bash
# backend/.env
ENABLE_AI_ANALYSIS=false  # Disables AI entirely
```

**Method 2: Per-Audit Option**
```javascript
// In your API call or code
const auditor = new Auditor(url, { 
  enableAI: false  // Disable just for this run
});
```

**Method 3: Remove API Key**
```bash
# backend/.env
# ANTHROPIC_API_KEY=...  # Commented out = AI disabled
```

### Check Status in Logs

When AI is enabled, you'll see:
```
[AI_SERVICE] ✓ ANTHROPIC_API_KEY found
[AI_SERVICE]   Final status: ✓ ENABLED
```

When AI is disabled, you'll see:
```
[AI_SERVICE] ⚠️  AI disabled via ENABLE_AI_ANALYSIS=false
[AI_SERVICE]   Final status: ✗ DISABLED
```

---

## Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: CRAWLING                              │
│                                                                          │
│  HTMLParser.parse()                                                      │
│      │                                                                   │
│      ├── extractLinks() → internal_outgoing_links (ALL links)           │
│      │                     ↓                                            │
│      │              Used by deterministic detectors                     │
│      │              (broken links, incoming counts, etc)                │
│      │                                                                   │
│      └── extractContentLinks() → content_internal_links (CONTENT only) │
│                                   ↓                                     │
│                             Used by AI detector                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: ISSUE DETECTION                           │
│                                                                          │
│  IssueDetector.detectAll()                                              │
│      │                                                                   │
│      ├── 17 Deterministic Checks (run first, always)                    │
│      │     - Broken pages                                               │
│      │     - Redirect chains/loops                                      │
│      │     - Missing title/H1                                           │
│      │     - etc.                                                       │
│      │                                                                   │
│      └── detectLinkIntentMismatch() (18th check, AI)                    │
│            ↓                                                             │
│          Runs LinkIntentPipeline                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHASE 3: AI INTENT PIPELINE                        │
│                                                                          │
│  STEP 1: Collect Content Links                                          │
│      - Gather content_internal_links from all pages                     │
│      - Skip pages with no content links                                 │
│                                                                          │
│  STEP 2: Build Intent Objects                                           │
│      - For each content link, lookup destination page                   │
│      - Pull destination_title, destination_h1, destination_meta         │
│      - Skip if destination not crawled or has no metadata               │
│                                                                          │
│  STEP 3: Deduplicate                                                    │
│      - Deduplicate by link_key = destination_url + "|" + anchor_text    │
│      - Same anchor → same destination = one analysis                    │
│                                                                          │
│  STEP 4: AI Classification                                              │
│      - Create batches of 5 intent objects each                          │
│      - Process with 5 concurrent workers                                │
│      - Each worker sends batch to Claude Haiku                          │
│      - Parse responses: is_mismatch, confidence, explanation            │
│                                                                          │
│  STEP 5: Create Issues                                                  │
│      - Filter results where is_mismatch === true                        │
│      - Create LINK_INTENT_MISMATCH issues with evidence                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Detailed

### Step 1: Content Link Extraction (During Crawl)

**Location:** `src/crawler/htmlParser.js` → `extractContentLinks()`

**What it extracts:**
- Only links inside content areas: `<main>`, `<article>`, `.content`, `.post-content`
- Excludes: `<nav>`, `<header>`, `<footer>`, `<aside>`, pagination, filters

**Output (partial, no destination metadata yet):**
```javascript
{
  source_url: "https://example.com/blog/post-1",
  destination_url: "https://example.com/products/vape",
  anchor_text: "Check out our vape products",
  context_type: "content"
}
```

**Filtering rules:**
- ❌ Skip empty anchor text
- ❌ Skip generic anchors: "click here", "learn more", "read more"
- ❌ Skip system paths: `/cart`, `/account`, `/checkout`
- ❌ Skip pagination: `?page=`, `?sort=`, `?filter=`
- ❌ Skip external links

---

### Step 2: Intent Object Building (After Crawl)

**Location:** `src/pipelines/linkIntentPipeline.js` → `buildIntentObjects()`

**Process:**
1. Create a Map of all crawled pages by URL
2. For each content link, lookup destination page
3. Pull metadata from destination page
4. Skip if destination not crawled or has no title/H1

**Output (complete intent object):**
```javascript
{
  source_url: "https://example.com/blog/post-1",
  anchor_text: "Check out our vape products",
  context_type: "content",
  destination_url: "https://example.com/products/vape",
  destination_title: "Premium Vape Products | Example Store",
  destination_h1: "Shop Vape Products",
  destination_meta: "Browse our selection of premium vape products...",
  link_key: "https://example.com/products/vape|Check out our vape products"
}
```

---

### Step 3: AI Classification

**Location:** `src/utils/aiService.js` → `classifyIntents()`

**Request to Claude Haiku:**
```json
{
  "model": "claude-3-5-haiku-latest",
  "max_tokens": 1024,
  "system": "Role: You are an SEO intent analysis engine...",
  "messages": [{
    "role": "user",
    "content": "Analyze the following 5 internal links for intent mismatch:\n[{ index: 0, anchor_text: \"...\", ... }]"
  }]
}
```

**Response from Claude:**
```json
[
  {
    "index": 0,
    "is_mismatch": false,
    "confidence": 0.95,
    "explanation": "Anchor mentions vape products, destination is vape product page - aligned"
  },
  {
    "index": 1,
    "is_mismatch": true,
    "confidence": 0.87,
    "explanation": "Anchor says 'Pricing' but destination is a blog article about CBD"
  }
]
```

---

### Step 4: Issue Creation

**For each mismatch, creates:**
```javascript
{
  issue_type: "LINK_INTENT_MISMATCH",
  url: "https://example.com/blog/post-1",  // Source page
  explanation: "Anchor says 'Pricing' but destination is a blog article about CBD",
  evidence: {
    anchor_text: "View Pricing",
    destination_url: "https://example.com/blog/cbd-benefits",
    destination_title: "CBD Benefits Guide",
    destination_h1: "Everything About CBD Benefits",
    confidence: 0.87
  }
}
```

---

## Output Files

When AI runs, the following files are written to `outputs/<auditId>/`:

### `intent-objects.json`
All intent objects built from content links:
```json
{
  "generated": "2026-01-30T...",
  "total": 150,
  "objects": [
    {
      "source_url": "...",
      "anchor_text": "...",
      "destination_url": "...",
      "destination_title": "...",
      "destination_h1": "...",
      "destination_meta": "...",
      "link_key": "..."
    }
  ]
}
```

### `ai-results.json`
AI classification results:
```json
{
  "generated": "2026-01-30T...",
  "total": 150,
  "mismatches": 3,
  "aligned": 147,
  "results": [
    {
      "link_key": "...",
      "source_url": "...",
      "anchor_text": "...",
      "is_mismatch": true,
      "confidence": 0.87,
      "explanation": "..."
    }
  ]
}
```

### `full-result.json`
Contains `LINK_INTENT_MISMATCH` issues in the `issues` array.

---

## Debugging

### Enable Debug Logging

The logger automatically shows debug output. Look for these log prefixes:
- `[AI_SERVICE]` — AI client initialization and API calls
- `[INTENT_PIPELINE]` — Pipeline steps and progress

### Sample Log Output (Success)

```
[AI_SERVICE] ═══════════════════════════════════════════════════════════
[AI_SERVICE]               AI SERVICE INITIALIZATION                     
[AI_SERVICE] ═══════════════════════════════════════════════════════════
[AI_SERVICE] ✓ ANTHROPIC_API_KEY found
[AI_SERVICE]   Model: claude-3-5-haiku-latest
[AI_SERVICE]   Max tokens: 1024
[AI_SERVICE]   Final status: ✓ ENABLED

[INTENT_PIPELINE] ═══════════════════════════════════════════════════════════
[INTENT_PIPELINE]             LINK INTENT PIPELINE - STARTING                 
[INTENT_PIPELINE] ═══════════════════════════════════════════════════════════
[INTENT_PIPELINE] ✓ AI service is enabled

[INTENT_PIPELINE] STEP 1/5: Collecting content links from all pages...
[INTENT_PIPELINE]   Pages with content links: 45/100
[INTENT_PIPELINE] ✓ Collected 287 content links

[INTENT_PIPELINE] STEP 2/5: Building intent objects (adding destination metadata)...
[INTENT_PIPELINE]   Successfully built: 245
[INTENT_PIPELINE]   Skipped (not crawled): 30
[INTENT_PIPELINE]   Skipped (no metadata): 12
[INTENT_PIPELINE] ✓ Built 245 intent objects

[INTENT_PIPELINE] STEP 3/5: Deduplicating intent objects by link_key...
[INTENT_PIPELINE] ✓ Deduplicated: 245 → 180 (removed 65 duplicates)

[INTENT_PIPELINE] STEP 4/5: Sending to AI for classification...
[INTENT_PIPELINE]   Workers: 5
[INTENT_PIPELINE]   Batch size: 5
[INTENT_PIPELINE]   Total batches: 36
[AI_SERVICE] ──── AI REQUEST: 5 links ────
[AI_SERVICE] ──── AI RESPONSE: 5 results, 1 mismatches ────
... (more batches)
[INTENT_PIPELINE] ✓ AI classification complete in 12.34s
[INTENT_PIPELINE]   Total results: 180
[INTENT_PIPELINE]   Mismatches found: 7
[INTENT_PIPELINE]   Aligned links: 173

[INTENT_PIPELINE] STEP 5/5: Creating issues from mismatches...

[INTENT_PIPELINE] ═══════════════════════════════════════════════════════════
[INTENT_PIPELINE]         PIPELINE COMPLETE: 7 ISSUES FOUND
[INTENT_PIPELINE] ═══════════════════════════════════════════════════════════

[INTENT_PIPELINE] MISMATCH SUMMARY:
[INTENT_PIPELINE]   ⚠️  "View Pricing" → https://example.com/blog/cbd-guide
[INTENT_PIPELINE]       Confidence: 87%
```

### Common Issues

**No content links found:**
```
[INTENT_PIPELINE] ⚠️  No content links found across all pages
[INTENT_PIPELINE] This could mean:
[INTENT_PIPELINE]   - No <main>/<article> elements on pages
[INTENT_PIPELINE]   - All links are in nav/header/footer
[INTENT_PIPELINE]   - Pages have no internal links
```
→ Check if pages have `<main>` or `<article>` elements

**API key not configured:**
```
[AI_SERVICE] ✗ ANTHROPIC_API_KEY not configured
[AI_SERVICE]   AI analysis will be disabled
```
→ Add `ANTHROPIC_API_KEY=sk-ant-xxx` to `.env`

**Rate limited:**
```
[AI_SERVICE] ──── AI REQUEST FAILED ────
[AI_SERVICE]   Error: 429 Too Many Requests
[AI_SERVICE]   → Rate limited - too many requests
```
→ Wait and retry, or reduce batch frequency

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (none) | Required for AI analysis |
| `ENABLE_AI_ANALYSIS` | `true` | Set to `false` to disable |

### Pipeline Settings

In `src/pipelines/linkIntentPipeline.js`:
```javascript
this.workerCount = 5;  // Concurrent AI requests
this.batchSize = 5;    // Links per AI request
```

### AI Model Settings

In `src/utils/aiService.js`:
```javascript
this.model = 'claude-3-5-haiku-latest';  // Fast, cheap
this.maxTokens = 1024;                    // Response limit
```

---

## Architecture Summary

```
┌──────────────────────┐
│     HTMLParser       │
│  extractContentLinks │◄── Only content area links
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      PageData        │
│ content_internal_    │◄── Stored during crawl
│      links[]         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  LinkIntentPipeline  │
│  - Collect links     │
│  - Build objects     │◄── Add destination metadata
│  - Deduplicate       │
│  - Batch & send      │
│  - Create issues     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     AIService        │
│  Claude Haiku 3.5    │◄── is_mismatch + confidence
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   IssueDetector      │
│  LINK_INTENT_        │◄── Added to issues array
│     MISMATCH         │
└──────────────────────┘
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/crawler/htmlParser.js` | `extractContentLinks()` method |
| `src/crawler/pageData.js` | `content_internal_links` field |
| `src/crawler/crawler.js` | Stores content links during crawl |
| `src/utils/aiService.js` | Anthropic API wrapper |
| `src/pipelines/linkIntentPipeline.js` | Orchestrates AI analysis |
| `src/detectors/issueDetector.js` | `detectLinkIntentMismatch()` method |
| `src/auditor.js` | Passes AI service to detector |
