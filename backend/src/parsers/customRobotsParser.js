export class CustomRobotsParser {
  constructor(robotsTxt, userAgent = '*') {
    this.userAgent = userAgent;
    this.rules = this.parseRobotsTxt(robotsTxt);
  }

  parseRobotsTxt(content) {
    const lines = content.split('\n');
    const rules = {
      '*': { disallow: [], allow: [] },
    };
    
    let currentAgent = null;
    let isWildcardAgent = false;

    for (const line of lines) {
      const trimmed = line.split('#')[0].trim();
      if (!trimmed) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const directive = trimmed.substring(0, colonIndex).trim().toLowerCase();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (directive === 'user-agent') {
        currentAgent = value;
        isWildcardAgent = (value === '*');
      } else if (isWildcardAgent && directive === 'disallow' && currentAgent === '*') {
        if (value) {
          rules['*'].disallow.push(value);
        }
      } else if (isWildcardAgent && directive === 'allow' && currentAgent === '*') {
        if (value) {
          rules['*'].allow.push(value);
        }
      }
    }

    return rules;
  }

  isAllowed(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;

      const wildcardRules = this.rules['*'];
      
      for (const allowRule of wildcardRules.allow) {
        if (this.matchesRule(path, allowRule)) {
          return true;
        }
      }

      for (const disallowRule of wildcardRules.disallow) {
        if (this.matchesRule(path, disallowRule)) {
          return false;
        }
      }

      return true;
    } catch (e) {
      return true;
    }
  }

  matchesRule(path, rule) {
    if (rule === '/') {
      return true;
    }
    
    if (rule.endsWith('*')) {
      const prefix = rule.slice(0, -1);
      return path.startsWith(prefix);
    }
    
    return path.startsWith(rule);
  }

  getDisallowRule(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;

      const wildcardRules = this.rules['*'];
      
      let matchedRule = null;
      for (const disallowRule of wildcardRules.disallow) {
        if (this.matchesRule(path, disallowRule)) {
          if (!matchedRule || disallowRule.length > matchedRule.length) {
            matchedRule = disallowRule;
          }
        }
      }

      return matchedRule;
    } catch (e) {
      return null;
    }
  }
}
