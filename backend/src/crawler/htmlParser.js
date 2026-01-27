import * as cheerio from 'cheerio';

export class HTMLParser {
  constructor(normalizer) {
    this.normalizer = normalizer;
  }

  parse(html, currentURL) {
    const $ = cheerio.load(html);
    
    const data = {
      title: this.extractTitle($),
      h1s: this.extractH1s($),
      meta_robots: this.extractMetaRobots($),
      meta_description: this.extractMetaDescription($),
      links: this.extractLinks($, currentURL),
      resources: this.extractResources($, currentURL)
    };

    return data;
  }

  extractTitle($) {
    const title = $('title').first().text().trim();
    return title || null;
  }

  extractH1s($) {
    const h1s = [];
    $('h1').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text) {
        h1s.push(text);
      }
    });
    return h1s;
  }

  extractMetaRobots($) {
    const metaRobots = $('meta[name="robots"]').attr('content');
    return metaRobots ? metaRobots.toLowerCase() : null;
  }

  extractMetaDescription($) {
    const metaDesc = $('meta[name="description"]').attr('content');
    if (!metaDesc) {
      return null;
    }
    
    return metaDesc.trim().replace(/\s+/g, ' ');
  }

  extractLinks($, currentURL) {
    const links = [];
    
    $('a[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        const normalized = this.normalizer.normalize(href, currentURL);
        if (normalized) {
          links.push({
            original: href,
            normalized: normalized,
            isInternal: this.normalizer.isInternal(normalized)
          });
        }
      }
    });

    return links;
  }

  extractResources($, currentURL) {
    const resources = {
      images: [],
      scripts: [],
      stylesheets: []
    };

    $('img[src]').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        const normalized = this.normalizer.normalize(src, currentURL);
        if (normalized) {
          resources.images.push(normalized);
        }
      }
    });

    $('script[src]').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        const normalized = this.normalizer.normalize(src, currentURL);
        if (normalized) {
          resources.scripts.push(normalized);
        }
      }
    });

    $('link[rel="stylesheet"][href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        const normalized = this.normalizer.normalize(href, currentURL);
        if (normalized) {
          resources.stylesheets.push(normalized);
        }
      }
    });

    return resources;
  }
}
