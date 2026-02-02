import { PageData } from './pageData.js';
import { HTMLParser } from './htmlParser.js';
import { HTTPClient } from '../utils/httpClient.js';
import { Logger } from '../utils/logger.js';

/**
 * SitemapFetcher - Fetches sitemap-only URLs without affecting link graph
 * 
 * This class runs AFTER the spider crawl to fetch URLs that exist in sitemap
 * but were not discovered by the BFS crawler (sitemap orphans).
 * 
 * CRITICAL DESIGN CONSTRAINTS:
 * - Does NOT queue discovered links (no BFS propagation)
 * - Does NOT call recordLink() (no link graph modification)
 * - Does NOT affect incoming_internal_link_count
 * - DOES extract SEO metadata for issue detection
 * - DOES extract content_internal_links for AI analysis
 * - Sets discovery_method = 'SITEMAP_ONLY'
 */
export class SitemapFetcher {
    constructor(normalizer, robotsParser, options = {}) {
        this.normalizer = normalizer;
        this.robotsParser = robotsParser;
        this.htmlParser = new HTMLParser(normalizer);
        this.logger = new Logger('SITEMAP_FETCHER');

        this.timeout = options.timeout || 10000;
        this.maxRedirects = options.maxRedirects || 5;
        this.onProgress = options.onProgress || (() => { });

        this.logger.info('SitemapFetcher initialized');
    }

    /**
     * Fetch all sitemap-only URLs and return PageData objects
     * @param {string[]} urls - Array of sitemap URLs not visited by spider
     * @returns {Promise<PageData[]>} Array of PageData objects
     */
    async fetchSitemapOnlyPages(urls) {
        this.logger.info('═══════════════════════════════════════════════════════════');
        this.logger.info('         SITEMAP-ONLY FETCH PHASE - STARTING');
        this.logger.info('═══════════════════════════════════════════════════════════');
        this.logger.info(`  URLs to fetch: ${urls.length}`);

        const pages = [];
        let fetchedCount = 0;
        let skippedRobots = 0;
        let errorCount = 0;

        for (const url of urls) {
            fetchedCount++;

            this.logger.info(`Fetching sitemap URL [${fetchedCount}/${urls.length}]`, { url });

            this.onProgress({
                type: 'sitemap_fetch',
                url: url,
                fetched: fetchedCount,
                total: urls.length
            });

            const pageData = new PageData(url, url);
            pageData.discovery_method = 'SITEMAP_ONLY';

            // Check robots.txt
            if (!this.robotsParser.isAllowed(url)) {
                const rule = this.robotsParser.getDisallowRule(url);
                this.logger.warn('URL blocked by robots.txt', { url, rule });
                pageData.blocked_by_robots = true;
                pageData.blocked_by_robots_rule = rule;
                pageData.resource_type = 'PAGE';
                pages.push(pageData);
                skippedRobots++;
                continue;
            }

            // Fetch the page
            try {
                await this.fetchPage(url, pageData);
                pages.push(pageData);
            } catch (error) {
                this.logger.error('Error fetching sitemap URL', { url, error: error.message });
                pageData.fetch_error = 'exception_during_fetch';
                pageData.resource_type = 'PAGE';
                pages.push(pageData);
                errorCount++;
            }
        }

        const htmlPages = pages.filter(p => p.resource_type === 'PAGE').length;
        const resources = pages.filter(p => p.resource_type === 'RESOURCE').length;

        this.logger.info('═══════════════════════════════════════════════════════════');
        this.logger.success('         SITEMAP-ONLY FETCH PHASE - COMPLETE');
        this.logger.info('═══════════════════════════════════════════════════════════');
        this.logger.info(`  Total fetched: ${fetchedCount}`);
        this.logger.info(`  HTML pages: ${htmlPages}`);
        this.logger.info(`  Resources: ${resources}`);
        this.logger.info(`  Blocked by robots: ${skippedRobots}`);
        this.logger.info(`  Errors: ${errorCount}`);

        return pages;
    }

    /**
     * Fetch a single page and populate PageData
     * Similar to Crawler.fetchPage but WITHOUT link queuing or graph recording
     */
    async fetchPage(url, pageData) {
        this.logger.debug('Fetching page', { url });
        const response = await this.fetchWithRedirects(url, pageData);

        // Fetch failed
        if (!response) {
            this.logger.warn('Fetch failed', {
                url,
                redirectChain: pageData.redirect_chain,
                fetchError: pageData.fetch_error
            });
            pageData.resource_type = 'PAGE';
            if (!pageData.fetch_error) {
                pageData.fetch_error = 'unknown_fetch_failure';
            }
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

        // Extract headers
        response.headers.forEach((value, key) => {
            pageData.headers[key] = value;
            if (key.toLowerCase() === 'x-robots-tag') {
                pageData.x_robots_tag = value.toLowerCase();
            }
        });

        const contentType = response.headers.get('content-type') || '';

        // Classify by Content-Type
        if (contentType.toLowerCase().startsWith('text/html')) {
            pageData.resource_type = 'PAGE';
            this.logger.info('✓ Classified as PAGE (HTML)', { url, contentType });
        } else {
            pageData.resource_type = 'RESOURCE';
            this.logger.info('✓ Classified as RESOURCE (non-HTML)', { url, contentType });
            return;
        }

        // Parse HTML
        const html = await response.text();
        this.logger.debug('Parsing HTML', { url, htmlLength: html.length });
        const parsed = this.htmlParser.parse(html, pageData.final_url);

        pageData.html = html;
        pageData.title = parsed.title;
        pageData.h1s = parsed.h1s;
        pageData.meta_robots = parsed.meta_robots;
        pageData.meta_description = parsed.meta_description;
        pageData.resources = parsed.resources;
        pageData.content_internal_links = parsed.content_links || [];

        // Extract links for metadata BUT DO NOT QUEUE OR RECORD
        // This is the key difference from Crawler.fetchPage
        for (const link of parsed.links) {
            if (link.isInternal) {
                pageData.internal_outgoing_links.push(link.normalized);
                // ❌ NO: this.recordLink(url, link.normalized);
                // ❌ NO: this.queue.push(link.normalized);
            } else {
                pageData.external_outgoing_links.push(link.normalized);
            }
        }

        this.logger.info('Page parsed (sitemap-only)', {
            url,
            title: parsed.title,
            h1Count: parsed.h1s.length,
            linksFound: parsed.links.length,
            metaRobots: parsed.meta_robots
        });
    }

    /**
     * Fetch with redirect following
     * Same logic as Crawler.fetchWithRedirects
     */
    async fetchWithRedirects(url, pageData, redirectCount = 0) {
        if (redirectCount > this.maxRedirects) {
            this.logger.warn('Max redirects exceeded', { url, redirectCount });
            pageData.fetch_error = 'max_redirects_exceeded';
            return null;
        }

        try {
            this.logger.debug('Fetching URL', { url, redirectCount });

            const response = await HTTPClient.fetch(url, {
                headers: { 'User-Agent': 'Verisite-Auditor/1.0' },
                timeout: this.timeout
            });

            this.logger.debug('HTTP response received', {
                url,
                status: response.status,
                contentType: response.headers.get('content-type') || 'unknown'
            });

            // Handle redirects
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');

                if (!location) {
                    this.logger.warn('Redirect without location header', { url, status: response.status });
                    return response;
                }

                let redirectURL;
                try {
                    redirectURL = new URL(location, url).href;
                } catch (e) {
                    this.logger.warn('Invalid redirect URL', { url, location });
                    return response;
                }

                pageData.redirect_chain.push(url);
                this.logger.debug('Following redirect', {
                    from: url,
                    to: redirectURL,
                    status: response.status
                });

                return this.fetchWithRedirects(redirectURL, pageData, redirectCount + 1);
            }

            return response;
        } catch (error) {
            this.logger.error('HTTP request failed', { url, error: error.message });
            pageData.fetch_error = 'network_error';
            return null;
        }
    }
}
