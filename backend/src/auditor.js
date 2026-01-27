import { URLNormalizer } from './utils/urlNormalizer.js';
import { RobotsParser } from './parsers/robotsParser.js';
import { SitemapParser } from './parsers/sitemapParser.js';
import { Crawler } from './crawler/crawler.js';
import { IssueDetector } from './detectors/issueDetector.js';
import { Logger } from './utils/logger.js';
import { OutputWriter } from './utils/outputWriter.js';

export class Auditor {
  constructor(seedURL, options = {}) {
    this.seedURL = seedURL;
    this.options = {
      maxPages: options.maxPages || 100,
      maxDepth: options.maxDepth || 5,
      onProgress: options.onProgress || (() => {}),
      auditId: options.auditId || null
    };
    
    this.normalizer = new URLNormalizer(seedURL);
    this.robotsParser = new RobotsParser();
    this.sitemapParser = new SitemapParser(this.normalizer);
    this.logger = new Logger('AUDITOR');
    this.outputWriter = new OutputWriter();
    
    this.logger.info('Auditor initialized', {
      seedURL,
      maxPages: this.options.maxPages,
      maxDepth: this.options.maxDepth,
      auditId: this.options.auditId
    });
  }

  async audit() {
    const startTime = Date.now();
    
    try {
      this.logger.info('=== AUDIT STARTED ===');
      this.options.onProgress({ type: 'init', message: 'Starting audit...' });

      this.logger.info('PHASE 1: Fetching robots.txt');
      this.options.onProgress({ type: 'robots', message: 'Fetching robots.txt...' });
      await this.robotsParser.fetch(this.seedURL);

      this.logger.info('PHASE 2: Fetching sitemap.xml');
      this.options.onProgress({ type: 'sitemap', message: 'Fetching sitemap.xml...' });
      const sitemapURLs = await this.sitemapParser.fetch(this.seedURL);

      this.logger.info('PHASE 3: Crawling website');
      this.options.onProgress({ type: 'crawl_start', message: 'Starting crawl...' });
      const crawler = new Crawler(
        this.seedURL,
        this.normalizer,
        this.robotsParser,
        {
          maxPages: this.options.maxPages,
          maxDepth: this.options.maxDepth,
          onProgress: this.options.onProgress
        }
      );

      const crawlResult = await crawler.crawl();

      this.logger.info('PHASE 4: Detecting issues');
      this.options.onProgress({ type: 'detect', message: 'Detecting issues...' });
      const detector = new IssueDetector(
        crawlResult.pages,
        sitemapURLs,
        this.seedURL,
        this.normalizer,
        this.robotsParser
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
