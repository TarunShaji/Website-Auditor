import { URLNormalizer } from './utils/urlNormalizer.js';
import { RobotsParser } from './parsers/robotsParser.js';
import { SitemapParser } from './parsers/sitemapParser.js';
import { Crawler } from './crawler/crawler.js';
import { SitemapFetcher } from './crawler/sitemapFetcher.js';
import { IssueDetector } from './detectors/issueDetector.js';
import { Logger } from './utils/logger.js';
import { OutputWriter } from './utils/outputWriter.js';
import { AIService } from './utils/aiService.js';

export class Auditor {
  constructor(seedURL, options = {}) {
    this.seedURL = seedURL;
    this.options = {
      maxPages: options.maxPages || 100,
      onProgress: options.onProgress || (() => { }),
      auditId: options.auditId || null,
      enableAI: options.enableAI !== false  // Default enabled
    };

    this.normalizer = new URLNormalizer(seedURL);
    this.robotsParser = new RobotsParser();
    this.sitemapParser = new SitemapParser(this.normalizer);
    this.logger = new Logger('AUDITOR');
    this.outputWriter = new OutputWriter();

    this.logger.info('Auditor initialized', {
      seedURL,
      maxPages: this.options.maxPages,
      auditId: this.options.auditId
    });
  }

  async audit() {
    const startTime = Date.now();

    try {
      this.logger.info('=== AUDIT STARTED ===');
      this.options.onProgress({ type: 'init', message: 'Starting audit...' });

      // ═══════════════════════════════════════════════════════════════════
      // PHASE 1: Fetch robots.txt
      // ═══════════════════════════════════════════════════════════════════
      this.logger.info('PHASE 1: Fetching robots.txt');
      this.options.onProgress({ type: 'robots', message: 'Fetching robots.txt...' });
      await this.robotsParser.fetch(this.seedURL);

      // ═══════════════════════════════════════════════════════════════════
      // PHASE 2: Fetch sitemap.xml
      // ═══════════════════════════════════════════════════════════════════
      this.logger.info('PHASE 2: Fetching sitemap.xml');
      this.options.onProgress({ type: 'sitemap', message: 'Fetching sitemap.xml...' });
      const sitemapURLs = await this.sitemapParser.fetch(this.seedURL);

      // ═══════════════════════════════════════════════════════════════════
      // PHASE 3: Spider crawl (BFS)
      // ═══════════════════════════════════════════════════════════════════
      this.logger.info('PHASE 3: Crawling website');
      this.options.onProgress({ type: 'crawl_start', message: 'Starting crawl...' });
      const crawler = new Crawler(
        this.seedURL,
        this.normalizer,
        this.robotsParser,
        {
          maxPages: this.options.maxPages,
          unlimited: this.options.unlimited,
          onProgress: this.options.onProgress
        }
      );

      const crawlResult = await crawler.crawl();

      // ═══════════════════════════════════════════════════════════════════
      // PHASE 3.5: Sitemap-only fetch (NEW)
      // Fetch URLs in sitemap but not visited by spider
      // Does NOT affect link graph or incoming link counts
      // ═══════════════════════════════════════════════════════════════════
      this.logger.info('PHASE 3.5: Fetching sitemap-only URLs');
      this.options.onProgress({ type: 'sitemap_fetch', message: 'Fetching sitemap-only URLs...' });

      // Identify sitemap URLs not visited by spider
      const spiderVisitedURLs = new Set(crawlResult.pages.map(p => p.url));
      const sitemapOnlyURLs = sitemapURLs.filter(url => !spiderVisitedURLs.has(url));

      this.logger.info('Sitemap orphans identified', {
        totalSitemapURLs: sitemapURLs.length,
        spiderVisited: spiderVisitedURLs.size,
        sitemapOnly: sitemapOnlyURLs.length
      });

      let sitemapOnlyPages = [];
      if (sitemapOnlyURLs.length > 0) {
        const sitemapFetcher = new SitemapFetcher(
          this.normalizer,
          this.robotsParser,
          { onProgress: this.options.onProgress }
        );
        const fetchedPages = await sitemapFetcher.fetchSitemapOnlyPages(sitemapOnlyURLs);
        sitemapOnlyPages = fetchedPages.map(p => p.toJSON());

        // Merge sitemap-only pages into crawl result (no overwrites)
        crawlResult.pages = [...crawlResult.pages, ...sitemapOnlyPages];

        this.logger.success('Sitemap-only pages merged', {
          sitemapOnlyCount: sitemapOnlyPages.length,
          totalPages: crawlResult.pages.length
        });
      } else {
        this.logger.info('No sitemap-only URLs to fetch');
      }

      // Write sitemap-fetch.json if we have an auditId
      if (this.options.auditId && sitemapOnlyURLs.length > 0) {
        const auditDir = this.outputWriter.createAuditDirectory(this.options.auditId);
        await this.outputWriter.writeSitemapFetchResult(auditDir, {
          generated: new Date().toISOString(),
          sitemap_urls_total: sitemapURLs.length,
          spider_visited_count: spiderVisitedURLs.size,
          sitemap_only_count: sitemapOnlyPages.length,
          sitemap_only_pages: sitemapOnlyPages
        });
      }

      // ═══════════════════════════════════════════════════════════════════
      // PHASE 4: Issue detection (deterministic + AI)
      // Now runs on ALL pages (spider + sitemap-only)
      // ═══════════════════════════════════════════════════════════════════
      this.logger.info('PHASE 4: Detecting issues');
      this.options.onProgress({ type: 'detect', message: 'Detecting issues...' });

      // Initialize AI service (modular - can be disabled)
      const aiService = new AIService({ enabled: this.options.enableAI });

      const detector = new IssueDetector(
        crawlResult.pages,
        sitemapURLs,
        this.seedURL,
        this.normalizer,
        this.robotsParser,
        aiService,
        this.outputWriter,
        this.options.auditId
      );

      const issues = await detector.detectAll();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.success('=== AUDIT COMPLETED ===', {
        duration: `${duration}s`,
        pagesCrawled: crawlResult.pages.length,
        issuesFound: issues.length
      });

      this.options.onProgress({ type: 'complete', message: 'Audit complete!' });

      const result = {
        seed_url: this.seedURL,
        crawl_stats: {
          pages_crawled: crawlResult.pages.length,
          spider_pages: spiderVisitedURLs.size,
          sitemap_only_pages: sitemapOnlyPages.length,
          sitemap_urls: sitemapURLs.length,
          issues_found: issues.length,
          duration_seconds: parseFloat(duration)
        },
        pages: crawlResult.pages,
        sitemap_urls: sitemapURLs,
        link_graph: crawlResult.linkGraph,
        issues: issues,
        issue_summary: this.summarizeIssues(issues)
      };

      this.logger.info('Audit result summary', {
        issueTypes: Object.keys(result.issue_summary).length,
        topIssues: Object.entries(result.issue_summary)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([type, count]) => `${type}: ${count}`)
      });

      if (this.options.auditId) {
        this.logger.info('Writing audit results to files');
        const outputPath = await this.outputWriter.writeAuditResults(
          this.options.auditId,
          result
        );
        result.output_path = outputPath;
        this.logger.success('Audit results saved to disk', { outputPath });
      }

      return result;
    } catch (error) {
      this.logger.error('=== AUDIT FAILED ===', {
        error: error.message,
        stack: error.stack
      });
      this.options.onProgress({
        type: 'error',
        message: `Audit failed: ${error.message}`
      });
      throw error;
    }
  }

  summarizeIssues(issues) {
    const summary = {};

    for (const issue of issues) {
      if (!summary[issue.issue_type]) {
        summary[issue.issue_type] = 0;
      }
      summary[issue.issue_type]++;
    }

    return summary;
  }
}

