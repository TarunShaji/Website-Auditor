import * as cheerio from 'cheerio';
import { HTTPClient } from '../utils/httpClient.js';
import { Logger } from '../utils/logger.js';

export class SitemapParser {
  constructor(normalizer) {
    this.normalizer = normalizer;
    this.sitemapURLs = new Set();
    this.logger = new Logger('SITEMAP_PARSER');
  }

  async fetch(baseURL) {
    try {
      const sitemapURL = new URL('/sitemap.xml', baseURL).href;
      this.logger.info('Fetching sitemap.xml', { url: sitemapURL });
      await this.parseSitemap(sitemapURL);
      this.logger.success('Sitemap parsing complete', { 
        totalURLs: this.sitemapURLs.size 
      });
      return Array.from(this.sitemapURLs);
    } catch (error) {
      this.logger.error('Failed to fetch sitemap', { error: error.message });
      return [];
    }
  }

  async parseSitemap(sitemapURL, depth = 0) {
    if (depth > 5) {
      this.logger.warn('Max sitemap depth exceeded', { url: sitemapURL, depth });
      return;
    }

    try {
      this.logger.debug('Parsing sitemap', { url: sitemapURL, depth });
      const response = await HTTPClient.fetch(sitemapURL, {
        headers: { 'User-Agent': 'Verisite-Auditor/1.0' }
      });

      if (!response.ok) {
        this.logger.warn('Sitemap not accessible', { 
          url: sitemapURL, 
          status: response.status 
        });
        return;
      }

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      const sitemapIndexURLs = $('sitemapindex > sitemap > loc');
      if (sitemapIndexURLs.length > 0) {
        this.logger.info('Sitemap index detected', { 
          url: sitemapURL, 
          childSitemaps: sitemapIndexURLs.length 
        });
        for (const elem of sitemapIndexURLs.toArray()) {
          const childSitemapURL = $(elem).text().trim();
          if (childSitemapURL) {
            await this.parseSitemap(childSitemapURL, depth + 1);
          }
        }
        return;
      }

      const urlElements = $('urlset > url > loc');
      this.logger.info('Sitemap URLs found', { 
        url: sitemapURL, 
        urlCount: urlElements.length 
      });
      
      for (const elem of urlElements.toArray()) {
        const url = $(elem).text().trim();
        if (url) {
          const normalized = this.normalizer.normalize(url);
          if (normalized) {
            this.sitemapURLs.add(normalized);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error parsing sitemap', { 
        url: sitemapURL, 
        error: error.message 
      });
      return;
    }
  }

  getURLs() {
    return Array.from(this.sitemapURLs);
  }
}
