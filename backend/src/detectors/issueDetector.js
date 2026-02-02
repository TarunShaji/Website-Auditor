import { HTTPClient } from '../utils/httpClient.js';
import { Logger } from '../utils/logger.js';
import { LinkIntentPipeline } from '../pipelines/linkIntentPipeline.js';
import { PageIntentPipeline } from '../pipelines/pageIntentPipeline.js';

export class IssueDetector {
  constructor(pages, sitemapURLs, seedURL, normalizer, robotsParser, aiService = null, outputWriter = null, auditId = null) {
    this.pages = pages;
    this.sitemapURLs = new Set(sitemapURLs);
    this.seedURL = seedURL;
    this.normalizer = normalizer;
    this.robotsParser = robotsParser;
    this.aiService = aiService;
    this.outputWriter = outputWriter;
    this.auditId = auditId;
    this.issues = [];
    this.logger = new Logger('ISSUE_DETECTOR');

    this.logger.info('Issue detector initialized', {
      totalPages: pages.length,
      sitemapURLs: sitemapURLs.length,
      aiEnabled: aiService?.isEnabled() || false
    });
  }

  async detectAll() {
    const aiEnabled = this.aiService?.isEnabled() || false;
    this.logger.info(`Starting issue detection (17 deterministic + ${aiEnabled ? '1 AI' : '0 AI'} checks)`);

    const detectionMethods = [
      { name: 'Broken Pages', fn: () => this.detectBrokenPages() },
      { name: 'Broken Internal Links', fn: () => this.detectBrokenInternalLinks() },
      { name: 'Broken External Links', fn: () => this.detectBrokenExternalLinks() },
      { name: 'Redirect Chains', fn: () => this.detectRedirectChains() },
      { name: 'Redirect Loops', fn: () => this.detectRedirectLoops() },
      { name: 'Blocked by Robots', fn: () => this.detectBlockedByRobots() },
      { name: 'Noindex Pages', fn: () => this.detectNoindexPages() },
      { name: 'Sitemap Orphans', fn: () => this.detectSitemapOrphans() },
      { name: 'Zero Incoming Links', fn: () => this.detectZeroIncomingLinks() },
      { name: 'Zero Outgoing Links', fn: () => this.detectZeroOutgoingLinks() },
      { name: 'Missing Title', fn: () => this.detectMissingTitle() },
      { name: 'Duplicate Title', fn: () => this.detectDuplicateTitle() },
      { name: 'Missing H1', fn: () => this.detectMissingH1() },
      { name: 'Multiple H1', fn: () => this.detectMultipleH1() },
      { name: 'Mixed Content', fn: () => this.detectMixedContent() },
      { name: 'Duplicate Meta Description', fn: () => this.detectDuplicateMetaDescription() },
      { name: 'Resources Blocked by Robots', fn: () => this.detectResourcesBlockedByRobots() },
      { name: 'Link Intent Mismatch (AI)', fn: () => this.detectLinkIntentMismatch() },
      { name: 'Page Intent Issues (AI)', fn: () => this.detectPageIntentIssues() }
    ];

    for (const { name, fn } of detectionMethods) {
      const beforeCount = this.issues.length;
      await fn();
      const foundCount = this.issues.length - beforeCount;
      if (foundCount > 0) {
        this.logger.warn(`${name}: ${foundCount} issue(s) found`);
      } else {
        this.logger.info(`${name}: No issues found`);
      }
    }

    this.logger.success('Issue detection complete', {
      totalIssues: this.issues.length
    });

    return this.issues;
  }

  detectBrokenPages() {
    for (const page of this.pages) {
      if (page.http_status >= 400) {
        this.issues.push({
          issue_type: 'BROKEN_PAGE',
          url: page.url,
          explanation: `Page returns HTTP ${page.http_status} status code`,
          evidence: {
            http_status: page.http_status
          }
        });
      }
    }
  }

  detectBrokenInternalLinks() {
    const pageStatusMap = new Map();
    for (const page of this.pages) {
      pageStatusMap.set(page.normalized_url, page.http_status);
    }

    for (const page of this.pages) {
      for (const link of page.internal_outgoing_links) {
        const targetStatus = pageStatusMap.get(link);
        if (targetStatus && targetStatus >= 400) {
          this.issues.push({
            issue_type: 'BROKEN_INTERNAL_LINK',
            url: page.url,
            explanation: `Page links to broken internal page: ${link}`,
            evidence: {
              source_url: page.url,
              target_url: link,
              target_status: targetStatus
            }
          });
        }
      }
    }
  }

  async detectBrokenExternalLinks() {
    // TEMPORARY: Disabled (can take hours on large sites)
    this.logger.info('Broken External Links: Detection disabled (testing)');
    return;

    const externalLinks = new Map();

    for (const page of this.pages) {
      for (const link of page.external_outgoing_links) {
        if (!externalLinks.has(link)) {
          externalLinks.set(link, []);
        }
        externalLinks.get(link).push(page.url);
      }
    }

    for (const [link, sources] of externalLinks.entries()) {
      try {
        const response = await HTTPClient.fetch(link, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Verisite-Auditor/1.0' },
          timeout: 5000
        });

        if (response.status >= 400) {
          for (const sourceURL of sources) {
            this.issues.push({
              issue_type: 'BROKEN_EXTERNAL_LINK',
              url: sourceURL,
              explanation: `Page links to broken external page: ${link}`,
              evidence: {
                source_url: sourceURL,
                target_url: link,
                target_status: response.status
              }
            });
          }
        }
      } catch (error) {
        for (const sourceURL of sources) {
          this.issues.push({
            issue_type: 'BROKEN_EXTERNAL_LINK',
            url: sourceURL,
            explanation: `Page links to unreachable external page: ${link}`,
            evidence: {
              source_url: sourceURL,
              target_url: link,
              error: 'timeout or network error'
            }
          });
        }
      }
    }
  }

  detectRedirectChains() {
    for (const page of this.pages) {
      if (page.redirect_chain.length > 1) {
        this.issues.push({
          issue_type: 'REDIRECT_CHAIN',
          url: page.url,
          explanation: `Page has redirect chain of length ${page.redirect_chain.length}`,
          evidence: {
            redirect_chain: [...page.redirect_chain, page.final_url],
            chain_length: page.redirect_chain.length
          }
        });
      }
    }
  }

  detectRedirectLoops() {
    for (const page of this.pages) {
      if (page.redirect_chain.length > 0) {
        const seen = new Set();
        let hasLoop = false;

        for (const url of page.redirect_chain) {
          if (seen.has(url)) {
            hasLoop = true;
            break;
          }
          seen.add(url);
        }

        if (hasLoop || (page.final_url && seen.has(page.final_url))) {
          this.issues.push({
            issue_type: 'REDIRECT_LOOP',
            url: page.url,
            explanation: 'Page has redirect loop',
            evidence: {
              redirect_chain: [...page.redirect_chain, page.final_url]
            }
          });
        }
      }
    }
  }

  detectBlockedByRobots() {
    for (const page of this.pages) {
      if (page.blocked_by_robots) {
        this.issues.push({
          issue_type: 'BLOCKED_BY_ROBOTS',
          url: page.url,
          explanation: 'Page is blocked by robots.txt',
          evidence: {
            blocked: true,
            rule: page.blocked_by_robots_rule
          }
        });
      }
    }
  }

  detectNoindexPages() {
    for (const page of this.pages) {
      const hasMetaNoindex = page.meta_robots && page.meta_robots.includes('noindex');
      const hasXRobotsNoindex = page.x_robots_tag && page.x_robots_tag.includes('noindex');

      if (hasMetaNoindex || hasXRobotsNoindex) {
        this.issues.push({
          issue_type: 'NOINDEX_PAGE',
          url: page.url,
          explanation: 'Page is marked as noindex',
          evidence: {
            meta_robots: page.meta_robots,
            x_robots_tag: page.x_robots_tag
          }
        });
      }
    }
  }

  detectSitemapOrphans() {
    const crawledURLs = new Set(this.pages.map(p => p.normalized_url));

    for (const sitemapURL of this.sitemapURLs) {
      if (!crawledURLs.has(sitemapURL)) {
        this.issues.push({
          issue_type: 'SITEMAP_ORPHAN',
          url: sitemapURL,
          explanation: 'Page is in sitemap but not reachable via internal links',
          evidence: {
            in_sitemap: true,
            crawled: false
          }
        });
      }
    }
  }

  detectZeroIncomingLinks() {
    const normalizedSeed = this.normalizer.normalize(this.seedURL);

    for (const page of this.pages) {
      if (page.resource_type !== 'PAGE') continue;

      if (page.incoming_internal_link_count === 0 &&
        page.normalized_url !== normalizedSeed &&
        !page.blocked_by_robots) {
        this.issues.push({
          issue_type: 'ZERO_INCOMING_LINKS',
          url: page.url,
          explanation: 'Page has zero incoming internal links',
          evidence: {
            incoming_internal_link_count: 0
          }
        });
      }
    }
  }

  detectZeroOutgoingLinks() {
    for (const page of this.pages) {
      if (page.resource_type !== 'PAGE') continue;

      if (page.internal_outgoing_links.length === 0 && page.http_status === 200) {
        this.issues.push({
          issue_type: 'ZERO_OUTGOING_LINKS',
          url: page.url,
          explanation: 'Page has zero outgoing internal links (dead-end page)',
          evidence: {
            internal_outgoing_links_count: 0
          }
        });
      }
    }
  }

  detectMissingTitle() {
    for (const page of this.pages) {
      if (page.resource_type !== 'PAGE') continue;

      if (page.http_status === 200 && (!page.title || page.title.trim() === '')) {
        this.issues.push({
          issue_type: 'MISSING_TITLE',
          url: page.url,
          explanation: 'Page is missing <title> tag',
          evidence: {
            title: page.title
          }
        });
      }
    }
  }

  detectDuplicateTitle() {
    const titleMap = new Map();

    for (const page of this.pages) {
      if (page.resource_type !== 'PAGE') continue;

      if (page.http_status === 200 && page.title && page.title.trim() !== '') {
        if (!titleMap.has(page.title)) {
          titleMap.set(page.title, []);
        }
        titleMap.get(page.title).push(page.url);
      }
    }

    for (const [title, urls] of titleMap.entries()) {
      if (urls.length > 1) {
        for (const url of urls) {
          this.issues.push({
            issue_type: 'DUPLICATE_TITLE',
            url: url,
            explanation: `Page has duplicate title: "${title}"`,
            evidence: {
              title: title,
              duplicate_count: urls.length,
              all_urls: urls
            }
          });
        }
      }
    }
  }

  detectMissingH1() {
    for (const page of this.pages) {
      if (page.resource_type !== 'PAGE') continue;

      if (page.http_status === 200 && page.h1s.length === 0) {
        this.issues.push({
          issue_type: 'MISSING_H1',
          url: page.url,
          explanation: 'Page is missing <h1> tag',
          evidence: {
            h1_count: 0
          }
        });
      }
    }
  }

  detectMultipleH1() {
    for (const page of this.pages) {
      if (page.resource_type !== 'PAGE') continue;

      if (page.http_status === 200 && page.h1s.length > 1) {
        this.issues.push({
          issue_type: 'MULTIPLE_H1',
          url: page.url,
          explanation: `Page has ${page.h1s.length} <h1> tags`,
          evidence: {
            h1_count: page.h1s.length,
            h1s: page.h1s
          }
        });
      }
    }
  }

  detectMixedContent() {
    // Disabled: resources.images/scripts/stylesheets removed from output to reduce file size
    // from 392 MB to 1 MB. Mixed content detection requires full resource URLs which are
    // no longer stored. Re-enable if resources are added back to PageData output.
    return;
  }

  detectDuplicateMetaDescription() {
    const descriptionMap = new Map();

    for (const page of this.pages) {
      if (page.resource_type !== 'PAGE') continue;

      if (page.http_status === 200 && page.meta_description && page.meta_description.trim() !== '') {
        if (!descriptionMap.has(page.meta_description)) {
          descriptionMap.set(page.meta_description, []);
        }
        descriptionMap.get(page.meta_description).push(page.url);
      }
    }

    for (const [metaDescription, urls] of descriptionMap.entries()) {
      if (urls.length > 1) {
        this.issues.push({
          issue_type: 'DUPLICATE_META_DESCRIPTION',
          meta_description: metaDescription,
          affected_urls: urls,
          explanation: 'Multiple pages declare the same meta description.'
        });
      }
    }
  }

  detectResourcesBlockedByRobots() {
    // Disabled: resources.scripts/stylesheets removed from output to reduce file size
    // This detector requires full resource URLs which are no longer stored
    // Re-enable if resources are added back to PageData output
    return;
  }

  /**
   * AI-powered Link Intent Mismatch Detection
   * Runs asynchronously after deterministic checks
   */
  async detectLinkIntentMismatch() {
    if (!this.aiService || !this.aiService.isEnabled()) {
      this.logger.info('AI service not enabled - skipping link intent mismatch detection');
      return;
    }

    this.logger.info('Starting AI-powered link intent mismatch detection');

    const pipeline = new LinkIntentPipeline(
      this.aiService,
      this.pages,
      this.outputWriter,
      this.auditId
    );

    const issues = await pipeline.run();
    this.issues.push(...issues);

    this.logger.info('Link intent mismatch detection complete', {
      issuesFound: issues.length
    });
  }

  /**
   * AI-powered Page Intent Issue Detection
   * Detects SOFT_404 and PAGE_INTENT_MISMATCH issues
   * Runs AFTER link intent mismatch detection (sequential, not concurrent)
   */
  async detectPageIntentIssues() {
    if (!this.aiService || !this.aiService.isEnabled()) {
      this.logger.info('AI service not enabled - skipping page intent issue detection');
      return;
    }

    this.logger.info('Starting AI-powered page intent issue detection');

    const pipeline = new PageIntentPipeline(
      this.aiService,
      this.pages,
      this.outputWriter,
      this.auditId
    );

    const issues = await pipeline.run();
    this.issues.push(...issues);

    this.logger.info('Page intent issue detection complete', {
      issuesFound: issues.length,
      soft404s: issues.filter(i => i.issue_type === 'SOFT_404').length,
      intentMismatches: issues.filter(i => i.issue_type === 'PAGE_INTENT_MISMATCH').length
    });
  }
}
