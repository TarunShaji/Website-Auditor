export class PageData {
  constructor(url, normalizedURL) {
    this.url = url;
    this.normalized_url = normalizedURL;
    this.resource_type = null;
    this.http_status = null;
    this.final_url = null;
    this.redirect_chain = [];
    this.headers = {};
    this.title = null;
    this.h1s = [];
    this.meta_robots = null;
    this.meta_description = null;
    this.x_robots_tag = null;
    this.blocked_by_robots = false;
    this.blocked_by_robots_rule = null;
    this.internal_outgoing_links = [];
    this.external_outgoing_links = [];
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
      headers: this.headers,
      title: this.title,
      h1s: this.h1s,
      meta_robots: this.meta_robots,
      meta_description: this.meta_description,
      x_robots_tag: this.x_robots_tag,
      blocked_by_robots: this.blocked_by_robots,
      blocked_by_robots_rule: this.blocked_by_robots_rule,
      internal_outgoing_links: this.internal_outgoing_links,
      external_outgoing_links: this.external_outgoing_links,
      incoming_internal_link_count: this.incoming_internal_link_count,
      resources: this.resources
    };
  }
}
