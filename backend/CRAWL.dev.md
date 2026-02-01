# Crawler Developer Documentation

> **DUMB CRAWLER:** No canonicalization, no normalization, no AI. Uses exact raw URLs for everything.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CRAWLER (DUMB)                          │
│  • Uses RAW URLs everywhere                                 │
│  • Exact string matching for deduplication                  │
│  • Follows ALL redirects (no loop detection)                │
│  • Records facts only                                       │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   ISSUE DETECTOR (Deterministic)            │
│  • 17 checks (no AI)                                        │
│  • Analyzes crawl data                                      │
│  • Detects SEO issues                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Crawl Flow

1. **Start** with raw `seedURL`
2. **Pop** URL from queue
3. **Skip** if exact URL already in `visited` set
4. **Fetch** URL → follow redirects → record chain
5. **Classify** by Content-Type (`PAGE` or `RESOURCE`)
6. **Parse** HTML → extract links
7. **Queue** new internal links (raw, exact match dedup)
8. **Repeat** until done

---

## fetchWithRedirects() — Dumb Fetcher

**Lines:** [crawler.js:232-298](file:///Users/tarunshaji/Verisite/backend/src/crawler/crawler.js#L232-L298)

```javascript
// Follows ALL redirects until:
// 1. Non-3xx response (2xx, 4xx, 5xx)
// 2. maxRedirects exceeded

if (response.status >= 300 && response.status < 400) {
  pageData.redirect_chain.push(url);
  return fetchWithRedirects(locationURL, redirectCount + 1);
}
return response;
```

**No loop detection** → IssueDetector analyzes `redirect_chain` later

---

## Link Recording

```javascript
// DUMB: Uses raw URLs, no normalization
this.recordLink(url, link.normalized);

// Queue uses exact match
if (!this.visited.has(link.normalized)) {
  this.queue.push({ url: link.normalized });
}
```

---

## Issue Detection (17 Deterministic Checks)

| Issue Type | Detection |
|------------|-----------|
| BROKEN_PAGE | `http_status >= 400` |
| BROKEN_INTERNAL_LINK | Link target has 4xx/5xx |
| REDIRECT_CHAIN | `redirect_chain.length > 1` |
| REDIRECT_LOOP | Same URL appears twice in chain |
| BLOCKED_BY_ROBOTS | `blocked_by_robots === true` |
| NOINDEX_PAGE | `meta_robots` or `x_robots_tag` contains 'noindex' |
| SITEMAP_ORPHAN | In sitemap but not crawled |
| ZERO_INCOMING_LINKS | `incoming_internal_link_count === 0` |
| ZERO_OUTGOING_LINKS | No internal outgoing links |
| MISSING_TITLE | Empty or no `<title>` |
| DUPLICATE_TITLE | Same title on multiple pages |
| MISSING_H1 | No `<h1>` tags |
| MULTIPLE_H1 | More than one `<h1>` |
| DUPLICATE_META_DESCRIPTION | Same description on multiple pages |

---

## What Was Removed

| Removed | Why |
|---------|-----|
| `normalizeForCrawl()` | Caused URL mismatches |
| AI Service | Deterministic only |
| `detectLinkIntentMismatch()` | AI-dependent |
| Post-crawl URL filtering | Not needed |
| Canonical normalization | Crawler is dumb |

---

## Key Principle

**The crawler records exactly what the server returns. No interpretation, no normalization, no canonicalization.**

All analysis happens in IssueDetector.
