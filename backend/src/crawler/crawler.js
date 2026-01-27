import { PageData } from './pageData.js';
import { HTMLParser } from './htmlParser.js';
import { HTTPClient } from '../utils/httpClient.js';
import { Logger } from '../utils/logger.js';

export class Crawler {
  constructor(seedURL, normalizer, robotsParser, options = {}) {
    this.seedURL = seedURL;
    this.normalizer = normalizer;
    this.robotsParser = robotsParser;
    this.htmlParser = new HTMLParser(normalizer);
    this.logger = new Logger('CRAWLER');
    
    this.maxPages = options.maxPages || 100;
    this.maxDepth = options.maxDepth || 5;
    this.maxRedirects = options.maxRedirects || 5;
    this.timeout = options.timeout || 10000;
    
    this.queue = [];
    this.visited = new Set();
    this.pages = new Map();
    this.linkGraph = new Map();
    
    this.onProgress = options.onProgress || (() => {});
    
    this.logger.info('Crawler initialized', {
      seedURL,
      maxPages: this.maxPages,
      maxDepth: this.maxDepth,
      timeout: this.timeout
    });
  }

  async crawl() {
    const normalizedSeed = this.normalizer.normalize(this.seedURL);
    this.queue.push({ url: normalizedSeed, depth: 0 });
    
    this.logger.info('Starting crawl', { seedURL: normalizedSeed });
    
    let pageCount = 0;

    while (this.queue.length > 0 && pageCount < this.maxPages) {
      const { url, depth } = this.queue.shift();

      if (this.visited.has(url)) {
        this.logger.debug('Skipping already visited URL', { url });
        continue;
      }
      
      if (depth > this.maxDepth) {
        this.logger.debug('Skipping URL exceeding max depth', { url, depth, maxDepth: this.maxDepth });
        continue;
      }

      this.visited.add(url);
      
      this.logger.info(`Crawling [${pageCount}/${this.maxPages} pages]`, { 
        url, 
        depth,
        queueSize: this.queue.length 
      });
      
      this.onProgress({
        type: 'crawling',
        url: url,
        visited: this.visited.size,
        queued: this.queue.length,
        total: this.maxPages
      });

      const pageData = new PageData(url, url);

      if (!this.robotsParser.isAllowed(url)) {
        const rule = this.robotsParser.getDisallowRule(url);
        this.logger.warn('URL blocked by robots.txt', { url, rule });
        pageData.blocked_by_robots = true;
        pageData.blocked_by_robots_rule = rule;
        pageData.resource_type = 'PAGE';
        this.pages.set(url, pageData);
        pageCount++;
        continue;
      }

      await this.fetchPage(url, pageData, depth);
      this.pages.set(url, pageData);
      
      if (pageData.isPage()) {
        pageCount++;
        this.logger.debug('PAGE counted toward crawl budget', { url, pageCount });
      } else {
        this.logger.debug('RESOURCE not counted toward crawl budget', { url });
      }
    }

    const htmlPageCount = Array.from(this.pages.values()).filter(p => p.isPage()).length;
    const resourceCount = Array.from(this.pages.values()).filter(p => p.isResource()).length;

    this.logger.success('Crawl completed', {
      totalURLsVisited: this.visited.size,
      htmlPages: htmlPageCount,
      resources: resourceCount,
      queueRemaining: this.queue.length
    });

    this.logger.info('Building incoming link counts (PAGE URLs only)');
    this.buildIncomingLinkCounts();
    
    const result = {
      pages: Array.from(this.pages.values()).map(p => p.toJSON()),
      linkGraph: this.getLinkGraphData()
    };
    
    this.logger.success('Crawl data prepared', {
      totalURLs: result.pages.length,
      htmlPages: result.pages.filter(p => p.resource_type === 'PAGE').length,
      resources: result.pages.filter(p => p.resource_type === 'RESOURCE').length,
      linkGraphNodes: Object.keys(result.linkGraph).length
    });
    
    return result;
  }

  async fetchPage(url, pageData, depth) {
    try {
      this.logger.debug('Fetching page', { url });
      const response = await this.fetchWithRedirects(url, pageData);
      
      if (!response) {
        this.logger.error('Failed to fetch page (no response)', { url });
        pageData.resource_type = 'RESOURCE';
        return;
      }

      pageData.http_status = response.status;
      pageData.final_url = response.url;
      
      this.logger.info('Page fetched', { 
        url, 
        status: response.status,
        finalURL: response.url,
        redirects: pageData.redirect_chain.length
      });

      response.headers.forEach((value, key) => {
        pageData.headers[key] = value;
        if (key.toLowerCase() === 'x-robots-tag') {
          pageData.x_robots_tag = value.toLowerCase();
          this.logger.debug('X-Robots-Tag detected', { url, value });
        }
      });

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.toLowerCase().startsWith('text/html')) {
        pageData.resource_type = 'PAGE';
        this.logger.debug('Classified as PAGE (HTML)', { url, contentType });
      } else {
        pageData.resource_type = 'RESOURCE';
        this.logger.debug('Classified as RESOURCE (non-HTML)', { url, contentType });
        return;
      }

      const html = await response.text();
      this.logger.debug('Parsing HTML', { url, htmlLength: html.length });
      const parsed = this.htmlParser.parse(html, pageData.final_url);

      pageData.title = parsed.title;
      pageData.h1s = parsed.h1s;
      pageData.meta_robots = parsed.meta_robots;
      pageData.meta_description = parsed.meta_description;
      pageData.resources = parsed.resources;
      
      this.logger.info('Page parsed', {
        url,
        title: parsed.title,
        h1Count: parsed.h1s.length,
        linksFound: parsed.links.length,
        metaRobots: parsed.meta_robots
      });

      let internalLinksAdded = 0;
      for (const link of parsed.links) {
        if (link.isInternal) {
          pageData.internal_outgoing_links.push(link.normalized);
          
          this.recordLink(pageData.normalized_url, link.normalized);

          if (!this.visited.has(link.normalized) && 
              !this.queue.some(item => item.url === link.normalized)) {
            this.queue.push({ url: link.normalized, depth: depth + 1 });
            internalLinksAdded++;
          }
        } else {
          pageData.external_outgoing_links.push(link.normalized);
        }
      }
      
      this.logger.debug('Links processed', {
        url,
        internalLinks: pageData.internal_outgoing_links.length,
        externalLinks: pageData.external_outgoing_links.length,
        newLinksQueued: internalLinksAdded
      });

    } catch (error) {
      this.logger.error('Error fetching page', { url, error: error.message });
      pageData.http_status = 0;
      pageData.resource_type = 'RESOURCE';
    }
  }

  async fetchWithRedirects(url, pageData, redirectCount = 0) {
    if (redirectCount > this.maxRedirects) {
      this.logger.warn('Max redirects exceeded', { url, redirectCount });
      return null;
    }

    try {
      const response = await HTTPClient.fetch(url, {
        headers: {
          'User-Agent': 'Verisite-Auditor/1.0'
        },
        timeout: this.timeout
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          this.logger.warn('Redirect without location header', { url, status: response.status });
          return response;
        }

        const redirectURL = this.normalizer.normalize(location, url);
        if (!redirectURL) {
          this.logger.warn('Invalid redirect URL', { url, location });
          return response;
        }

        pageData.redirect_chain.push(url);
        this.logger.debug('Following redirect', { 
          from: url, 
          to: redirectURL, 
          status: response.status,
          redirectCount: redirectCount + 1
        });

        if (pageData.redirect_chain.includes(redirectURL)) {
          pageData.redirect_chain.push(redirectURL);
          this.logger.error('Redirect loop detected', { 
            url, 
            redirectURL,
            chain: pageData.redirect_chain 
          });
          return null;
        }

        return this.fetchWithRedirects(redirectURL, pageData, redirectCount + 1);
      }

      return response;
    } catch (error) {
      this.logger.error('HTTP request failed', { url, error: error.message });
      return null;
    }
  }

  recordLink(sourceURL, targetURL) {
    if (!this.linkGraph.has(sourceURL)) {
      this.linkGraph.set(sourceURL, new Set());
    }
    this.linkGraph.get(sourceURL).add(targetURL);
  }

  buildIncomingLinkCounts() {
    const incomingCounts = new Map();

    for (const [source, targets] of this.linkGraph.entries()) {
      for (const target of targets) {
        incomingCounts.set(target, (incomingCounts.get(target) || 0) + 1);
      }
    }

    let orphanCount = 0;
    let pageOnlyCount = 0;
    
    for (const [url, pageData] of this.pages.entries()) {
      if (pageData.isPage()) {
        const count = incomingCounts.get(url) || 0;
        pageData.incoming_internal_link_count = count;
        pageOnlyCount++;
        if (count === 0 && url !== this.normalizer.normalize(this.seedURL)) {
          orphanCount++;
        }
      } else {
        pageData.incoming_internal_link_count = 0;
      }
    }
    
    this.logger.info('Incoming link counts built (PAGE URLs only)', {
      htmlPages: pageOnlyCount,
      pagesWithNoIncomingLinks: orphanCount
    });
  }

  getLinkGraphData() {
    const graph = {};
    for (const [source, targets] of this.linkGraph.entries()) {
      graph[source] = Array.from(targets);
    }
    return graph;
  }
}
