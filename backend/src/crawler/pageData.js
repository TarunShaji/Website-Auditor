export class PageData {
  constructor(url, normalizedURL) {
    this.url = url;
    this.normalized_url = normalizedURL;
    this.resource_type = null;
    this.http_status = null;
    this.final_url = null;
    this.redirect_chain = [];
    this.fetch_error = null;
    this.headers = {};
    this.html = null;
    this.title = null;
    this.h1s = [];
    this.meta_robots = null;
    this.meta_description = null;
    this.x_robots_tag = null;
    this.blocked_by_robots = false;
    this.blocked_by_robots_rule = null;
    this.internal_outgoing_links = [];
    this.external_outgoing_links = [];
    this.content_internal_links = [];  // NEW: For AI intent analysis only
    this.incoming_internal_link_count = 0;
    this.resources = {
      images: [],
      scripts: [],
      stylesheets: []
    };
  }

  isPage() {
    return this.resource_type === 'PAGE';
  }

  isResource() {
    return this.resource_type === 'RESOURCE';
  }

  toJSON() {
    return {
      url: this.url,
      normalized_url: this.normalized_url,
      resource_type: this.resource_type,
      http_status: this.http_status,
      final_url: this.final_url,
      redirect_chain: this.redirect_chain,
      fetch_error: this.fetch_error,

      // SEO metadata
      title: this.title,
      h1s: this.h1s,
      meta_description: this.meta_description,
      meta_robots: this.meta_robots,
      x_robots_tag: this.x_robots_tag,

      // Links
      internal_outgoing_links: this.internal_outgoing_links,
      external_outgoing_links: this.external_outgoing_links,
      incoming_internal_link_count: this.incoming_internal_link_count,
      content_internal_links: this.content_internal_links,  // For AI intent analysis

      // Robots blocking
      blocked_by_robots: this.blocked_by_robots,
      blocked_by_robots_rule: this.blocked_by_robots_rule,

      // Resource counts (not full arrays - saves space)
      resource_counts: {
        images: this.resources?.images?.length || 0,
        scripts: this.resources?.scripts?.length || 0,
        stylesheets: this.resources?.stylesheets?.length || 0
      }
    };
  }
}
