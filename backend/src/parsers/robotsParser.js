import { HTTPClient } from '../utils/httpClient.js';
import { CustomRobotsParser } from './customRobotsParser.js';
import { Logger } from '../utils/logger.js';

export class RobotsParser {
  constructor() {
    this.robots = null;
    this.robotsTxtContent = null;
    this.logger = new Logger('ROBOTS_PARSER');
  }

  async fetch(baseURL) {
    try {
      const robotsURL = new URL('/robots.txt', baseURL).href;
      this.logger.info('Fetching robots.txt', { url: robotsURL });
      
      const response = await HTTPClient.fetch(robotsURL, {
        headers: { 'User-Agent': 'Verisite-Auditor/1.0' }
      });

      if (response.ok) {
        this.robotsTxtContent = await response.text();
        this.robots = new CustomRobotsParser(this.robotsTxtContent, 'Verisite-Auditor');
        this.logger.success('robots.txt fetched and parsed', { 
          contentLength: this.robotsTxtContent.length,
          hasDisallowRules: this.robotsTxtContent.includes('Disallow:')
        });
        return true;
      }
      
      this.logger.warn('robots.txt not found or inaccessible', { 
        status: response.status,
        url: robotsURL 
      });
      this.robots = new CustomRobotsParser('', 'Verisite-Auditor');
      return false;
    } catch (error) {
      this.logger.error('Failed to fetch robots.txt', { error: error.message });
      this.robots = new CustomRobotsParser('', 'Verisite-Auditor');
      return false;
    }
  }

  isAllowed(url, userAgent = 'Verisite-Auditor') {
    if (!this.robots) {
      return true;
    }
    return this.robots.isAllowed(url);
  }

  getDisallowRule(url, userAgent = 'Verisite-Auditor') {
    if (!this.robots) {
      return null;
    }
    return this.robots.getDisallowRule(url);
  }
}

