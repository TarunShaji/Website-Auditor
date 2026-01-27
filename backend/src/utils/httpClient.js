import https from 'https';
import http from 'http';
import { URL } from 'url';

export class HTTPClient {
  static async fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 10000,
      };

      const req = protocol.request(url, requestOptions, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            url: url,
            headers: {
              get: (name) => res.headers[name.toLowerCase()],
              forEach: (callback) => {
                Object.entries(res.headers).forEach(([key, value]) => {
                  callback(value, key);
                });
              }
            },
            text: async () => body,
            json: async () => JSON.parse(body)
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          req.destroy();
          reject(new Error('Request aborted'));
        });
      }

      req.end();
    });
  }

  static async fetchWithRedirects(url, options = {}, redirectCount = 0, maxRedirects = 5) {
    if (redirectCount > maxRedirects) {
      throw new Error('Too many redirects');
    }

    const response = await this.fetch(url, { ...options, redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const redirectUrl = new URL(location, url).href;
        return this.fetchWithRedirects(redirectUrl, options, redirectCount + 1, maxRedirects);
      }
    }

    return response;
  }
}
