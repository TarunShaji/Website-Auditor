import { URL } from 'url';

export class URLNormalizer {
  constructor(baseURL) {
    this.baseURL = new URL(baseURL);
    this.baseDomain = this.baseURL.hostname.toLowerCase();
  }

  normalize(urlString, currentPageURL = null) {
    try {
      let url;
      
      if (currentPageURL) {
        url = new URL(urlString, currentPageURL);
      } else {
        url = new URL(urlString, this.baseURL);
      }

      url.protocol = url.protocol.toLowerCase();
      url.hostname = url.hostname.toLowerCase();

      url.hash = '';

      if ((url.protocol === 'http:' && url.port === '80') ||
          (url.protocol === 'https:' && url.port === '443')) {
        url.port = '';
      }

      let pathname = url.pathname;
      if (pathname !== '/' && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      url.pathname = pathname;

      return url.href;
    } catch (e) {
      return null;
    }
  }

  isInternal(urlString) {
    try {
      const url = new URL(urlString);
      return url.hostname.toLowerCase() === this.baseDomain;
    } catch (e) {
      return false;
    }
  }

  isSameDomain(url1, url2) {
    try {
      const u1 = new URL(url1);
      const u2 = new URL(url2);
      return u1.hostname.toLowerCase() === u2.hostname.toLowerCase();
    } catch (e) {
      return false;
    }
  }

  getProtocol(urlString) {
    try {
      const url = new URL(urlString);
      return url.protocol.replace(':', '');
    } catch (e) {
      return null;
    }
  }
}
