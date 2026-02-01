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
      resources: this.extractResources($, currentURL),
      content_links: this.extractContentLinks($, currentURL)  // For AI intent analysis
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
    const robotsMeta = $('meta[name="robots"]').attr('content');
    return robotsMeta || null;
  }

  extractMetaDescription($) {
    const descMeta = $('meta[name="description"]').attr('content');
    return descMeta || null;
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

  /**
   * Extract content links for AI intent analysis
   * 
   * STRATEGY: Negative exclusion (not positive selection)
   * - Find ALL links on the page
   * - Exclude only nav/header/footer areas
   * - Let AI judge intent (don't block generic anchors)
   * - Works on ANY site structure (Shopify, WordPress, custom)
   */
  extractContentLinks($, currentURL) {
    console.log(`[HTML_PARSER] ⚡ extractContentLinks CALLED for ${currentURL} (NEW CODE v2)`);

    const contentLinks = [];
    const linkKeys = new Set(); // For deduplication

    // Debug stats
    const debug = {
      totalLinks: 0,
      skippedExcludedArea: 0,
      skippedNoHref: 0,
      skippedNonHttp: 0,
      skippedNormalizeFailed: 0,
      skippedExternal: 0,
      skippedSystemPath: 0,
      skippedEmptyAnchor: 0,
      skippedDuplicate: 0,
      added: 0
    };

    // Exclusion selectors - ONLY structural/navigation areas
    const excludeSelectors = [
      'header',
      'footer',
      'nav',
      'aside',
      '[role="navigation"]',
      '[role="banner"]',
      '[role="contentinfo"]',
      '[role="complementary"]',
      '.header',
      '.footer',
      '.site-header',
      '.site-footer',
      '.announcement-bar',
      '.breadcrumb'
    ].join(', ');

    // System paths to exclude
    const systemPaths = [
      '/account',
      '/cart',
      '/checkout',
      '/login',
      '/register',
      '/auth',
      '/admin',
      '/search',
      '/wishlist'
    ];

    // Find ALL links on the page
    $('a[href]').each((i, elem) => {
      debug.totalLinks++;
      const $link = $(elem);

      // EXCLUSION 1: Skip if inside nav/header/footer
      if ($link.closest(excludeSelectors).length > 0) {
        debug.skippedExcludedArea++;
        return;
      }

      const href = $link.attr('href');
      if (!href) {
        debug.skippedNoHref++;
        return;
      }

      // EXCLUSION 2: Skip non-HTTP links (in-page anchors, JS, protocols)
      if (href === '#' ||
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('sms:')) {
        debug.skippedNonHttp++;
        return;
      }

      // Normalize the URL
      const normalized = this.normalizer.normalize(href, currentURL);
      if (!normalized) {
        debug.skippedNormalizeFailed++;
        return;
      }

      // EXCLUSION 3: Skip external links
      if (!this.normalizer.isInternal(normalized)) {
        debug.skippedExternal++;
        return;
      }

      // EXCLUSION 4: Skip system paths
      try {
        const urlPath = new URL(normalized).pathname.toLowerCase();
        if (systemPaths.some(sp => urlPath.startsWith(sp))) {
          debug.skippedSystemPath++;
          return;
        }
      } catch (e) {
        return;
      }

      // Get anchor text
      const anchorText = $link.text().trim().replace(/\s+/g, ' ');

      // EXCLUSION 5: Skip ONLY if completely empty
      if (!anchorText) {
        debug.skippedEmptyAnchor++;
        return;
      }

      // Deduplication by link_key
      const linkKey = `${normalized}|${anchorText}`;
      if (linkKeys.has(linkKey)) {
        debug.skippedDuplicate++;
        return;
      }
      linkKeys.add(linkKey);

      // Determine context type based on DOM position
      const contextType = this.determineContextType($link);

      debug.added++;
      contentLinks.push({
        source_url: currentURL,
        destination_url: normalized,
        anchor_text: anchorText,
        context_type: contextType
      });
    });

    // Log debug stats
    console.log(`[HTML_PARSER] extractContentLinks for ${currentURL}:`);
    console.log(`  Total links found: ${debug.totalLinks}`);
    console.log(`  Skipped (nav/header/footer): ${debug.skippedExcludedArea}`);
    console.log(`  Skipped (no href): ${debug.skippedNoHref}`);
    console.log(`  Skipped (non-http/anchors): ${debug.skippedNonHttp}`);
    console.log(`  Skipped (normalize failed): ${debug.skippedNormalizeFailed}`);
    console.log(`  Skipped (external): ${debug.skippedExternal}`);
    console.log(`  Skipped (system path): ${debug.skippedSystemPath}`);
    console.log(`  Skipped (empty anchor): ${debug.skippedEmptyAnchor}`);
    console.log(`  Skipped (duplicate): ${debug.skippedDuplicate}`);
    console.log(`  ✓ Content links extracted: ${debug.added}`);

    return contentLinks;
  }

  /**
   * Determine context type based on link's DOM position
   */
  determineContextType($link) {
    // Check parent elements to determine context
    if ($link.closest('article, .article, .post, .blog-post').length > 0) {
      return 'article';
    }
    if ($link.closest('.product, .product-card, .product-item').length > 0) {
      return 'product';
    }
    if ($link.closest('.collection, .category').length > 0) {
      return 'collection';
    }
    if ($link.closest('main, [role="main"], #main').length > 0) {
      return 'main';
    }

    // Default
    return 'content';
  }
}
